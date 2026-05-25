"""
CivicAI - Text Cleaner
=======================
Stage 3 of the ingestion pipeline.

Reads .txt files produced by pdf_parser.py from backend/data/parsed/,
applies a multi-pass cleaning pipeline, and writes final output to
backend/data/cleaned/.

Pipeline stages (applied in order)
------------------------------------
  1. strip_page_markers      – remove [PAGE N] separators left by the parser
  2. remove_page_numbers     – standalone numbers / "Page N of M" lines
  3. remove_headers_footers  – short repeated lines at top/bottom of pages
  4. remove_boilerplate      – known GoI boilerplate phrases (configurable)
  5. normalize_whitespace    – collapse spaces, tabs, blank-line runs
  6. normalize_unicode       – ligatures, smart quotes, non-breaking spaces
  7. deduplicate_paragraphs  – remove paragraphs that appear 2+ times

Public API
----------
  clean(text, source="")          → CleanResult for one string
  clean_file(path, out_dir)       → CleanResult, writes output file
  clean_all(parsed_dir, out_dir)  → list[CleanResult], batch mode

Usage
-----
    python3 text_cleaner.py                        # clean all parsed .txt files
    python3 text_cleaner.py --file pmjay.txt       # single file
    python3 text_cleaner.py --no-save              # print stats only
    python3 text_cleaner.py --dry-run              # list files without cleaning
    python3 text_cleaner.py --show-diff pmjay.txt  # print before/after side-by-side
"""

import re
import sys
import json
import logging
import argparse
import unicodedata
from pathlib import Path
from datetime import datetime, timezone
from dataclasses import dataclass, field, asdict
from collections import Counter
from typing import Optional

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

BASE_DIR    = Path(__file__).parent          # backend/data/
PARSED_DIR  = BASE_DIR / "parsed"
CLEANED_DIR = BASE_DIR / "cleaned"
LOG_DIR     = BASE_DIR / "raw" / "logs"

for _d in (CLEANED_DIR, LOG_DIR):
    _d.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

_ts      = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
LOG_FILE = LOG_DIR / f"clean_{_ts}.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
    ],
)
log = logging.getLogger("civicai.text_cleaner")

# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

@dataclass
class CleanResult:
    """Outcome of cleaning one text block."""
    source:          str                    # filename or label
    status:          str = "ok"            # "ok" | "empty" | "failed"
    original_chars:  int = 0
    cleaned_chars:   int = 0
    original_words:  int = 0
    cleaned_words:   int = 0
    removed_chars:   int = 0
    stages_applied:  list[str] = field(default_factory=list)
    cleaned_text:    str = ""
    error:           Optional[str] = None
    cleaned_at:      str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    @property
    def reduction_pct(self) -> float:
        if self.original_chars == 0:
            return 0.0
        return round((self.removed_chars / self.original_chars) * 100, 1)


# ---------------------------------------------------------------------------
# Known Indian government boilerplate phrases
# ---------------------------------------------------------------------------
# Each entry is a regex pattern (case-insensitive, full-line match).
# Add more as you encounter them in real documents.

