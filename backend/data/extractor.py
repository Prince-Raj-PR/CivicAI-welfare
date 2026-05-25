"""
CivicAI - Scheme Metadata Extractor
=====================================
Stage 4 of the ingestion pipeline.

Accepts cleaned scheme text (from text_cleaner.py), calls the Groq LLM
API, and extracts structured metadata for every Indian welfare scheme.

Extracted fields
----------------
  scheme_name          str
  description          str
  income_max           int | null        (annual, INR)
  allowed_categories   list[str]         (SC/ST/OBC/EWS/General/Women/…)
  age_min              int | null
  age_max              int | null
  student_required     bool | null
  disability_required  bool | null
  state                str               ("All India" or state name)
  benefit              str               (what the beneficiary receives)
  required_documents   list[str]
  application_process  str

Public API
----------
  extract(text, source="")          → ExtractResult  (single text block)
  extract_file(path, out_dir)       → ExtractResult  (reads a .txt file)
  extract_all(cleaned_dir, out_dir) → list[ExtractResult]  (batch)

Malformed-response handling
----------------------------
  • JSON not found in response  → regex fence-strip + json.loads retry
  • json.JSONDecodeError         → field-by-field regex fallback parser
  • Missing required fields      → filled with null / empty defaults
  • LLM API errors               → up to 3 retries with exponential back-off
  • Rate-limit (429)             → waits and retries automatically

Usage
-----
    python3 extractor.py                        # extract all cleaned .txt files
    python3 extractor.py --file pmjay.txt       # single file
    python3 extractor.py --no-save              # print JSON to stdout only
    python3 extractor.py --dry-run              # list files without extracting
    python3 extractor.py --model llama3-70b-8192
"""

import os
import re
import sys
import json
import time
import logging
import argparse
from pathlib import Path
from datetime import datetime, timezone
from dataclasses import dataclass, field, asdict
from typing import Optional, Any

from groq import Groq, RateLimitError, APIStatusError, APIConnectionError

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

BASE_DIR      = Path(__file__).parent          # backend/data/
CLEANED_DIR   = BASE_DIR / "cleaned"
EXTRACTED_DIR = BASE_DIR / "extracted"
LOG_DIR       = BASE_DIR / "raw" / "logs"

for _d in (EXTRACTED_DIR, LOG_DIR):
    _d.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

_ts      = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
LOG_FILE = LOG_DIR / f"extract_{_ts}.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
    ],
)
log = logging.getLogger("civicai.extractor")

# ---------------------------------------------------------------------------
# Groq client (lazy — only created when first needed)
# ---------------------------------------------------------------------------

_groq_client: Optional[Groq] = None

def _get_client() -> Groq:
    global _groq_client
    if _groq_client is None:
        api_key = os.environ.get("GROQ_API_KEY", "")
        if not api_key:
            raise EnvironmentError(
                "GROQ_API_KEY is not set. "
                "Export it or add it to backend/.env before running."
            )
        _groq_client = Groq(api_key=api_key)
    return _groq_client


# ---------------------------------------------------------------------------
# Schema definition — single source of truth
# ---------------------------------------------------------------------------

# Field name → (type_hint, default_value)
SCHEMA: dict[str, tuple[str, Any]] = {
    "scheme_name":          ("str",        ""),
    "description":          ("str",        ""),
    "income_max":           ("int|null",   None),
    "allowed_categories":   ("list[str]",  []),
    "age_min":              ("int|null",   None),
    "age_max":              ("int|null",   None),
    "student_required":     ("bool|null",  None),
    "disability_required":  ("bool|null",  None),
    "state":                ("str",        "All India"),
    "benefit":              ("str",        ""),
    "required_documents":   ("list[str]",  []),
    "application_process":  ("str",        ""),
}

# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

@dataclass
class ExtractResult:
    """Outcome of extracting metadata from one scheme text."""
    source:        str
    status:        str = "ok"       # "ok" | "partial" | "failed" | "empty"
    scheme_data:   dict = field(default_factory=dict)
    raw_response:  str  = ""        # full LLM response text (for debugging)
    parse_method:  str  = ""        # "json_direct" | "fence_strip" | "regex_fallback"
    retries_used:  int  = 0
    error:         Optional[str] = None
    extracted_at:  str  = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


