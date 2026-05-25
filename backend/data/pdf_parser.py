"""
CivicAI - PDF Parser
=====================
Reads PDF files from backend/data/raw/pdfs/, extracts clean text using
pdfplumber, and writes structured JSON output to backend/data/parsed/.

Design
------
  parse_pdf(path)          → ParseResult for one file
  parse_all(pdf_dir)       → list[ParseResult] for every PDF in a folder
  clean_text(raw)          → normalise whitespace / ligatures
  save_parsed(results)     → write per-file JSON + master index

Corruption handling
-------------------
  • pdfplumber open errors  → status="corrupted", error captured
  • Empty / image-only PDFs → status="empty",     warning logged
  • Per-page errors         → page skipped, warning logged, rest continues
  • Any unexpected error    → status="failed",    full traceback captured

Usage
-----
    python3 pdf_parser.py                        # parse all PDFs
    python3 pdf_parser.py --file foo.pdf         # single file by name
    python3 pdf_parser.py --out-dir /tmp/parsed  # custom output dir
    python3 pdf_parser.py --no-save              # print summary only
    python3 pdf_parser.py --dry-run              # list PDFs without parsing
"""

import re
import sys
import json
import logging
import argparse
import traceback
from pathlib import Path
from datetime import datetime, timezone
from dataclasses import dataclass, field, asdict
from typing import Optional

import pdfplumber

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

BASE_DIR   = Path(__file__).parent                  # backend/data/
RAW_DIR    = BASE_DIR / "raw"
PDF_DIR    = RAW_DIR / "pdfs"
PARSED_DIR = BASE_DIR / "parsed"
LOG_DIR    = RAW_DIR / "logs"

for _d in (PARSED_DIR, LOG_DIR):
    _d.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

_ts      = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
LOG_FILE = LOG_DIR / f"parse_{_ts}.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
    ],
)
log = logging.getLogger("civicai.pdf_parser")

# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

@dataclass
class PageResult:
    """Text extracted from a single PDF page."""
    page_number: int          # 1-based
    raw_text:    str          # text as returned by pdfplumber
    clean_text:  str          # after normalisation
    char_count:  int = 0
    word_count:  int = 0
    has_tables:  bool = False
    table_count: int = 0
    error:       Optional[str] = None


@dataclass
class ParseResult:
    """Full extraction result for one PDF file."""
    filename:      str
    filepath:      str
    status:        str = "pending"            # "ok" | "empty" | "corrupted" | "failed"
    total_pages:   int = 0
    parsed_pages:  int = 0
    failed_pages:  int = 0
    total_chars:   int = 0
    total_words:   int = 0
    full_text:     str = ""              # concatenated clean text of all pages
    pages:         list[PageResult] = field(default_factory=list)
    metadata:      dict = field(default_factory=dict)
    error:         Optional[str] = None
    parsed_at:     str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


# ---------------------------------------------------------------------------
# Text cleaning
# ---------------------------------------------------------------------------

# Common PDF ligature replacements
_LIGATURES = {
    "\ufb00": "ff",
    "\ufb01": "fi",
    "\ufb02": "fl",
    "\ufb03": "ffi",
    "\ufb04": "ffl",
    "\ufb05": "st",
    "\ufb06": "st",
    "\u2019": "'",
    "\u2018": "'",
    "\u201c": '"',
    "\u201d": '"',
    "\u2013": "-",
    "\u2014": "-",
    "\u00a0": " ",   # non-breaking space
    "\u200b": "",    # zero-width space
}

_LIGATURE_TABLE = str.maketrans(_LIGATURES)


def clean_text(raw: str) -> str:
    """
    Normalise raw text extracted from a PDF page.

    Steps
    -----
    1. Replace common ligatures and smart quotes.
    2. Strip null bytes and other control characters (keep \\n, \\t).
    3. Collapse runs of spaces/tabs on the same line to a single space.
    4. Collapse 3+ consecutive blank lines to two blank lines.
    5. Strip leading/trailing whitespace from each line.
    6. Strip leading/trailing whitespace from the whole block.
    """
    if not raw:
        return ""

    # 1. Ligatures / smart punctuation
    text = raw.translate(_LIGATURE_TABLE)

    # 2. Remove control characters except newline and tab
    text = re.sub(r"[^\S\n\t ]+", " ", text)          # keep only normal whitespace
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)

    # 3. Collapse horizontal whitespace within a line
    text = re.sub(r"[ \t]{2,}", " ", text)

    # 4. Strip each line
    lines = [line.strip() for line in text.splitlines()]

    # 5. Collapse 3+ consecutive blank lines → 2 blank lines
    cleaned_lines: list[str] = []
    blank_run = 0
    for line in lines:
        if line == "":
            blank_run += 1
            if blank_run <= 2:
                cleaned_lines.append("")
        else:
            blank_run = 0
            cleaned_lines.append(line)

    return "\n".join(cleaned_lines).strip()


