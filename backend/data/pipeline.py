"""
CivicAI - AI Ingestion Pipeline
=================================
Orchestrates all six stages end-to-end:

  Stage 1  fetcher       – download PDFs + HTML from Indian govt portals
  Stage 2  pdf_parser    – extract raw text from PDFs
  Stage 3  text_cleaner  – remove boilerplate, headers, page numbers
  Stage 4  extractor     – LLM extracts structured scheme metadata
  Stage 5  validator     – Pydantic validation + auto-repair
  Stage 6  normalizer    – canonical categories, states, documents, income

Final output: backend/data/schemes.json
  A single JSON array of production-ready scheme records, one per scheme.

Directory layout produced
-------------------------
  backend/data/
    raw/
      pdfs/          ← Stage 1 output (PDFs)
      html/          ← Stage 1 output (HTML pages)
      logs/          ← per-run log files for every stage
      manifest.json  ← fetcher download manifest
    parsed/          ← Stage 2 output (.txt + .json per PDF)
    cleaned/         ← Stage 3 output (.txt + .json per file)
    extracted/       ← Stage 4 output (.json per file)
    validated/       ← Stage 5 output (.json per file)
    normalized/      ← Stage 6 output (.json per file)
    schemes.json     ← FINAL OUTPUT (array of all valid schemes)
    pipeline_run.json← last run summary

Usage
-----
    python3 pipeline.py                    # full pipeline
    python3 pipeline.py --skip-fetch       # skip download (use cached raw/)
    python3 pipeline.py --skip-parse       # skip PDF parsing
    python3 pipeline.py --skip-extract     # skip LLM extraction
    python3 pipeline.py --from-stage 4     # start from a specific stage
    python3 pipeline.py --source pmjay     # fetch only one source
    python3 pipeline.py --dry-run          # show what would run, no I/O
    python3 pipeline.py --force-fetch      # re-download even if cached
"""

import os
import sys
import json
import time
import logging
import argparse
import traceback
from pathlib import Path
from datetime import datetime, timezone
from dataclasses import dataclass, field, asdict
from typing import Optional

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

BASE_DIR      = Path(__file__).parent          # backend/data/
RAW_DIR       = BASE_DIR / "raw"
PDF_DIR       = RAW_DIR / "pdfs"
HTML_DIR      = RAW_DIR / "html"
PARSED_DIR    = BASE_DIR / "parsed"
CLEANED_DIR   = BASE_DIR / "cleaned"
EXTRACTED_DIR = BASE_DIR / "extracted"
VALIDATED_DIR = BASE_DIR / "validated"
NORMALIZED_DIR= BASE_DIR / "normalized"
LOG_DIR       = RAW_DIR / "logs"

SCHEMES_JSON  = BASE_DIR / "schemes.json"
RUN_SUMMARY   = BASE_DIR / "pipeline_run.json"

for _d in (PDF_DIR, HTML_DIR, PARSED_DIR, CLEANED_DIR,
           EXTRACTED_DIR, VALIDATED_DIR, NORMALIZED_DIR, LOG_DIR):
    _d.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Logging — single shared logger for the whole pipeline run
# ---------------------------------------------------------------------------

_ts      = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
LOG_FILE = LOG_DIR / f"pipeline_{_ts}.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
    ],
)
log = logging.getLogger("civicai.pipeline")

# ---------------------------------------------------------------------------
# Environment: load GROQ_API_KEY from backend/.env if not already set
# ---------------------------------------------------------------------------

def _load_env() -> None:
    if os.environ.get("GROQ_API_KEY"):
        return
    env_path = BASE_DIR.parent / ".env"          # backend/.env
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        k = k.strip()
        v = v.strip().strip('"').strip("'")
        if k and k not in os.environ:
            os.environ[k] = v

# ---------------------------------------------------------------------------
# Stage result dataclass
# ---------------------------------------------------------------------------

@dataclass
class StageResult:
    stage:      int
    name:       str
    status:     str = "ok"      # "ok" | "skipped" | "failed" | "partial"
    items_in:   int = 0
    items_out:  int = 0
    items_fail: int = 0
    duration_s: float = 0.0
    error:      Optional[str] = None
    notes:      list[str] = field(default_factory=list)