# ---------------------------------------------------------------------------
# Prompt engineering
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = """\
You are a precise data extraction assistant for CivicAI, an Indian government
welfare scheme eligibility platform.

Your task: read the provided scheme document text and extract structured
metadata as a single valid JSON object.

Rules
-----
1. Output ONLY a JSON object — no markdown, no explanation, no code fences.
2. Use null (not "null", not "N/A", not "") for unknown numeric/boolean fields.
3. Use [] for unknown list fields.
4. Use "" for unknown string fields EXCEPT state (default "All India").
5. income_max must be an integer in INR per year (e.g. 250000 for ₹2.5 lakh).
   Convert lakh/crore: 1 lakh = 100000, 1 crore = 10000000.
   If a monthly figure is given, multiply by 12.
6. allowed_categories: use standard labels only —
   SC, ST, OBC, EWS, General, Women, Farmer, BPL, Minority, Disabled,
   Senior Citizen, Student, Unorganised Worker, Urban Poor, Rural Poor.
7. state: use the official state name or "All India" for central schemes.
8. required_documents: short noun phrases, e.g. "Aadhaar card", "Income certificate".
9. application_process: one concise paragraph (max 80 words).
10. description: two to three sentences summarising the scheme's purpose.
"""

_USER_TEMPLATE = """\
Extract metadata from the following Indian government welfare scheme text.

Return a JSON object with exactly these keys:
  scheme_name, description, income_max, allowed_categories,
  age_min, age_max, student_required, disability_required,
  state, benefit, required_documents, application_process

--- SCHEME TEXT START ---
{text}
--- SCHEME TEXT END ---
"""

# Maximum characters sent to the LLM (avoid token overflow)
_MAX_INPUT_CHARS = 6000

def _build_prompt(text: str) -> str:
    """Truncate text if needed and fill the user template."""
    truncated = text[:_MAX_INPUT_CHARS]
    if len(text) > _MAX_INPUT_CHARS:
        truncated += "\n[... text truncated for length ...]"
    return _USER_TEMPLATE.format(text=truncated)


# ---------------------------------------------------------------------------
# Response parsing — three-tier fallback
# ---------------------------------------------------------------------------

# Matches ```json ... ``` or ``` ... ``` fences
_FENCE_RE = re.compile(r"```(?:json)?\s*([\s\S]*?)```", re.IGNORECASE)

# Per-field regex patterns for the last-resort fallback parser
_FIELD_PATTERNS: dict[str, re.Pattern] = {
    "scheme_name":         re.compile(r'"scheme_name"\s*:\s*"([^"]*)"'),
    "description":         re.compile(r'"description"\s*:\s*"([^"]*)"'),
    "income_max":          re.compile(r'"income_max"\s*:\s*(\d+|null)'),
    "age_min":             re.compile(r'"age_min"\s*:\s*(\d+|null)'),
    "age_max":             re.compile(r'"age_max"\s*:\s*(\d+|null)'),
    "student_required":    re.compile(r'"student_required"\s*:\s*(true|false|null)'),
    "disability_required": re.compile(r'"disability_required"\s*:\s*(true|false|null)'),
    "state":               re.compile(r'"state"\s*:\s*"([^"]*)"'),
    "benefit":             re.compile(r'"benefit"\s*:\s*"([^"]*)"'),
    "application_process": re.compile(r'"application_process"\s*:\s*"([^"]*)"'),
}

_LIST_FIELD_RE = re.compile(r'"({field})"\s*:\s*\[([^\]]*)\]')


def _parse_list_field(raw: str, field_name: str) -> list[str]:
    """Extract a JSON array field from a raw string using regex."""
    pattern = re.compile(
        r'"' + re.escape(field_name) + r'"\s*:\s*\[([^\]]*)\]'
    )
    m = pattern.search(raw)
    if not m:
        return []
    items_str = m.group(1)
    return [
        item.strip().strip('"')
        for item in items_str.split(",")
        if item.strip().strip('"')
    ]


def _coerce_value(field: str, raw_val: Any) -> Any:
    """Coerce a parsed value to the expected type for the field."""
    type_hint, default = SCHEMA[field]

    # Missing value → always return the schema default
    if raw_val is None:
        return default

    if "int" in type_hint:
        try:
            return int(raw_val)
        except (TypeError, ValueError):
            return None

    if "bool" in type_hint:
        if isinstance(raw_val, bool):
            return raw_val
        if isinstance(raw_val, str):
            return raw_val.lower() == "true"
        return None

    if "list" in type_hint:
        if isinstance(raw_val, list):
            return [str(v) for v in raw_val]
        return []

    # str field: return value, fall back to default for empty strings
    val = str(raw_val).strip()
    return val if val else default