_BOILERPLATE_PATTERNS: list[str] = [
    # Site / portal footers
    r"site\s+is\s+(best\s+viewed|designed|hosted)",
    r"content\s+on\s+this\s+(website|portal|page)\s+is\s+published",
    r"last\s+updated\s+(on\s+)?\d",
    r"this\s+(website|portal)\s+is\s+owned\s+by",
    r"for\s+any\s+(query|queries|grievance)",
    r"national\s+informatics\s+centre",
    r"designed\s+(and\s+)?developed\s+by",
    r"copyright\s+[©\(c\)]\s*\d{4}",
    r"all\s+rights\s+reserved",
    r"disclaimer\s*[:\-]",
    r"privacy\s+policy",
    r"terms\s+(of\s+)?(use|service|conditions)",
    r"website\s+policies",
    r"accessibility\s+statement",
    r"screen\s+reader\s+access",
    r"skip\s+to\s+(main\s+)?content",
    r"javascript\s+is\s+(required|disabled)",
    # Navigation / UI artefacts
    r"^(home|about\s+us|contact\s+us|sitemap|feedback|faq|help)$",
    r"^(login|register|sign\s+in|sign\s+up|logout)$",
    r"^(search|submit|reset|back|next|previous|print|download)$",
    r"^(english|hindi|हिन्दी|हिंदी)$",
    r"^(a\s*\+\s*a\s*\-|font\s+size|text\s+size)$",
    r"^(follow\s+us|share|tweet|like|subscribe)$",
    # GoI standard headers / footers
    r"government\s+of\s+india",
    r"भारत\s+सरकार",
    r"ministry\s+of\s+[\w\s]+,?\s+government\s+of\s+india",
    r"press\s+information\s+bureau",
    r"pib\s+delhi",
    r"^pib\b",
    r"for\s+more\s+information\s+please\s+(visit|contact|call)",
    r"toll[\s\-]?free\s+(number|helpline|no\.?)\s*[:\-]?\s*1[0-9\-\s]{7,}",
    r"helpline\s*(number|no\.?)?\s*[:\-]?\s*1[0-9\-\s]{7,}",
    # Document metadata lines
    r"^(ref\.?|reference|file\s+no\.?|f\.?\s*no\.?)\s*[:\-]",
    r"^(dated?|date)\s*[:\-]\s*\d",
    r"^(to|from|subject|sub)\s*[:\-]",
    r"^\*{3,}$",
    r"^-{3,}$",
    r"^={3,}$",
    r"^\_{3,}$",
    # Common PDF artefacts
    r"^\[page\s+\d+\]$",           # parser page markers (belt-and-suspenders)
    r"^page\s+\d+\s+of\s+\d+$",
    r"^\d+\s*/\s*\d+$",            # "3 / 12" style page numbers
]

# Pre-compile all boilerplate patterns once
_BOILERPLATE_RE: list[re.Pattern] = [
    re.compile(p, re.IGNORECASE) for p in _BOILERPLATE_PATTERNS
]

# ---------------------------------------------------------------------------
# Stage 1 – Strip [PAGE N] markers left by pdf_parser
# ---------------------------------------------------------------------------

_PAGE_MARKER_RE = re.compile(r"^\[PAGE\s+\d+\]\s*$", re.MULTILINE | re.IGNORECASE)


def strip_page_markers(text: str) -> str:
    """Remove [PAGE N] separator lines inserted by pdf_parser."""
    return _PAGE_MARKER_RE.sub("", text)


# ---------------------------------------------------------------------------
# Stage 2 – Remove standalone page numbers
# ---------------------------------------------------------------------------

# Matches lines that are ONLY a page number expression
_PAGE_NUMBER_RE = re.compile(
    r"^(?:"
    r"page\s+\d+\s+of\s+\d+"       # "Page 3 of 12"
    r"|page\s+\d+"                  # "Page 3"
    r"|\d+\s*/\s*\d+"               # "3 / 12"
    r"|\d+\s+of\s+\d+"             # "3 of 12"
    r"|\[\s*\d+\s*\]"              # "[3]"
    r"|\(\s*\d+\s*\)"              # "(3)"
    r"|\d+"                         # bare number on its own line
    r")$",
    re.IGNORECASE,
)


