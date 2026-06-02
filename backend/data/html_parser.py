"""
CivicAI - HTML Parser
======================
Extracts clean text from HTML files downloaded by fetcher.py.
Similar to pdf_parser.py but for HTML sources.

Reads HTML files from backend/data/raw/html/ and outputs plain text
to backend/data/parsed/ for further processing by text_cleaner.py.

Public API
----------
  parse_html(path)                 → ParseResult for one HTML file
  parse_all(html_dir)              → list[ParseResult]
  save_parsed(results, out_dir)    → writes .txt and .json files

Usage
-----
    python3 html_parser.py                     # parse all HTML in raw/html/
    python3 html_parser.py --file page.html    # single file
    python3 html_parser.py --dry-run           # list files without parsing
"""

import re
import json
import logging
import argparse
from pathlib import Path
from datetime import datetime, timezone
from dataclasses import dataclass, field, asdict
from typing import Optional
from html.parser import HTMLParser

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

BASE_DIR   = Path(__file__).parent          # backend/data/
HTML_DIR   = BASE_DIR / "raw" / "html"
PARSED_DIR = BASE_DIR / "parsed"
LOG_DIR    = BASE_DIR / "raw" / "logs"

for _d in (PARSED_DIR, LOG_DIR):
    _d.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

_ts      = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
LOG_FILE = LOG_DIR / f"parse_html_{_ts}.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
    ],
)
log = logging.getLogger("civicai.html_parser")

# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

@dataclass
class ParseResult:
    """Outcome of parsing one HTML file."""
    filename:      str
    status:        str = "ok"          # "ok" | "empty" | "failed"
    text:          str = ""            # extracted plain text
    char_count:    int = 0
    word_count:    int = 0
    error:         Optional[str] = None
    parsed_at:     str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

# ---------------------------------------------------------------------------
# HTML Text Extractor
# ---------------------------------------------------------------------------

class TextExtractor(HTMLParser):
    """
    Extracts visible text from HTML, stripping scripts, styles, and tags.
    Preserves paragraph breaks and basic structure.
    """
    
    def __init__(self):
        super().__init__()
        self.text_parts = []
        self.skip_tags = {'script', 'style', 'noscript', 'iframe', 'svg', 'path'}
        self.current_skip = None
        self.block_tags = {
            'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
            'li', 'br', 'tr', 'td', 'th', 'section', 'article', 
            'header', 'footer', 'nav', 'aside', 'main'
        }
    
    def handle_starttag(self, tag, attrs):
        if tag in self.skip_tags:
            self.current_skip = tag
    
    def handle_endtag(self, tag):
        if tag == self.current_skip:
            self.current_skip = None
        elif tag in self.block_tags:
            self.text_parts.append('\n')
    
    def handle_data(self, data):
        if self.current_skip:
            return
        text = data.strip()
        if text:
            self.text_parts.append(text + ' ')
    
    def get_text(self) -> str:
        """Return extracted text with normalized whitespace."""
        raw = ''.join(self.text_parts)
        # Normalize whitespace
        text = re.sub(r'[ \t]+', ' ', raw)
        text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)
        return text.strip()

# ---------------------------------------------------------------------------
# Core parsing function
# ---------------------------------------------------------------------------

def parse_html(path: Path) -> ParseResult:
    """
    Parse an HTML file and extract clean text.
    
    Parameters
    ----------
    path : Path to HTML file
    
    Returns
    -------
    ParseResult with extracted text and metadata
    """
    result = ParseResult(filename=path.name)
    
    try:
        # Read HTML content
        html_content = path.read_text(encoding='utf-8', errors='ignore')
        
        if not html_content or not html_content.strip():
            result.status = "empty"
            log.warning("  ⚠  Empty HTML file: %s", path.name)
            return result
        
        # Extract text using HTMLParser
        extractor = TextExtractor()
        extractor.feed(html_content)
        text = extractor.get_text()
        
        if not text or len(text) < 50:
            result.status = "empty"
            log.warning("  ⚠  No meaningful text extracted from: %s", path.name)
            return result
        
        # Additional cleaning
        text = _post_process_text(text)
        
        result.text = text
        result.char_count = len(text)
        result.word_count = len(text.split())
        result.status = "ok"
        
        log.info("  ✅  %-50s  %6d chars  %5d words",
                 path.name, result.char_count, result.word_count)
        
    except Exception as exc:
        result.status = "failed"
        result.error = f"{type(exc).__name__}: {exc}"
        log.error("  ❌  Failed to parse %s: %s", path.name, exc)
    
    return result


def _post_process_text(text: str) -> str:
    """Additional text cleanup after HTML parsing."""
    
    # Remove common web artifacts
    text = re.sub(r'Skip to (main )?content', '', text, flags=re.IGNORECASE)
    text = re.sub(r'(Accept|Reject) (all )?cookies?', '', text, flags=re.IGNORECASE)
    text = re.sub(r'Cookie (Policy|Settings)', '', text, flags=re.IGNORECASE)
    text = re.sub(r'Privacy Policy', '', text, flags=re.IGNORECASE)
    text = re.sub(r'Terms (and Conditions|of Service)', '', text, flags=re.IGNORECASE)
    text = re.sub(r'© \d{4}', '', text)
    text = re.sub(r'All Rights Reserved', '', text, flags=re.IGNORECASE)
    
    # Remove navigation artifacts
    text = re.sub(r'(Home|About|Contact|Services|Login|Register|Sign (In|Up))\s*\|', '', text)
    text = re.sub(r'Search\s*Submit', '', text, flags=re.IGNORECASE)
    
    # Remove social media artifacts
    text = re.sub(r'Follow us on (Facebook|Twitter|Instagram|LinkedIn)', '', text, flags=re.IGNORECASE)
    text = re.sub(r'Share (on|this)', '', text, flags=re.IGNORECASE)
    
    # Normalize whitespace again
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)
    
    return text.strip()