def _apply_defaults(data: dict) -> dict:
    """Fill any missing schema fields with their defaults."""
    result = {}
    for field_name, (_, default) in SCHEMA.items():
        val = data.get(field_name)
        result[field_name] = _coerce_value(field_name, val)
    return result


def _parse_response(raw: str) -> tuple[dict, str]:
    """
    Try to parse the LLM response into a dict using three strategies.

    Returns (parsed_dict, method_name).
    Raises ValueError if all strategies fail.
    """
    # ── Strategy 1: direct JSON parse ───────────────────────────────────────
    try:
        data = json.loads(raw.strip())
        if isinstance(data, dict):
            return data, "json_direct"
    except json.JSONDecodeError:
        pass

    # ── Strategy 2: strip markdown code fences then parse ───────────────────
    fence_match = _FENCE_RE.search(raw)
    if fence_match:
        try:
            data = json.loads(fence_match.group(1).strip())
            if isinstance(data, dict):
                return data, "fence_strip"
        except json.JSONDecodeError:
            pass

    # ── Strategy 3: find first { ... } block ────────────────────────────────
    brace_match = re.search(r"\{[\s\S]*\}", raw)
    if brace_match:
        try:
            data = json.loads(brace_match.group(0))
            if isinstance(data, dict):
                return data, "fence_strip"
        except json.JSONDecodeError:
            pass

    # ── Strategy 4: field-by-field regex fallback ───────────────────────────
    log.warning("    ⚠  JSON parse failed — using regex field fallback")
    data: dict = {}

    for field_name, pattern in _FIELD_PATTERNS.items():
        m = pattern.search(raw)
        if m:
            val = m.group(1)
            if val == "null":
                data[field_name] = None
            elif val in ("true", "false"):
                data[field_name] = val == "true"
            else:
                data[field_name] = val

    data["allowed_categories"] = _parse_list_field(raw, "allowed_categories")
    data["required_documents"] = _parse_list_field(raw, "required_documents")

    if data:
        return data, "regex_fallback"

    raise ValueError("All response parsing strategies failed")


# ---------------------------------------------------------------------------
# LLM call with retry logic
# ---------------------------------------------------------------------------

_DEFAULT_MODEL   = os.environ.get("GROQ_MODEL", "llama-3.1-8b-instant")
_MAX_RETRIES     = 3
_RETRY_BASE_WAIT = 2.0   # seconds; doubles each retry


def _call_llm(
    prompt: str,
    model: str = _DEFAULT_MODEL,
    temperature: float = 0.0,
) -> tuple[str, int]:
    """
    Call the Groq chat completion API with retry on transient errors.

    Returns (response_text, retries_used).
    Raises on permanent failure.
    """
    client = _get_client()
    last_error: Exception = RuntimeError("No attempts made")

    for attempt in range(_MAX_RETRIES + 1):
        try:
            completion = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user",   "content": prompt},
                ],
                temperature=temperature,
                max_tokens=1024,
                # Ask for JSON output explicitly when the model supports it
                response_format={"type": "json_object"},
            )
            return completion.choices[0].message.content, attempt

        except RateLimitError as exc:
            wait = _RETRY_BASE_WAIT * (2 ** attempt)
            log.warning("    ⏳  Rate limited — waiting %.1fs (attempt %d/%d)",
                        wait, attempt + 1, _MAX_RETRIES)
            time.sleep(wait)
            last_error = exc

        except APIConnectionError as exc:
            wait = _RETRY_BASE_WAIT * (2 ** attempt)
            log.warning("    🔌  Connection error — retrying in %.1fs (attempt %d/%d)",
                        wait, attempt + 1, _MAX_RETRIES)
            time.sleep(wait)
            last_error = exc

        except APIStatusError as exc:
            # 5xx are transient; 4xx (except 429) are permanent
            if exc.status_code >= 500:
                wait = _RETRY_BASE_WAIT * (2 ** attempt)
                log.warning("    🔥  Server error %d — retrying in %.1fs",
                            exc.status_code, wait)
                time.sleep(wait)
                last_error = exc
            else:
                raise   # 4xx client errors: don't retry

    raise last_error


# ---------------------------------------------------------------------------
# Core extract() function
# ---------------------------------------------------------------------------