def remove_page_numbers(text: str) -> str:
    """
    Remove lines that consist solely of a page number expression.
    A bare number is only removed when it is on a line by itself AND
    is surrounded by blank lines (to avoid removing numbered list items).
    """
    lines = text.splitlines()
    result: list[str] = []

    for i, line in enumerate(lines):
        stripped = line.strip()

        # Bare integer: only remove if surrounded by blank lines
        if re.fullmatch(r"\d+", stripped):
            prev_blank = (i == 0) or (lines[i - 1].strip() == "")
            next_blank = (i == len(lines) - 1) or (lines[i + 1].strip() == "")
            if prev_blank and next_blank:
                continue  # drop it

        # All other page-number patterns: remove unconditionally
        elif _PAGE_NUMBER_RE.fullmatch(stripped) and stripped != "":
            continue

        result.append(line)

    return "\n".join(result)


# ---------------------------------------------------------------------------
# Stage 3 – Remove repeated headers / footers
# ---------------------------------------------------------------------------

def remove_headers_footers(text: str, min_repeat: int = 3) -> str:
    """
    Detect and remove lines that appear identically at least `min_repeat`
    times across the document — a strong signal they are headers or footers.

    Short lines (≤ 6 chars) and blank lines are excluded from detection
    to avoid accidentally removing meaningful short content.
    """
    lines = text.splitlines()

    # Count occurrences of each non-trivial line
    counts: Counter = Counter(
        line.strip()
        for line in lines
        if len(line.strip()) > 6
    )

    # Build set of lines to remove
    repeated = {line for line, count in counts.items() if count >= min_repeat}

    if repeated:
        log.debug("    Removing %d repeated header/footer line(s)", len(repeated))

    return "\n".join(
        line for line in lines
        if line.strip() not in repeated
    )


# ---------------------------------------------------------------------------
# Stage 4 – Remove known boilerplate
# ---------------------------------------------------------------------------

def remove_boilerplate(text: str) -> str:
    """
    Remove lines that match any known Indian government boilerplate pattern.
    Operates line-by-line; partial matches within a line are not removed
    (to avoid destroying content that merely contains a boilerplate phrase).
    """
    lines = text.splitlines()
    result: list[str] = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            result.append(line)
            continue

        is_boilerplate = any(pat.search(stripped) for pat in _BOILERPLATE_RE)
        if not is_boilerplate:
            result.append(line)

    return "\n".join(result)


# ---------------------------------------------------------------------------
# Stage 5 – Normalize whitespace
# ---------------------------------------------------------------------------

def normalize_whitespace(text: str) -> str:
    """
    1. Strip trailing whitespace from every line.
    2. Collapse runs of spaces/tabs within a line to a single space.
    3. Collapse 3+ consecutive blank lines to exactly two blank lines.
    4. Strip leading/trailing whitespace from the whole document.
    """
    # Per-line cleanup
    lines = [re.sub(r"[ \t]+", " ", line).rstrip() for line in text.splitlines()]

    # Collapse blank-line runs
    result: list[str] = []
    blank_run = 0
    for line in lines:
        if line == "":
            blank_run += 1
            if blank_run <= 2:
                result.append("")
        else:
            blank_run = 0
            result.append(line)

    return "\n".join(result).strip()


# ---------------------------------------------------------------------------
# Stage 6 – Normalize Unicode
# ---------------------------------------------------------------------------

_UNICODE_MAP = str.maketrans({
    # Ligatures
    "\ufb00": "ff",  "\ufb01": "fi",  "\ufb02": "fl",
    "\ufb03": "ffi", "\ufb04": "ffl", "\ufb05": "st", "\ufb06": "st",
    # Quotation marks
    "\u2018": "'",  "\u2019": "'",
    "\u201c": '"',  "\u201d": '"',
    "\u201a": ",",  "\u201e": '"',
    # Dashes
    "\u2013": "-",  "\u2014": "-",  "\u2015": "-",
    # Spaces
    "\u00a0": " ",  "\u202f": " ",  "\u2009": " ",
    "\u200b": "",   "\u200c": "",   "\u200d": "",
    # Ellipsis
    "\u2026": "...",
    # Bullet / middle dot
    "\u2022": "-",  "\u00b7": "-",  "\u2023": "-",
})