# ---------------------------------------------------------------------------
# Per-page extraction
# ---------------------------------------------------------------------------

def _extract_page(page, page_number: int) -> PageResult:
    """
    Extract text and table metadata from a single pdfplumber Page object.
    Returns a PageResult; never raises — errors are captured in the result.
    """
    try:
        raw = page.extract_text(x_tolerance=2, y_tolerance=2) or ""
        cleaned = clean_text(raw)

        # Table detection (lightweight — just count, don't extract data)
        try:
            tables = page.find_tables()
            table_count = len(tables)
            has_tables = table_count > 0
        except Exception:
            table_count = 0
            has_tables = False

        return PageResult(
            page_number=page_number,
            raw_text=raw,
            clean_text=cleaned,
            char_count=len(cleaned),
            word_count=len(cleaned.split()) if cleaned else 0,
            has_tables=has_tables,
            table_count=table_count,
        )

    except Exception as exc:
        log.warning("    ⚠  Page %d extraction error: %s", page_number, exc)
        return PageResult(
            page_number=page_number,
            raw_text="",
            clean_text="",
            error=str(exc),
        )


# ---------------------------------------------------------------------------
# Core parser
# ---------------------------------------------------------------------------

def parse_pdf(path: Path) -> ParseResult:
    """
    Parse a single PDF file and return a ParseResult.

    Handles
    -------
    - Password-protected / corrupted files  → status="corrupted"
    - PDFs with no extractable text         → status="empty"
    - Per-page failures                     → page skipped, rest continues
    - Any other unexpected error            → status="failed"
    """
    result = ParseResult(
        filename=path.name,
        filepath=str(path),
    )

    log.info("  📄  Parsing: %s", path.name)

    # ── Open ────────────────────────────────────────────────────────────────
    try:
        pdf = pdfplumber.open(path)
    except pdfplumber.pdfminer.pdfparser.PDFSyntaxError as exc:
        log.error("    ❌  Corrupted PDF (%s): %s", path.name, exc)
        result.status = "corrupted"
        result.error  = f"PDFSyntaxError: {exc}"
        return result
    except Exception as exc:
        log.error("    ❌  Cannot open (%s): %s", path.name, exc)
        result.status = "corrupted"
        result.error  = f"{type(exc).__name__}: {exc}"
        return result

    # ── Extract ─────────────────────────────────────────────────────────────
    try:
        with pdf:
            # Metadata (may be empty dict on some PDFs)
            try:
                meta = pdf.metadata or {}
                result.metadata = {
                    k: (v if isinstance(v, (str, int, float, bool)) else str(v))
                    for k, v in meta.items()
                }
            except Exception:
                result.metadata = {}

            result.total_pages = len(pdf.pages)

            page_results: list[PageResult] = []
            for i, page in enumerate(pdf.pages, start=1):
                pr = _extract_page(page, i)
                page_results.append(pr)
                if pr.error:
                    result.failed_pages += 1
                else:
                    result.parsed_pages += 1
                    result.total_chars  += pr.char_count
                    result.total_words  += pr.word_count

            result.pages = page_results

            # Concatenate all clean page texts with a page separator
            page_texts = [
                f"[PAGE {pr.page_number}]\n{pr.clean_text}"
                for pr in page_results
                if pr.clean_text
            ]
            result.full_text = "\n\n".join(page_texts)

    except Exception as exc:
        log.error("    ❌  Extraction failed (%s): %s", path.name, exc)
        result.status = "failed"
        result.error  = traceback.format_exc()
        return result

    # ── Classify ────────────────────────────────────────────────────────────
    if result.total_chars == 0:
        log.warning("    ⚠  No text extracted from %s (image-only or empty PDF)", path.name)
        result.status = "empty"
    else:
        result.status = "ok"
        log.info(
            "    ✅  %d pages | %d words | %d chars",
            result.parsed_pages,
            result.total_words,
            result.total_chars,
        )

    return result


# ---------------------------------------------------------------------------
# Batch parser
# ---------------------------------------------------------------------------

def parse_all(pdf_dir: Path) -> list[ParseResult]:
    """
    Parse every *.pdf file found in pdf_dir (non-recursive).
    Returns a list of ParseResult objects sorted by filename.
    """
    pdf_files = sorted(pdf_dir.glob("*.pdf"))

    if not pdf_files:
        log.warning("No PDF files found in %s", pdf_dir)
        return []

    log.info("Found %d PDF file(s) in %s", len(pdf_files), pdf_dir)

    results: list[ParseResult] = []
    for pdf_path in pdf_files:
        result = parse_pdf(pdf_path)
        results.append(result)

    return results


# ---------------------------------------------------------------------------
# Output helpers
# ---------------------------------------------------------------------------

def _result_to_dict(r: ParseResult) -> dict:
    """
    Convert a ParseResult to a JSON-serialisable dict.
    Excludes raw_text from pages to keep output files lean.
    """
    d = asdict(r)
    # Drop raw_text from each page (keep clean_text only)
    for page in d.get("pages", []):
        page.pop("raw_text", None)
    return d