def extract(
    text: str,
    source: str = "",
    model: str = _DEFAULT_MODEL,
) -> ExtractResult:
    """
    Extract structured scheme metadata from cleaned text.

    Parameters
    ----------
    text   : cleaned scheme text (output of text_cleaner.clean())
    source : label for logging / result tracking (e.g. filename)
    model  : Groq model ID to use

    Returns
    -------
    ExtractResult with scheme_data dict and status.
    """
    result = ExtractResult(source=source)

    # ── Guard: empty input ───────────────────────────────────────────────────
    if not text or not text.strip():
        result.status = "empty"
        log.warning("  ⚠  Empty input for '%s'", source)
        return result

    log.info("  🤖  Extracting: %s  (%d chars)", source or "text", len(text))

    # ── Build prompt ─────────────────────────────────────────────────────────
    prompt = _build_prompt(text)

    # ── Call LLM ─────────────────────────────────────────────────────────────
    try:
        raw_response, retries = _call_llm(prompt, model=model)
        result.raw_response = raw_response
        result.retries_used = retries
    except Exception as exc:
        log.error("  ❌  LLM call failed for '%s': %s", source, exc)
        result.status = "failed"
        result.error  = f"{type(exc).__name__}: {exc}"
        result.scheme_data = _apply_defaults({})
        return result

    # ── Parse response ───────────────────────────────────────────────────────
    try:
        raw_data, method = _parse_response(raw_response)
        result.parse_method = method
        if method == "regex_fallback":
            log.warning("    ⚠  Used regex fallback for '%s'", source)
    except ValueError as exc:
        log.error("  ❌  Response parsing failed for '%s': %s", source, exc)
        result.status     = "failed"
        result.error      = str(exc)
        result.scheme_data = _apply_defaults({})
        return result

    # ── Apply schema defaults and type coercion ──────────────────────────────
    result.scheme_data = _apply_defaults(raw_data)

    # ── Determine status ─────────────────────────────────────────────────────
    filled = sum(
        1 for k, v in result.scheme_data.items()
        if v not in (None, "", [], {})
    )
    total  = len(SCHEMA)
    result.status = "ok" if filled >= total // 2 else "partial"

    log.info(
        "  ✅  %-40s  method=%-14s  fields=%d/%d",
        source or "text",
        result.parse_method,
        filled,
        total,
    )
    return result


# ---------------------------------------------------------------------------
# File-level helpers
# ---------------------------------------------------------------------------