@dataclass
class PipelineRun:
    run_id:      str
    started_at:  str
    finished_at: str = ""
    status:      str = "running"   # "ok" | "partial" | "failed"
    stages:      list[StageResult] = field(default_factory=list)
    schemes_out: int = 0
    log_file:    str = ""
    error:       Optional[str] = None


# ---------------------------------------------------------------------------
# Stage helpers
# ---------------------------------------------------------------------------

def _banner(stage: int, name: str) -> None:
    log.info("")
    log.info("━" * 62)
    log.info("  STAGE %d  ▶  %s", stage, name.upper())
    log.info("━" * 62)


def _stage_ok(stage: int, name: str, items_in: int, items_out: int,
              items_fail: int, duration_s: float,
              notes: list[str] | None = None) -> StageResult:
    status = "ok" if items_fail == 0 else "partial"
    log.info("  ✅  Stage %d done  in=%-4d  out=%-4d  fail=%-4d  %.1fs",
             stage, items_in, items_out, items_fail, duration_s)
    return StageResult(stage=stage, name=name, status=status,
                       items_in=items_in, items_out=items_out,
                       items_fail=items_fail, duration_s=duration_s,
                       notes=notes or [])


def _stage_skip(stage: int, name: str, reason: str) -> StageResult:
    log.info("  ⏭   Stage %d SKIPPED — %s", stage, reason)
    return StageResult(stage=stage, name=name, status="skipped",
                       notes=[reason])


def _stage_fail(stage: int, name: str, error: str,
                duration_s: float = 0.0) -> StageResult:
    log.error("  ❌  Stage %d FAILED — %s", stage, error)
    return StageResult(stage=stage, name=name, status="failed",
                       error=error, duration_s=duration_s)


# ---------------------------------------------------------------------------
# Stage 1 — Fetcher
# ---------------------------------------------------------------------------

def run_stage1_fetch(
    source_filter: Optional[str] = None,
    type_filter:   Optional[str] = None,
    force:         bool = False,
    delay:         float = 1.2,
) -> StageResult:
    _banner(1, "Fetcher — download PDFs & HTML")
    t0 = time.monotonic()

    try:
        from fetcher import TARGETS, run as fetcher_run, filter_by_source, filter_by_type

        targets = list(TARGETS)
        if source_filter:
            targets = filter_by_source(targets, source_filter)
            log.info("  Source filter '%s' → %d targets", source_filter, len(targets))
        if type_filter:
            targets = filter_by_type(targets, type_filter)
            log.info("  Type filter '%s' → %d targets", type_filter, len(targets))

        if not targets:
            return _stage_skip(1, "fetcher", "No targets matched filters")

        results = fetcher_run(targets, force=force, delay=delay)
        ok   = sum(1 for r in results if r.status == "ok")
        skip = sum(1 for r in results if r.status == "skipped")
        fail = sum(1 for r in results if r.status == "failed")

        return _stage_ok(1, "fetcher",
                         items_in=len(targets),
                         items_out=ok + skip,
                         items_fail=fail,
                         duration_s=time.monotonic() - t0,
                         notes=[f"{skip} already cached"])

    except Exception as exc:
        return _stage_fail(1, "fetcher", traceback.format_exc(),
                           time.monotonic() - t0)


# ---------------------------------------------------------------------------
# Stage 2 — PDF Parser
# ---------------------------------------------------------------------------

def run_stage2_parse() -> StageResult:
    _banner(2, "PDF Parser — extract text from PDFs")
    t0 = time.monotonic()

    try:
        from pdf_parser import parse_all, save_parsed

        pdf_files = list(PDF_DIR.glob("*.pdf"))
        if not pdf_files:
            return _stage_skip(2, "pdf_parser",
                               f"No PDFs in {PDF_DIR}")

        log.info("  Found %d PDF(s) to parse", len(pdf_files))
        results = parse_all(PDF_DIR)
        save_parsed(results, PARSED_DIR)

        ok   = sum(1 for r in results if r.status == "ok")
        empty= sum(1 for r in results if r.status == "empty")
        fail = sum(1 for r in results if r.status in ("corrupted", "failed"))

        return _stage_ok(2, "pdf_parser",
                         items_in=len(results),
                         items_out=ok,
                         items_fail=fail,
                         duration_s=time.monotonic() - t0,
                         notes=[f"{empty} image-only/empty PDFs skipped"])

    except Exception as exc:
        return _stage_fail(2, "pdf_parser", traceback.format_exc(),
                           time.monotonic() - t0)