def save_parsed(results: list[ParseResult], out_dir: Path) -> None:
    """
    Write output for each ParseResult:
      - <out_dir>/<stem>.json   → structured result (metadata + per-page clean text)
      - <out_dir>/<stem>.txt    → plain full_text (for downstream ingestion)
      - <out_dir>/index.json    → summary of all parsed files
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    index: list[dict] = []

    for r in results:
        stem = Path(r.filename).stem

        # Per-file JSON
        json_path = out_dir / f"{stem}.json"
        json_path.write_text(
            json.dumps(_result_to_dict(r), indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

        # Plain-text file (only for successfully parsed PDFs)
        if r.status == "ok" and r.full_text:
            txt_path = out_dir / f"{stem}.txt"
            txt_path.write_text(r.full_text, encoding="utf-8")

        # Index entry
        index.append({
            "filename":     r.filename,
            "status":       r.status,
            "total_pages":  r.total_pages,
            "parsed_pages": r.parsed_pages,
            "failed_pages": r.failed_pages,
            "total_words":  r.total_words,
            "total_chars":  r.total_chars,
            "error":        r.error,
            "parsed_at":    r.parsed_at,
            "json_file":    str(json_path),
        })

    # Master index
    index_path = out_dir / "index.json"
    index_path.write_text(
        json.dumps(index, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    log.info("📁  Parsed output → %s", out_dir)
    log.info("📋  Index         → %s", index_path)


# ---------------------------------------------------------------------------
# Summary printer
# ---------------------------------------------------------------------------

def print_summary(results: list[ParseResult]) -> None:
    ok        = [r for r in results if r.status == "ok"]
    empty     = [r for r in results if r.status == "empty"]
    corrupted = [r for r in results if r.status == "corrupted"]
    failed    = [r for r in results if r.status == "failed"]

    total_words = sum(r.total_words for r in ok)
    total_chars = sum(r.total_chars for r in ok)

    print("\n" + "=" * 60)
    print("PDF PARSE SUMMARY")
    print("=" * 60)
    print(f"  ✅  OK        : {len(ok)}")
    print(f"  ⚠   Empty     : {len(empty)}  (image-only or no text layer)")
    print(f"  💥  Corrupted : {len(corrupted)}")
    print(f"  ❌  Failed    : {len(failed)}")
    print(f"  ─────────────────────────────")
    print(f"  📄  Total     : {len(results)}")
    print(f"  📝  Words     : {total_words:,}")
    print(f"  🔤  Chars     : {total_chars:,}")

    if corrupted or failed:
        print("\nProblematic files:")
        for r in corrupted + failed:
            print(f"  [{r.status.upper()}] {r.filename}")
            if r.error:
                # Print first line of error only
                print(f"         {r.error.splitlines()[0]}")

    print("=" * 60)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="CivicAI – PDF text extractor",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--pdf-dir",
        type=Path,
        default=PDF_DIR,
        help=f"Directory containing PDF files (default: {PDF_DIR})",
    )
    parser.add_argument(
        "--file",
        type=str,
        default=None,
        help="Parse a single PDF by filename (looked up inside --pdf-dir)",
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=PARSED_DIR,
        help=f"Output directory for parsed JSON/TXT files (default: {PARSED_DIR})",
    )
    parser.add_argument(
        "--no-save",
        action="store_true",
        help="Print summary only; do not write output files",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="List PDF files that would be parsed without parsing them",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    pdf_dir: Path = args.pdf_dir

    # ── Dry-run ─────────────────────────────────────────────────────────────
    if args.dry_run:
        pdfs = sorted(pdf_dir.glob("*.pdf"))
        if not pdfs:
            print(f"No PDF files found in {pdf_dir}")
            return
        print(f"\nPDF files in {pdf_dir}:")
        print(f"{'#':<4} {'FILENAME':<60} {'SIZE':>10}")
        print("-" * 78)
        for i, p in enumerate(pdfs, 1):
            size_kb = p.stat().st_size / 1024
            print(f"{i:<4} {p.name:<60} {size_kb:>8.1f} KB")
        print(f"\nTotal: {len(pdfs)} file(s)")
        return

    # ── Single file ─────────────────────────────────────────────────────────
    if args.file:
        target = pdf_dir / args.file
        if not target.exists():
            log.error("File not found: %s", target)
            sys.exit(1)
        results = [parse_pdf(target)]

    # ── Batch ────────────────────────────────────────────────────────────────
    else:
        results = parse_all(pdf_dir)

    if not results:
        log.warning("Nothing to parse.")
        return

    # ── Save ─────────────────────────────────────────────────────────────────
    if not args.no_save:
        save_parsed(results, args.out_dir)

    # ── Summary ──────────────────────────────────────────────────────────────
    print_summary(results)


if __name__ == "__main__":
    main()