def normalize_unicode(text: str) -> str:
    """
    Replace typographic characters with plain ASCII equivalents,
    then NFC-normalise the remaining Unicode.
    """
    text = text.translate(_UNICODE_MAP)
    text = unicodedata.normalize("NFC", text)
    # Remove remaining control characters (keep \n and \t)
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
    return text


# ---------------------------------------------------------------------------
# Stage 7 – Deduplicate paragraphs
# ---------------------------------------------------------------------------

def deduplicate_paragraphs(text: str) -> str:
    """
    Split text into paragraphs (blank-line separated), remove exact
    duplicates while preserving the first occurrence and document order.

    Paragraphs shorter than 40 characters are not deduplicated to avoid
    removing legitimate short headings that happen to repeat.
    """
    paragraphs = re.split(r"\n{2,}", text)
    seen: set[str] = set()
    result: list[str] = []

    for para in paragraphs:
        key = re.sub(r"\s+", " ", para.strip()).lower()
        if len(key) < 40:
            result.append(para)          # always keep short paragraphs
            continue
        if key not in seen:
            seen.add(key)
            result.append(para)
        else:
            log.debug("    Dedup: removed duplicate paragraph (%d chars)", len(para))

    return "\n\n".join(result)


# ---------------------------------------------------------------------------
# Master clean() function
# ---------------------------------------------------------------------------

# Ordered pipeline: (stage_name, function)
_PIPELINE: list[tuple[str, callable]] = [
    ("strip_page_markers",      strip_page_markers),
    ("remove_page_numbers",     remove_page_numbers),
    ("remove_headers_footers",  remove_headers_footers),
    ("remove_boilerplate",      remove_boilerplate),
    ("normalize_unicode",       normalize_unicode),
    ("normalize_whitespace",    normalize_whitespace),
    ("deduplicate_paragraphs",  deduplicate_paragraphs),
    # Final whitespace pass after dedup may have introduced extra blanks
    ("normalize_whitespace",    normalize_whitespace),
]


def clean(text: str, source: str = "") -> CleanResult:
    """
    Run the full cleaning pipeline on a text string.

    Parameters
    ----------
    text   : raw text (e.g. full_text from ParseResult)
    source : label for logging / result tracking (e.g. filename)

    Returns
    -------
    CleanResult with cleaned_text and per-stage metadata.
    """
    result = CleanResult(source=source)

    if not text or not text.strip():
        result.status = "empty"
        log.warning("  ⚠  Empty input for '%s'", source)
        return result

    result.original_chars = len(text)
    result.original_words = len(text.split())

    current = text
    stages_applied: list[str] = []

    try:
        for stage_name, fn in _PIPELINE:
            before_len = len(current)
            current = fn(current)
            after_len = len(current)
            stages_applied.append(stage_name)
            delta = before_len - after_len
            if delta > 0:
                log.debug("    [%s] removed %d chars", stage_name, delta)

    except Exception as exc:
        log.error("  ❌  Pipeline error in '%s' at stage '%s': %s",
                  source, stage_name, exc)
        result.status = "failed"
        result.error  = f"{type(exc).__name__}: {exc}"
        return result

    result.cleaned_text   = current
    result.cleaned_chars  = len(current)
    result.cleaned_words  = len(current.split()) if current else 0
    result.removed_chars  = result.original_chars - result.cleaned_chars
    result.stages_applied = list(dict.fromkeys(stages_applied))  # dedupe names
    result.status         = "ok" if current.strip() else "empty"

    log.info(
        "  ✅  %-40s  %6d → %6d chars  (-%s%%)",
        source or "text",
        result.original_chars,
        result.cleaned_chars,
        result.reduction_pct,
    )
    return result


# ---------------------------------------------------------------------------
# File-level helpers
# ---------------------------------------------------------------------------