# ---------------------------------------------------------------------------
# Batch processing
# ---------------------------------------------------------------------------

def parse_all(html_dir: Path) -> list[ParseResult]:
    """
    Parse all HTML files in a directory.
    
    Parameters
    ----------
    html_dir : Directory containing HTML files
    
    Returns
    -------
    List of ParseResult objects
    """
    html_files = sorted(html_dir.glob("*.html"))
    
    if not html_files:
        log.warning("No HTML files found in %s", html_dir)
        return []
    
    log.info("Found %d HTML file(s) in %s", len(html_files), html_dir)
    
    results = []
    for html_path in html_files:
        result = parse_html(html_path)
        results.append(result)
    
    return results


def save_parsed(results: list[ParseResult], out_dir: Path) -> None:
    """
    Save parsed results to output directory.
    Writes both .txt (plain text) and .json (metadata) files.
    
    Parameters
    ----------
    results : List of ParseResult objects
    out_dir : Output directory path
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    
    for result in results:
        if result.status != "ok":
            continue
        
        stem = Path(result.filename).stem
        
        # Write plain text file
        txt_path = out_dir / f"{stem}.txt"
        txt_path.write_text(result.text, encoding="utf-8")
        
        # Write metadata JSON
        json_path = out_dir / f"{stem}.json"
        metadata = {
            "filename": result.filename,
            "status": result.status,
            "char_count": result.char_count,
            "word_count": result.word_count,
            "parsed_at": result.parsed_at,
        }
        json_path.write_text(
            json.dumps(metadata, indent=2, ensure_ascii=False),
            encoding="utf-8"
        )
    
    log.info("📁  Saved %d parsed file(s) to %s",
             sum(1 for r in results if r.status == "ok"), out_dir)

# ---------------------------------------------------------------------------
# Summary printer
# ---------------------------------------------------------------------------

def print_summary(results: list[ParseResult]) -> None:
    """Print parsing summary statistics."""
    ok = [r for r in results if r.status == "ok"]
    empty = [r for r in results if r.status == "empty"]
    failed = [r for r in results if r.status == "failed"]
    
    total_chars = sum(r.char_count for r in ok)
    total_words = sum(r.word_count for r in ok)
    
    print("\n" + "=" * 66)
    print("HTML PARSING SUMMARY")
    print("=" * 66)
    print(f"  ✅  OK       : {len(ok)}")
    print(f"  ⚠   Empty    : {len(empty)}")
    print(f"  ❌  Failed   : {len(failed)}")
    print(f"  ─────────────────────────────────────────────────────────")
    print(f"  📄  Total    : {len(results)}")
    print(f"  📝  Chars    : {total_chars:,}")
    print(f"  📖  Words    : {total_words:,}")
    
    if ok:
        avg_chars = total_chars // len(ok) if ok else 0
        avg_words = total_words // len(ok) if ok else 0
        print(f"  📊  Avg/file : {avg_chars:,} chars, {avg_words:,} words")
    
    if failed:
        print("\n  Failed files:")
        for r in failed:
            print(f"    ❌  {r.filename}: {r.error}")
    
    print("=" * 66)

# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="CivicAI – HTML text extractor",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--html-dir", type=Path, default=HTML_DIR,
        help=f"Directory with HTML files (default: {HTML_DIR})",
    )
    parser.add_argument(
        "--out-dir", type=Path, default=PARSED_DIR,
        help=f"Output directory for parsed text (default: {PARSED_DIR})",
    )
    parser.add_argument(
        "--file", type=str, default=None,
        help="Parse a single HTML file by name",
    )
    parser.add_argument(
        "--no-save", action="store_true",
        help="Print text to stdout; do not write files",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="List HTML files without parsing",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    html_dir: Path = args.html_dir
    
    # ── Dry-run ──────────────────────────────────────────────────────────────
    if args.dry_run:
        files = sorted(html_dir.glob("*.html"))
        if not files:
            print(f"No HTML files found in {html_dir}")
            return
        print(f"\nHTML files in {html_dir}:")
        print(f"{'#':<4} {'FILENAME':<55} {'SIZE':>10}")
        print("-" * 72)
        for i, p in enumerate(files, 1):
            print(f"{i:<4} {p.name:<55} {p.stat().st_size/1024:>8.1f} KB")
        print(f"\nTotal: {len(files)} file(s)")
        return
    
    # ── Single file ──────────────────────────────────────────────────────────
    if args.file:
        target = html_dir / args.file
        if not target.exists():
            log.error("File not found: %s", target)
            return
        result = parse_html(target)
        if args.no_save:
            print(result.text)
        else:
            save_parsed([result], args.out_dir)
        print_summary([result])
        return
    
    # ── Batch ────────────────────────────────────────────────────────────────
    results = parse_all(html_dir)
    if not results:
        log.warning("Nothing to parse.")
        return
    
    if not args.no_save:
        save_parsed(results, args.out_dir)
    
    print_summary(results)


if __name__ == "__main__":
    main()