# ---------------------------------------------------------------------------
# Stage 3 — Text Cleaner
# ---------------------------------------------------------------------------

def run_stage3_clean() -> StageResult:
    _banner(3, "Text Cleaner — remove boilerplate & noise")
    t0 = time.monotonic()

    try:
        from text_cleaner import clean_all

        # Input: .txt files from parsed/ (pdf_parser writes them)
        txt_files = list(PARSED_DIR.glob("*.txt"))
        if not txt_files:
            return _stage_skip(3, "text_cleaner",
                               f"No .txt files in {PARSED_DIR}")

        log.info("  Found %d .txt file(s) to clean", len(txt_files))
        results = clean_all(PARSED_DIR, CLEANED_DIR)

        ok   = sum(1 for r in results if r.status == "ok")
        empty= sum(1 for r in results if r.status == "empty")
        fail = sum(1 for r in results if r.status == "failed")

        return _stage_ok(3, "text_cleaner",
                         items_in=len(results),
                         items_out=ok,
                         items_fail=fail,
                         duration_s=time.monotonic() - t0,
                         notes=[f"{empty} empty after cleaning"])

    except Exception as exc:
        return _stage_fail(3, "text_cleaner", traceback.format_exc(),
                           time.monotonic() - t0)


# ---------------------------------------------------------------------------
# Stage 4 — LLM Extractor
# ---------------------------------------------------------------------------

def run_stage4_extract(
    model: str = "",
    delay: float = 1.0,
) -> StageResult:
    _banner(4, "LLM Extractor — extract structured scheme metadata")
    t0 = time.monotonic()

    try:
        from extractor import extract_all, _DEFAULT_MODEL

        txt_files = list(CLEANED_DIR.glob("*.txt"))
        if not txt_files:
            return _stage_skip(4, "extractor",
                               f"No .txt files in {CLEANED_DIR}")

        chosen_model = model or _DEFAULT_MODEL
        log.info("  Found %d file(s) to extract  model=%s", len(txt_files), chosen_model)

        results = extract_all(CLEANED_DIR, EXTRACTED_DIR,
                              model=chosen_model, delay=delay)

        ok      = sum(1 for r in results if r.status in ("ok", "partial"))
        fail    = sum(1 for r in results if r.status in ("failed", "empty"))
        partial = sum(1 for r in results if r.status == "partial")

        return _stage_ok(4, "extractor",
                         items_in=len(results),
                         items_out=ok,
                         items_fail=fail,
                         duration_s=time.monotonic() - t0,
                         notes=[f"{partial} partial extractions"])

    except Exception as exc:
        return _stage_fail(4, "extractor", traceback.format_exc(),
                           time.monotonic() - t0)


# ---------------------------------------------------------------------------
# Stage 5 — Validator
# ---------------------------------------------------------------------------

def run_stage5_validate(strict: bool = False) -> StageResult:
    _banner(5, "Validator — Pydantic validation + auto-repair")
    t0 = time.monotonic()

    try:
        from validator import validate_all

        json_files = [
            p for p in EXTRACTED_DIR.glob("*.json")
            if p.name != "index.json"
        ]
        if not json_files:
            return _stage_skip(5, "validator",
                               f"No JSON files in {EXTRACTED_DIR}")

        log.info("  Found %d file(s) to validate", len(json_files))
        results = validate_all(EXTRACTED_DIR, VALIDATED_DIR, strict=strict)

        valid    = sum(1 for r in results if r.status in ("valid", "repaired"))
        rejected = sum(1 for r in results if r.status == "rejected")
        errors   = sum(1 for r in results if r.status == "error")
        repaired = sum(1 for r in results if r.status == "repaired")

        return _stage_ok(5, "validator",
                         items_in=len(results),
                         items_out=valid,
                         items_fail=rejected + errors,
                         duration_s=time.monotonic() - t0,
                         notes=[f"{repaired} auto-repaired",
                                f"{rejected} rejected"])

    except Exception as exc:
        return _stage_fail(5, "validator", traceback.format_exc(),
                           time.monotonic() - t0)


# ---------------------------------------------------------------------------
# Stage 6 — Normalizer
# ---------------------------------------------------------------------------