def extract_file(
    path: Path,
    out_dir: Optional[Path],
    model: str = _DEFAULT_MODEL,
) -> ExtractResult:
    """
    Read a cleaned .txt file, extract metadata, write output to out_dir.

    Output files
    ------------
    <out_dir>/<stem>.json  – scheme_data + ExtractResult metadata
    """
    try:
        text = path.read_text(encoding="utf-8")
    except Exception as exc:
        log.error("  ❌  Cannot read %s: %s", path.name, exc)
        return ExtractResult(
            source=path.name, status="failed",
            error=f"Read error: {exc}",
            scheme_data=_apply_defaults({}),
        )

    result = extract(text, source=path.name, model=model)

    if out_dir:
        out_dir.mkdir(parents=True, exist_ok=True)
        stem = path.stem
        output = {
            "source":       result.source,
            "status":       result.status,
            "parse_method": result.parse_method,
            "retries_used": result.retries_used,
            "extracted_at": result.extracted_at,
            "error":        result.error,
            "scheme_data":  result.scheme_data,
        }
        (out_dir / f"{stem}.json").write_text(
            json.dumps(output, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

    return result


def extract_all(
    cleaned_dir: Path,
    out_dir: Path,
    model: str = _DEFAULT_MODEL,
    delay: float = 1.0,
) -> list[ExtractResult]:
    """
    Extract metadata from every *.txt file in cleaned_dir.
    Writes one JSON per file plus a master index.json to out_dir.

    delay: seconds to wait between LLM calls (rate-limit courtesy).
    """
    txt_files = sorted(cleaned_dir.glob("*.txt"))

    if not txt_files:
        log.warning("No .txt files found in %s", cleaned_dir)
        return []

    log.info("Found %d .txt file(s) in %s", len(txt_files), cleaned_dir)

    results: list[ExtractResult] = []
    for i, txt_path in enumerate(txt_files):
        result = extract_file(txt_path, out_dir, model=model)
        results.append(result)
        if i < len(txt_files) - 1:
            time.sleep(delay)   # polite delay between API calls

    # Master index
    index = []
    for r in results:
        index.append({
            "source":       r.source,
            "status":       r.status,
            "parse_method": r.parse_method,
            "retries_used": r.retries_used,
            "extracted_at": r.extracted_at,
            "error":        r.error,
            "scheme_name":  r.scheme_data.get("scheme_name", ""),
        })

    index_path = out_dir / "index.json"
    index_path.write_text(
        json.dumps(index, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    log.info("📋  Index → %s", index_path)
    return results


# ---------------------------------------------------------------------------
# Summary printer
# ---------------------------------------------------------------------------

def print_summary(results: list[ExtractResult]) -> None:
    ok      = [r for r in results if r.status == "ok"]
    partial = [r for r in results if r.status == "partial"]
    failed  = [r for r in results if r.status in ("failed", "empty")]

    print("\n" + "=" * 66)
    print("EXTRACTION SUMMARY")
    print("=" * 66)
    print(f"  ✅  OK        : {len(ok)}")
    print(f"  ⚠   Partial   : {len(partial)}")
    print(f"  ❌  Failed    : {len(failed)}")
    print(f"  ─────────────────────────────────────────────────────────")
    print(f"  📄  Total     : {len(results)}")

    if ok or partial:
        print(f"\n  {'FILE':<38} {'STATUS':<9} {'METHOD':<16} {'SCHEME NAME'}")
        print(f"  {'-'*38} {'-'*9} {'-'*16} {'-'*20}")
        for r in ok + partial:
            name = r.scheme_data.get("scheme_name", "")[:30]
            print(f"  {r.source:<38} {r.status:<9} {r.parse_method:<16} {name}")

    if failed:
        print("\n  Failed:")
        for r in failed:
            print(f"    ❌  {r.source}: {r.error or r.status}")

    print("=" * 66)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def _load_env() -> None:
    """Load GROQ_API_KEY from backend/.env if not already in environment."""
    if os.environ.get("GROQ_API_KEY"):
        return
    env_path = Path(__file__).parent.parent / ".env"   # backend/.env
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = val


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="CivicAI – LLM-based scheme metadata extractor",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--cleaned-dir", type=Path, default=CLEANED_DIR,
        help=f"Directory with cleaned .txt files (default: {CLEANED_DIR})",
    )
    parser.add_argument(
        "--out-dir", type=Path, default=EXTRACTED_DIR,
        help=f"Output directory for extracted JSON (default: {EXTRACTED_DIR})",
    )
    parser.add_argument(
        "--file", type=str, default=None,
        help="Extract a single .txt file by name (looked up inside --cleaned-dir)",
    )
    parser.add_argument(
        "--model", type=str, default=_DEFAULT_MODEL,
        help=f"Groq model ID (default: {_DEFAULT_MODEL})",
    )
    parser.add_argument(
        "--no-save", action="store_true",
        help="Print extracted JSON to stdout; do not write files",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="List .txt files that would be processed without calling the LLM",
    )
    parser.add_argument(
        "--delay", type=float, default=1.0,
        help="Seconds between LLM calls in batch mode (default: 1.0)",
    )
    return parser.parse_args()


def main() -> None:
    _load_env()
    args = parse_args()
    cleaned_dir: Path = args.cleaned_dir

    # ── Dry-run ──────────────────────────────────────────────────────────────
    if args.dry_run:
        files = sorted(cleaned_dir.glob("*.txt"))
        if not files:
            print(f"No .txt files found in {cleaned_dir}")
            return
        print(f"\n.txt files in {cleaned_dir}:")
        print(f"{'#':<4} {'FILENAME':<55} {'SIZE':>10}")
        print("-" * 72)
        for i, p in enumerate(files, 1):
            print(f"{i:<4} {p.name:<55} {p.stat().st_size/1024:>8.1f} KB")
        print(f"\nTotal: {len(files)} file(s)")
        return

    out_dir = None if args.no_save else args.out_dir

    # ── Single file ──────────────────────────────────────────────────────────
    if args.file:
        target = cleaned_dir / args.file
        if not target.exists():
            log.error("File not found: %s", target)
            sys.exit(1)
        result = extract_file(target, out_dir, model=args.model)
        if args.no_save:
            print(json.dumps(result.scheme_data, indent=2, ensure_ascii=False))
        print_summary([result])
        return

    # ── Batch ────────────────────────────────────────────────────────────────
    results = extract_all(
        cleaned_dir,
        out_dir or EXTRACTED_DIR,
        model=args.model,
        delay=args.delay,
    )
    if not results:
        log.warning("Nothing to extract.")
        return
    print_summary(results)


if __name__ == "__main__":
    main()