def clean_file(path: Path, out_dir: Path) -> CleanResult:
    """
    Read a .txt file, clean it, write the result to out_dir.

    Output files
    ------------
    <out_dir>/<stem>.txt   – cleaned plain text
    <out_dir>/<stem>.json  – CleanResult metadata (no cleaned_text to save space)
    """
    try:
        raw = path.read_text(encoding="utf-8")
    except Exception as exc:
        log.error("  ❌  Cannot read %s: %s", path.name, exc)
        return CleanResult(source=path.name, status="failed",
                           error=f"Read error: {exc}")

    result = clean(raw, source=path.name)

    if not out_dir:
        return result

    out_dir.mkdir(parents=True, exist_ok=True)
    stem = path.stem

    # Write cleaned text
    if result.status == "ok":
        (out_dir / f"{stem}.txt").write_text(result.cleaned_text, encoding="utf-8")

    # Write metadata JSON (exclude the full text to keep it small)
    meta = asdict(result)
    meta.pop("cleaned_text", None)
    (out_dir / f"{stem}.json").write_text(
        json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    return result


def clean_all(parsed_dir: Path, out_dir: Path) -> list[CleanResult]:
    """
    Clean every *.txt file in parsed_dir and write results to out_dir.
    Returns a list of CleanResult objects.
    """
    txt_files = sorted(parsed_dir.glob("*.txt"))

    if not txt_files:
        log.warning("No .txt files found in %s", parsed_dir)
        return []

    log.info("Found %d .txt file(s) in %s", len(txt_files), parsed_dir)

    results: list[CleanResult] = []
    for txt_path in txt_files:
        log.info("  📄  Cleaning: %s", txt_path.name)
        result = clean_file(txt_path, out_dir)
        results.append(result)

    # Write master index
    index = []
    for r in results:
        entry = asdict(r)
        entry.pop("cleaned_text", None)
        index.append(entry)

    index_path = out_dir / "index.json"
    index_path.write_text(
        json.dumps(index, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    log.info("📋  Index → %s", index_path)

    return results


# ---------------------------------------------------------------------------
# Summary printer
# ---------------------------------------------------------------------------

def print_summary(results: list[CleanResult]) -> None:
    ok     = [r for r in results if r.status == "ok"]
    empty  = [r for r in results if r.status == "empty"]
    failed = [r for r in results if r.status == "failed"]

    total_in   = sum(r.original_chars for r in ok)
    total_out  = sum(r.cleaned_chars  for r in ok)
    total_removed = total_in - total_out
    avg_reduction = (
        round((total_removed / total_in) * 100, 1) if total_in else 0.0
    )

    print("\n" + "=" * 62)
    print("TEXT CLEAN SUMMARY")
    print("=" * 62)
    print(f"  ✅  OK        : {len(ok)}")
    print(f"  ⚠   Empty     : {len(empty)}")
    print(f"  ❌  Failed    : {len(failed)}")
    print(f"  ─────────────────────────────────────────────────")
    print(f"  📄  Total     : {len(results)}")
    print(f"  🔤  Input     : {total_in:>10,} chars")
    print(f"  🧹  Output    : {total_out:>10,} chars")
    print(f"  ✂   Removed   : {total_removed:>10,} chars  ({avg_reduction}%)")

    if ok:
        print(f"\n  {'FILE':<42} {'IN':>7} {'OUT':>7} {'-%':>5}")
        print(f"  {'-'*42} {'-'*7} {'-'*7} {'-'*5}")
        for r in ok:
            print(f"  {r.source:<42} {r.original_chars:>7,} "
                  f"{r.cleaned_chars:>7,} {r.reduction_pct:>4.1f}%")

    if failed:
        print("\n  Failed files:")
        for r in failed:
            print(f"    ❌  {r.source}: {r.error}")

    print("=" * 62)


# ---------------------------------------------------------------------------
# Diff helper (--show-diff)
# ---------------------------------------------------------------------------

def show_diff(original: str, cleaned: str, context: int = 3) -> None:
    """
    Print a simple before/after diff: lines present in original but not
    in cleaned, with surrounding context lines.
    """
    orig_lines  = original.splitlines()
    clean_lines = set(cleaned.splitlines())

    removed_indices = [
        i for i, line in enumerate(orig_lines)
        if line.strip() and line not in clean_lines
    ]

    if not removed_indices:
        print("  (no lines removed)")
        return

    print(f"\n  Lines removed ({len(removed_indices)} total):")
    print("  " + "-" * 58)

    shown: set[int] = set()
    for idx in removed_indices:
        start = max(0, idx - context)
        end   = min(len(orig_lines), idx + context + 1)
        for i in range(start, end):
            if i in shown:
                continue
            shown.add(i)
            prefix = "  - " if i == idx else "    "
            print(f"{prefix}{orig_lines[i]}")
        print()


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="CivicAI – Text cleaner for parsed government documents",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--parsed-dir",
        type=Path,
        default=PARSED_DIR,
        help=f"Directory with .txt files from pdf_parser (default: {PARSED_DIR})",
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=CLEANED_DIR,
        help=f"Output directory for cleaned files (default: {CLEANED_DIR})",
    )
    parser.add_argument(
        "--file",
        type=str,
        default=None,
        help="Clean a single .txt file by name (looked up inside --parsed-dir)",
    )
    parser.add_argument(
        "--no-save",
        action="store_true",
        help="Print summary only; do not write output files",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="List .txt files that would be cleaned without processing them",
    )
    parser.add_argument(
        "--show-diff",
        action="store_true",
        help="Print removed lines for each file (use with --file for best results)",
    )
    parser.add_argument(
        "--min-repeat",
        type=int,
        default=3,
        help="Min occurrences for a line to be treated as a header/footer (default: 3)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    parsed_dir: Path = args.parsed_dir

    # ── Dry-run ─────────────────────────────────────────────────────────────
    if args.dry_run:
        files = sorted(parsed_dir.glob("*.txt"))
        if not files:
            print(f"No .txt files found in {parsed_dir}")
            return
        print(f"\n.txt files in {parsed_dir}:")
        print(f"{'#':<4} {'FILENAME':<55} {'SIZE':>10}")
        print("-" * 72)
        for i, p in enumerate(files, 1):
            size_kb = p.stat().st_size / 1024
            print(f"{i:<4} {p.name:<55} {size_kb:>8.1f} KB")
        print(f"\nTotal: {len(files)} file(s)")
        return

    # ── Single file ─────────────────────────────────────────────────────────
    if args.file:
        target = parsed_dir / args.file
        if not target.exists():
            log.error("File not found: %s", target)
            sys.exit(1)

        raw = target.read_text(encoding="utf-8")
        result = clean(raw, source=target.name)

        if args.show_diff:
            show_diff(raw, result.cleaned_text)

        if not args.no_save:
            out_dir = args.out_dir
            out_dir.mkdir(parents=True, exist_ok=True)
            stem = target.stem
            if result.status == "ok":
                (out_dir / f"{stem}.txt").write_text(
                    result.cleaned_text, encoding="utf-8"
                )
            meta = asdict(result)
            meta.pop("cleaned_text", None)
            (out_dir / f"{stem}.json").write_text(
                json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8"
            )

        print_summary([result])
        return

    # ── Batch ────────────────────────────────────────────────────────────────
    out_dir = None if args.no_save else args.out_dir
    results = clean_all(parsed_dir, out_dir or CLEANED_DIR)

    if not results:
        log.warning("Nothing to clean.")
        return

    if args.show_diff:
        for r in results:
            src = parsed_dir / r.source
            if src.exists():
                raw = src.read_text(encoding="utf-8")
                print(f"\n── {r.source} ──")
                show_diff(raw, r.cleaned_text)

    print_summary(results)


if __name__ == "__main__":
    main()