def run_stage6_normalize() -> StageResult:
    _banner(6, "Normalizer — canonical fields, income parsing")
    t0 = time.monotonic()

    try:
        from normalizer import normalize_all

        json_files = [
            p for p in VALIDATED_DIR.glob("*.json")
            if p.name != "index.json"
        ]
        if not json_files:
            return _stage_skip(6, "normalizer",
                               f"No JSON files in {VALIDATED_DIR}")

        log.info("  Found %d file(s) to normalize", len(json_files))
        results = normalize_all(VALIDATED_DIR, NORMALIZED_DIR)

        ok      = sum(1 for r in results if r.status == "ok")
        skipped = sum(1 for r in results if r.status == "skipped")
        failed  = sum(1 for r in results if r.status == "failed")
        changes = sum(len(r.changes) for r in results if r.status == "ok")

        return _stage_ok(6, "normalizer",
                         items_in=len(results),
                         items_out=ok,
                         items_fail=failed,
                         duration_s=time.monotonic() - t0,
                         notes=[f"{changes} field normalizations applied",
                                f"{skipped} skipped"])

    except Exception as exc:
        return _stage_fail(6, "normalizer", traceback.format_exc(),
                           time.monotonic() - t0)


# ---------------------------------------------------------------------------
# Final output — assemble schemes.json
# ---------------------------------------------------------------------------

def assemble_schemes_json() -> tuple[int, list[str]]:
    """
    Read every *.json in normalized/ and collect the normalized_data dicts
    into a single array. Writes backend/data/schemes.json.

    Returns (count_written, list_of_warnings).
    """
    json_files = sorted(
        p for p in NORMALIZED_DIR.glob("*.json")
        if p.name != "index.json"
    )

    schemes: list[dict] = []
    warnings: list[str] = []

    for jf in json_files:
        try:
            raw = json.loads(jf.read_text(encoding="utf-8"))
        except Exception as exc:
            warnings.append(f"Cannot read {jf.name}: {exc}")
            continue

        # Unwrap NormalizeResult wrapper if present
        data = raw.get("normalized_data") if isinstance(raw, dict) else None
        if data is None:
            # Bare scheme dict
            data = raw if isinstance(raw, dict) else None

        if not data or not isinstance(data, dict):
            warnings.append(f"No normalized_data in {jf.name} — skipped")
            continue

        # Attach provenance metadata
        data["_source"]       = jf.stem
        data["_pipeline_run"] = _ts
        schemes.append(data)

    SCHEMES_JSON.write_text(
        json.dumps(schemes, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    log.info("  📦  schemes.json → %d scheme(s) written to %s",
             len(schemes), SCHEMES_JSON)
    return len(schemes), warnings


# ---------------------------------------------------------------------------
# Run summary
# ---------------------------------------------------------------------------

def _save_run_summary(run: PipelineRun) -> None:
    RUN_SUMMARY.write_text(
        json.dumps(asdict(run), indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def _print_run_summary(run: PipelineRun) -> None:
    total_s = sum(s.duration_s for s in run.stages)
    print("\n" + "=" * 66)
    print("PIPELINE RUN SUMMARY")
    print("=" * 66)
    print(f"  Run ID   : {run.run_id}")
    print(f"  Status   : {run.status.upper()}")
    print(f"  Duration : {total_s:.1f}s")
    print(f"  Schemes  : {run.schemes_out}")
    print(f"  Log      : {run.log_file}")
    print()
    print(f"  {'STAGE':<4} {'NAME':<18} {'STATUS':<10} {'IN':>5} {'OUT':>5} {'FAIL':>5} {'TIME':>7}")
    print(f"  {'-'*4} {'-'*18} {'-'*10} {'-'*5} {'-'*5} {'-'*5} {'-'*7}")
    for s in run.stages:
        icon = {"ok": "✅", "partial": "⚠ ", "skipped": "⏭ ",
                "failed": "❌"}.get(s.status, "  ")
        print(f"  {s.stage:<4} {s.name:<18} {icon} {s.status:<8} "
              f"{s.items_in:>5} {s.items_out:>5} {s.items_fail:>5} "
              f"{s.duration_s:>6.1f}s")
        for note in s.notes:
            print(f"       ↳ {note}")
    print("=" * 66)


# ---------------------------------------------------------------------------
# Master run() function
# ---------------------------------------------------------------------------

def run_pipeline(
    from_stage:    int   = 1,
    skip_fetch:    bool  = False,
    skip_parse:    bool  = False,
    skip_extract:  bool  = False,
    source_filter: Optional[str]  = None,
    type_filter:   Optional[str]  = None,
    force_fetch:   bool  = False,
    fetch_delay:   float = 1.2,
    extract_model: str   = "",
    extract_delay: float = 1.0,
    strict_validate: bool = False,
    dry_run:       bool  = False,
) -> PipelineRun:
    """
    Run the full CivicAI ingestion pipeline.

    Parameters
    ----------
    from_stage      : start from this stage number (1-6); earlier stages skipped
    skip_fetch      : skip Stage 1 (use existing raw/ files)
    skip_parse      : skip Stage 2 (use existing parsed/ files)
    skip_extract    : skip Stage 4 (use existing extracted/ files)
    source_filter   : pass to fetcher (e.g. "pmjay")
    type_filter     : pass to fetcher ("pdf" or "html")
    force_fetch     : re-download even if cached
    fetch_delay     : seconds between fetcher requests
    extract_model   : Groq model ID override
    extract_delay   : seconds between LLM calls
    strict_validate : reject instead of auto-repairing in validator
    dry_run         : log what would run but perform no I/O
    """
    _load_env()

    run = PipelineRun(
        run_id     = _ts,
        started_at = datetime.now(timezone.utc).isoformat(),
        log_file   = str(LOG_FILE),
    )

    log.info("=" * 66)
    log.info("  CivicAI Ingestion Pipeline  —  run %s", _ts)
    log.info("  from_stage=%d  dry_run=%s", from_stage, dry_run)
    log.info("=" * 66)

    if dry_run:
        log.info("DRY RUN — no files will be written")
        for i, name in enumerate(
            ["fetcher", "pdf_parser", "text_cleaner",
             "extractor", "validator", "normalizer"], start=1
        ):
            skip = (i < from_stage
                    or (i == 1 and skip_fetch)
                    or (i == 2 and skip_parse)
                    or (i == 4 and skip_extract))
            log.info("  Stage %d  %-18s  %s", i, name,
                     "SKIP" if skip else "WOULD RUN")
        run.status = "ok"
        run.finished_at = datetime.now(timezone.utc).isoformat()
        return run

    # ── Stage 1: Fetch ───────────────────────────────────────────────────────
    if from_stage <= 1 and not skip_fetch:
        sr = run_stage1_fetch(source_filter, type_filter, force_fetch, fetch_delay)
        run.stages.append(sr)
        if sr.status == "failed":
            log.error("Pipeline aborted at Stage 1")
            run.status = "failed"
            run.error  = sr.error
            run.finished_at = datetime.now(timezone.utc).isoformat()
            _save_run_summary(run)
            return run
    else:
        run.stages.append(_stage_skip(1, "fetcher", "skipped by flag/from_stage"))

    # ── Stage 2: Parse PDFs ──────────────────────────────────────────────────
    if from_stage <= 2 and not skip_parse:
        sr = run_stage2_parse()
        run.stages.append(sr)
        if sr.status == "failed":
            log.error("Pipeline aborted at Stage 2")
            run.status = "failed"
            run.error  = sr.error
            run.finished_at = datetime.now(timezone.utc).isoformat()
            _save_run_summary(run)
            return run
    else:
        run.stages.append(_stage_skip(2, "pdf_parser", "skipped by flag/from_stage"))

    # ── Stage 3: Clean text ──────────────────────────────────────────────────
    if from_stage <= 3:
        sr = run_stage3_clean()
        run.stages.append(sr)
        if sr.status == "failed":
            log.error("Pipeline aborted at Stage 3")
            run.status = "failed"
            run.error  = sr.error
            run.finished_at = datetime.now(timezone.utc).isoformat()
            _save_run_summary(run)
            return run
    else:
        run.stages.append(_stage_skip(3, "text_cleaner", "skipped by from_stage"))

    # ── Stage 4: LLM Extract ─────────────────────────────────────────────────
    if from_stage <= 4 and not skip_extract:
        sr = run_stage4_extract(extract_model, extract_delay)
        run.stages.append(sr)
        if sr.status == "failed":
            log.error("Pipeline aborted at Stage 4")
            run.status = "failed"
            run.error  = sr.error
            run.finished_at = datetime.now(timezone.utc).isoformat()
            _save_run_summary(run)
            return run
    else:
        run.stages.append(_stage_skip(4, "extractor", "skipped by flag/from_stage"))

    # ── Stage 5: Validate ────────────────────────────────────────────────────
    if from_stage <= 5:
        sr = run_stage5_validate(strict_validate)
        run.stages.append(sr)
        if sr.status == "failed":
            log.error("Pipeline aborted at Stage 5")
            run.status = "failed"
            run.error  = sr.error
            run.finished_at = datetime.now(timezone.utc).isoformat()
            _save_run_summary(run)
            return run
    else:
        run.stages.append(_stage_skip(5, "validator", "skipped by from_stage"))

    # ── Stage 6: Normalize ───────────────────────────────────────────────────
    if from_stage <= 6:
        sr = run_stage6_normalize()
        run.stages.append(sr)
        if sr.status == "failed":
            log.error("Pipeline aborted at Stage 6")
            run.status = "failed"
            run.error  = sr.error
            run.finished_at = datetime.now(timezone.utc).isoformat()
            _save_run_summary(run)
            return run
    else:
        run.stages.append(_stage_skip(6, "normalizer", "skipped by from_stage"))

    # ── Assemble final schemes.json ──────────────────────────────────────────
    _banner(0, "Assembling schemes.json")
    try:
        count, warnings = assemble_schemes_json()
        run.schemes_out = count
        for w in warnings:
            log.warning("  ⚠  %s", w)
    except Exception as exc:
        log.error("  ❌  Failed to assemble schemes.json: %s", exc)
        run.status = "partial"
        run.error  = str(exc)
    else:
        any_failed = any(s.status == "failed" for s in run.stages)
        any_partial = any(s.status == "partial" for s in run.stages)
        run.status = "failed" if any_failed else ("partial" if any_partial else "ok")

    run.finished_at = datetime.now(timezone.utc).isoformat()
    _save_run_summary(run)
    _print_run_summary(run)
    return run


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="CivicAI – Full AI ingestion pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )

    # Stage control
    g = parser.add_argument_group("Stage control")
    g.add_argument("--from-stage", type=int, default=1, metavar="N",
                   help="Start from stage N (1-6); earlier stages are skipped")
    g.add_argument("--skip-fetch",   action="store_true",
                   help="Skip Stage 1 (use existing raw/ files)")
    g.add_argument("--skip-parse",   action="store_true",
                   help="Skip Stage 2 (use existing parsed/ files)")
    g.add_argument("--skip-extract", action="store_true",
                   help="Skip Stage 4 (use existing extracted/ files)")

    # Fetcher options
    g2 = parser.add_argument_group("Fetcher options (Stage 1)")
    g2.add_argument("--source", type=str, default=None,
                    help="Fetch only targets matching this key prefix (e.g. pmjay)")
    g2.add_argument("--type", choices=["pdf", "html"], default=None,
                    help="Fetch only this content type")
    g2.add_argument("--force-fetch", action="store_true",
                    help="Re-download even if files are already cached")
    g2.add_argument("--fetch-delay", type=float, default=1.2,
                    help="Seconds between fetcher requests (default: 1.2)")

    # Extractor options
    g3 = parser.add_argument_group("Extractor options (Stage 4)")
    g3.add_argument("--model", type=str, default="",
                    help="Groq model ID override (default: llama-3.1-8b-instant)")
    g3.add_argument("--extract-delay", type=float, default=1.0,
                    help="Seconds between LLM calls (default: 1.0)")

    # Validator options
    g4 = parser.add_argument_group("Validator options (Stage 5)")
    g4.add_argument("--strict", action="store_true",
                    help="Reject instead of auto-repairing invalid fields")

    # General
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would run without performing any I/O")

    return parser.parse_args()


def main() -> None:
    args = parse_args()

    run = run_pipeline(
        from_stage      = args.from_stage,
        skip_fetch      = args.skip_fetch,
        skip_parse      = args.skip_parse,
        skip_extract    = args.skip_extract,
        source_filter   = args.source,
        type_filter     = args.type,
        force_fetch     = args.force_fetch,
        fetch_delay     = args.fetch_delay,
        extract_model   = args.model,
        extract_delay   = args.extract_delay,
        strict_validate = args.strict,
        dry_run         = args.dry_run,
    )

    sys.exit(0 if run.status in ("ok", "partial") else 1)


if __name__ == "__main__":
    main()
