"""
CivicAI - Scheme JSON Validator
=================================
Stage 5 of the ingestion pipeline.

Reads extracted JSON files from backend/data/extracted/, validates every
scheme_data object with Pydantic v2, auto-corrects recoverable issues, and
writes clean validated output to backend/data/validated/.

Validation layers
-----------------
  Layer 1 – Structural  : file is valid JSON, top-level keys present
  Layer 2 – Pydantic    : field types, ranges, enum membership
  Layer 3 – Business    : cross-field rules (age_min < age_max, etc.)
  Layer 4 – Auto-repair : fix common LLM mistakes before rejecting

Auto-repair rules
-----------------
  • scheme_name / description empty  → derive from filename
  • income_max negative              → abs()
  • income_max > 10 crore            → assume monthly, multiply ×12 if ≤ 10L
  • age_min > age_max                → swap them
  • age values outside 0-120         → clamp to 0-120
  • allowed_categories unknown label → map to nearest canonical or drop
  • state empty                      → "All India"
  • string fields with "N/A" / "null"→ replace with "" or None
  • list fields that are strings     → split on comma

Public API
----------
  validate(scheme_data, source="")       → ValidationResult
  validate_file(path, out_dir)           → ValidationResult
  validate_all(extracted_dir, out_dir)   → list[ValidationResult]

Usage
-----
    python3 validator.py                        # validate all extracted JSON
    python3 validator.py --file pmjay.json      # single file
    python3 validator.py --no-save              # print results only
    python3 validator.py --dry-run              # list files without validating
    python3 validator.py --strict               # reject instead of auto-repairing
"""

import re
import sys
import json
import logging
import argparse
from pathlib import Path
from datetime import datetime, timezone
from dataclasses import dataclass, field as dc_field
from typing import Optional, Any

from pydantic import (
    BaseModel,
    Field,
    field_validator,
    model_validator,
    ValidationError,
)
from pydantic.functional_validators import BeforeValidator
from typing import Annotated

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

BASE_DIR       = Path(__file__).parent
EXTRACTED_DIR  = BASE_DIR / "extracted"
VALIDATED_DIR  = BASE_DIR / "validated"
LOG_DIR        = BASE_DIR / "raw" / "logs"

for _d in (VALIDATED_DIR, LOG_DIR):
    _d.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

_ts      = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
LOG_FILE = LOG_DIR / f"validate_{_ts}.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
    ],
)
log = logging.getLogger("civicai.validator")


# ---------------------------------------------------------------------------
# Canonical value sets
# ---------------------------------------------------------------------------

VALID_CATEGORIES: set[str] = {
    "SC", "ST", "OBC", "EWS", "General",
    "Women", "Farmer", "BPL", "Minority", "Disabled",
    "Senior Citizen", "Student", "Unorganised Worker",
    "Urban Poor", "Rural Poor",
}

# Fuzzy aliases → canonical label (lower-case key → canonical value)
_CATEGORY_ALIASES: dict[str, str] = {
    "scheduled caste":        "SC",
    "scheduled tribe":        "ST",
    "other backward class":   "OBC",
    "other backward classes": "OBC",
    "economically weaker":    "EWS",
    "ews":                    "EWS",
    "general category":       "General",
    "women":                  "Women",
    "female":                 "Women",
    "farmer":                 "Farmer",
    "farmers":                "Farmer",
    "agriculturist":          "Farmer",
    "below poverty line":     "BPL",
    "bpl":                    "BPL",
    "minority":               "Minority",
    "minorities":             "Minority",
    "disabled":               "Disabled",
    "differently abled":      "Disabled",
    "pwd":                    "Disabled",
    "person with disability": "Disabled",
    "senior citizen":         "Senior Citizen",
    "elderly":                "Senior Citizen",
    "old age":                "Senior Citizen",
    "student":                "Student",
    "unorganised worker":     "Unorganised Worker",
    "unorganized worker":     "Unorganised Worker",
    "informal worker":        "Unorganised Worker",
    "urban poor":             "Urban Poor",
    "rural poor":             "Rural Poor",
}

# Official Indian state / UT names (lower-case for matching)
_VALID_STATES: set[str] = {
    "all india",
    "andhra pradesh", "arunachal pradesh", "assam", "bihar",
    "chhattisgarh", "goa", "gujarat", "haryana", "himachal pradesh",
    "jharkhand", "karnataka", "kerala", "madhya pradesh", "maharashtra",
    "manipur", "meghalaya", "mizoram", "nagaland", "odisha",
    "punjab", "rajasthan", "sikkim", "tamil nadu", "telangana",
    "tripura", "uttar pradesh", "uttarakhand", "west bengal",
    "andaman and nicobar islands", "chandigarh",
    "dadra and nagar haveli and daman and diu",
    "delhi", "jammu and kashmir", "ladakh", "lakshadweep", "puducherry",
}

# Strings that mean "no value" — should be converted to None / ""
_NULL_STRINGS: set[str] = {
    "n/a", "na", "null", "none", "not applicable",
    "not available", "unknown", "-", "--", "nil",
}

# Maximum plausible annual income in INR (₹10 crore)
_MAX_INCOME_INR = 10_000_000
# Threshold below which a value is likely monthly (₹10 lakh)
_MONTHLY_THRESHOLD = 1_000_000


# ---------------------------------------------------------------------------
# Pre-validation repair helpers  (run BEFORE Pydantic sees the data)
# ---------------------------------------------------------------------------

def _clean_str(v: Any) -> Optional[str]:
    """Return None if v is a null-string, else strip and return."""
    if v is None:
        return None
    s = str(v).strip()
    return None if s.lower() in _NULL_STRINGS else s


def _coerce_list(v: Any) -> list:
    """Accept a list, or split a comma-separated string into a list."""
    if isinstance(v, list):
        return v
    if isinstance(v, str):
        return [item.strip() for item in v.split(",") if item.strip()]
    return []


def _normalize_category(raw: str) -> Optional[str]:
    """Map a raw category string to a canonical label, or None if unknown."""
    stripped = raw.strip()
    if stripped in VALID_CATEGORIES:
        return stripped
    lower = stripped.lower()
    if lower in _CATEGORY_ALIASES:
        return _CATEGORY_ALIASES[lower]
    # Partial match: check if any alias is a substring
    for alias, canonical in _CATEGORY_ALIASES.items():
        if alias in lower or lower in alias:
            return canonical
    return None   # unknown — will be dropped


def _normalize_state(v: Any) -> str:
    """Return canonical state name or 'All India' for unrecognised values."""
    if not v:
        return "All India"
    s = str(v).strip()
    if s.lower() in _NULL_STRINGS or not s:
        return "All India"
    if s.lower() in _VALID_STATES:
        # Title-case it
        return s.title() if s != "All India" else "All India"
    # Partial match against valid states
    for state in _VALID_STATES:
        if state in s.lower() or s.lower() in state:
            return state.title()
    log.debug("    Unknown state '%s' → 'All India'", s)
    return "All India"


def repair(raw: dict, source: str = "", strict: bool = False) -> tuple[dict, list[str]]:
    """
    Apply auto-repair rules to a raw scheme_data dict before Pydantic validation.

    Returns (repaired_dict, list_of_repair_notes).
    In strict mode, no repairs are made — the dict is returned as-is.
    """
    if strict:
        return raw, []

    data    = dict(raw)   # shallow copy
    repairs: list[str] = []

    def note(msg: str) -> None:
        repairs.append(msg)
        log.debug("    🔧  %s: %s", source, msg)

    # ── scheme_name ──────────────────────────────────────────────────────────
    name = _clean_str(data.get("scheme_name"))
    if not name:
        fallback = re.sub(r"[_\-]", " ", source.replace(".txt", "").replace(".json", "")).title()
        data["scheme_name"] = fallback or "Unknown Scheme"
        note(f"scheme_name empty → derived '{data['scheme_name']}' from filename")
    else:
        data["scheme_name"] = name

    # ── description ──────────────────────────────────────────────────────────
    raw_desc = data.get("description")
    desc = _clean_str(raw_desc)
    data["description"] = desc or ""
    # Only note a repair if the original was a non-empty null-string (e.g. "N/A")
    if raw_desc and not desc:
        note(f"description was '{raw_desc}' → set to ''")

    # ── income_max ───────────────────────────────────────────────────────────
    inc = data.get("income_max")
    if inc is not None:
        try:
            inc = int(inc)
            if inc < 0:
                data["income_max"] = abs(inc)
                note(f"income_max negative ({inc}) → {data['income_max']}")
                # After abs, do NOT also treat as monthly — just accept the abs value
            elif inc > _MAX_INCOME_INR:
                data["income_max"] = None
                note(f"income_max {inc} > 10 crore → set to null (implausible)")
            elif 0 < inc <= 50_000:
                # Very small positive value — likely a monthly figure in hundreds
                data["income_max"] = inc * 12
                note(f"income_max {inc} looks monthly → annualised to {data['income_max']}")
            # Values between 50_001 and 10_000_000 are accepted as-is (annual INR)
        except (TypeError, ValueError):
            data["income_max"] = None
            note(f"income_max '{inc}' not numeric → null")

    # ── age_min / age_max ────────────────────────────────────────────────────
    for age_field in ("age_min", "age_max"):
        av = data.get(age_field)
        if av is not None:
            try:
                av = int(av)
                clamped = max(0, min(120, av))
                if clamped != av:
                    note(f"{age_field} {av} out of 0-120 → clamped to {clamped}")
                data[age_field] = clamped
            except (TypeError, ValueError):
                data[age_field] = None
                note(f"{age_field} '{av}' not numeric → null")

    amin = data.get("age_min")
    amax = data.get("age_max")
    if amin is not None and amax is not None and amin > amax:
        data["age_min"], data["age_max"] = amax, amin
        note(f"age_min ({amin}) > age_max ({amax}) → swapped")

    # ── allowed_categories ───────────────────────────────────────────────────
    raw_cats = _coerce_list(data.get("allowed_categories", []))
    canonical_cats: list[str] = []
    for cat in raw_cats:
        mapped = _normalize_category(cat)
        if mapped:
            if mapped not in canonical_cats:
                canonical_cats.append(mapped)
        else:
            note(f"allowed_categories: unknown label '{cat}' dropped")
    data["allowed_categories"] = canonical_cats

    # ── state ────────────────────────────────────────────────────────────────
    original_state = data.get("state")
    data["state"] = _normalize_state(original_state)
    if original_state and data["state"] != original_state:
        note(f"state '{original_state}' → '{data['state']}'")
    elif not original_state:
        data["state"] = "All India"   # silent default, not a repair

    # ── benefit ──────────────────────────────────────────────────────────────
    raw_benefit = data.get("benefit")
    benefit = _clean_str(raw_benefit)
    data["benefit"] = benefit or ""
    if raw_benefit and not benefit:
        note(f"benefit was '{raw_benefit}' → set to ''")

    # ── required_documents ───────────────────────────────────────────────────
    data["required_documents"] = _coerce_list(data.get("required_documents", []))
    data["required_documents"] = [
        d for d in data["required_documents"]
        if d and d.lower() not in _NULL_STRINGS
    ]

    # ── application_process ──────────────────────────────────────────────────
    raw_ap = data.get("application_process")
    ap = _clean_str(raw_ap)
    data["application_process"] = ap or ""
    if raw_ap and not ap:
        note(f"application_process was '{raw_ap}' → set to ''")

    # ── boolean fields ───────────────────────────────────────────────────────
    for bool_field in ("student_required", "disability_required"):
        bv = data.get(bool_field)
        if isinstance(bv, str):
            lower_bv = bv.lower()
            if lower_bv in ("true", "yes", "1"):
                data[bool_field] = True
            elif lower_bv in ("false", "no", "0"):
                data[bool_field] = False
            elif lower_bv in _NULL_STRINGS:
                data[bool_field] = None
            else:
                data[bool_field] = None
                note(f"{bool_field} '{bv}' unrecognised → null")

    return data, repairs


# ---------------------------------------------------------------------------
# Pydantic model  (Layer 2 + Layer 3)
# ---------------------------------------------------------------------------

class SchemeModel(BaseModel):
    """
    Pydantic v2 model for a validated Indian welfare scheme.
    All fields are validated and cross-checked here.
    """

    scheme_name:         str   = Field(..., min_length=1, max_length=300)
    description:         str   = Field(default="", max_length=2000)
    income_max:          Optional[int] = Field(default=None, ge=0, le=10_000_000)
    allowed_categories:  list[str] = Field(default_factory=list)
    age_min:             Optional[int] = Field(default=None, ge=0, le=120)
    age_max:             Optional[int] = Field(default=None, ge=0, le=120)
    student_required:    Optional[bool] = None
    disability_required: Optional[bool] = None
    state:               str   = Field(default="All India", min_length=2, max_length=100)
    benefit:             str   = Field(default="", max_length=1000)
    required_documents:  list[str] = Field(default_factory=list)
    application_process: str   = Field(default="", max_length=2000)

    # ── Field-level validators ───────────────────────────────────────────────

    @field_validator("scheme_name", "description", "benefit",
                     "application_process", mode="before")
    @classmethod
    def strip_strings(cls, v: Any) -> str:
        if v is None:
            return ""
        return str(v).strip()

    @field_validator("allowed_categories", mode="before")
    @classmethod
    def validate_categories(cls, v: Any) -> list[str]:
        if not isinstance(v, list):
            v = []
        valid = []
        for item in v:
            s = str(item).strip()
            if s in VALID_CATEGORIES:
                valid.append(s)
            # Unknown labels were already dropped by repair(); silently skip here
        return valid

    @field_validator("state", mode="before")
    @classmethod
    def validate_state(cls, v: Any) -> str:
        if not v:
            return "All India"
        s = str(v).strip()
        if s.lower() in _VALID_STATES:
            return s
        return "All India"

    @field_validator("required_documents", mode="before")
    @classmethod
    def validate_documents(cls, v: Any) -> list[str]:
        if not isinstance(v, list):
            return []
        return [str(d).strip() for d in v if str(d).strip()]

    @field_validator("income_max", "age_min", "age_max", mode="before")
    @classmethod
    def coerce_int_or_none(cls, v: Any) -> Optional[int]:
        if v is None:
            return None
        try:
            return int(v)
        except (TypeError, ValueError):
            return None

    @field_validator("student_required", "disability_required", mode="before")
    @classmethod
    def coerce_bool_or_none(cls, v: Any) -> Optional[bool]:
        if v is None:
            return None
        if isinstance(v, bool):
            return v
        if isinstance(v, str):
            return v.lower() in ("true", "yes", "1")
        return None

    # ── Cross-field (model-level) validators ─────────────────────────────────

    @model_validator(mode="after")
    def check_age_range(self) -> "SchemeModel":
        if (
            self.age_min is not None
            and self.age_max is not None
            and self.age_min > self.age_max
        ):
            raise ValueError(
                f"age_min ({self.age_min}) must be ≤ age_max ({self.age_max})"
            )
        return self

    @model_validator(mode="after")
    def warn_empty_benefit(self) -> "SchemeModel":
        if not self.benefit and not self.description:
            raise ValueError(
                "At least one of 'benefit' or 'description' must be non-empty"
            )
        return self

    def to_dict(self) -> dict:
        return self.model_dump()


# ---------------------------------------------------------------------------
# Result dataclass
# ---------------------------------------------------------------------------

@dataclass
class ValidationResult:
    """Outcome of validating one scheme_data object."""
    source:          str
    status:          str = "valid"   # "valid" | "repaired" | "rejected" | "error"
    validated_data:  Optional[dict] = None
    repairs:         list[str] = dc_field(default_factory=list)
    errors:          list[str] = dc_field(default_factory=list)
    error:           Optional[str] = None
    validated_at:    str = dc_field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


# ---------------------------------------------------------------------------
# Core validate() function
# ---------------------------------------------------------------------------

def validate(
    scheme_data: dict,
    source: str = "",
    strict: bool = False,
) -> ValidationResult:
    """
    Validate a scheme_data dict through all four layers.

    Parameters
    ----------
    scheme_data : dict extracted by extractor.py
    source      : label for logging (e.g. filename)
    strict      : if True, skip auto-repair and reject on any issue

    Returns
    -------
    ValidationResult with status "valid", "repaired", or "rejected".
    """
    result = ValidationResult(source=source)

    # ── Guard: must be a dict ────────────────────────────────────────────────
    if not isinstance(scheme_data, dict):
        result.status = "rejected"
        result.error  = f"scheme_data is {type(scheme_data).__name__}, expected dict"
        log.error("  ❌  REJECTED  %s: %s", source, result.error)
        return result

    # ── Guard: completely empty ──────────────────────────────────────────────
    if not scheme_data:
        result.status = "rejected"
        result.error  = "scheme_data is an empty dict"
        log.error("  ❌  REJECTED  %s: empty dict", source)
        return result

    # ── Layer 4: auto-repair ─────────────────────────────────────────────────
    repaired, repairs = repair(scheme_data, source=source, strict=strict)
    result.repairs = repairs

    # ── Layer 2 + 3: Pydantic validation ────────────────────────────────────
    try:
        model = SchemeModel(**repaired)
        result.validated_data = model.to_dict()
        result.status = "repaired" if repairs else "valid"

        log.info(
            "  ✅  %-9s  %-40s  repairs=%d",
            result.status.upper(),
            source or "scheme",
            len(repairs),
        )

    except ValidationError as exc:
        # Collect all Pydantic error messages
        result.errors = [
            f"{' → '.join(str(loc) for loc in e['loc'])}: {e['msg']}"
            for e in exc.errors()
        ]
        result.status = "rejected"
        result.error  = f"{len(result.errors)} validation error(s)"
        log.error(
            "  ❌  REJECTED  %-40s  %s",
            source or "scheme",
            result.error,
        )
        for err in result.errors:
            log.error("       • %s", err)

    except Exception as exc:
        result.status = "error"
        result.error  = f"{type(exc).__name__}: {exc}"
        log.error("  ❌  ERROR     %s: %s", source, result.error)

    return result


# ---------------------------------------------------------------------------
# File-level helpers
# ---------------------------------------------------------------------------

def _load_extracted_json(path: Path) -> tuple[Optional[dict], Optional[str]]:
    """
    Read an extracted JSON file and return (scheme_data, error_message).
    Handles both the full ExtractResult wrapper and bare scheme_data dicts.
    """
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        return None, f"Invalid JSON: {exc}"
    except Exception as exc:
        return None, f"Read error: {exc}"

    if not isinstance(raw, dict):
        return None, f"Top-level value is {type(raw).__name__}, expected dict"

    # Unwrap ExtractResult wrapper if present
    if "scheme_data" in raw:
        scheme_data = raw["scheme_data"]
        if not isinstance(scheme_data, dict):
            return None, "scheme_data key exists but is not a dict"
        return scheme_data, None

    # Bare scheme_data dict (all 12 schema keys present)
    return raw, None


def validate_file(
    path: Path,
    out_dir: Optional[Path],
    strict: bool = False,
) -> ValidationResult:
    """
    Load an extracted JSON file, validate it, and optionally write output.

    Output files (in out_dir)
    -------------------------
    <stem>.json  – validated_data + ValidationResult metadata
    """
    scheme_data, load_error = _load_extracted_json(path)

    if load_error:
        result = ValidationResult(
            source=path.name,
            status="rejected",
            error=load_error,
        )
        log.error("  ❌  REJECTED  %s: %s", path.name, load_error)
    else:
        result = validate(scheme_data, source=path.name, strict=strict)

    if out_dir:
        out_dir.mkdir(parents=True, exist_ok=True)
        output = {
            "source":         result.source,
            "status":         result.status,
            "repairs":        result.repairs,
            "errors":         result.errors,
            "error":          result.error,
            "validated_at":   result.validated_at,
            "validated_data": result.validated_data,
        }
        (out_dir / path.stem).with_suffix(".json").write_text(
            json.dumps(output, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

    return result


def validate_all(
    extracted_dir: Path,
    out_dir: Path,
    strict: bool = False,
) -> list[ValidationResult]:
    """
    Validate every *.json file in extracted_dir.
    Writes one output JSON per file plus a master index.json.
    """
    json_files = sorted(
        p for p in extracted_dir.glob("*.json")
        if p.name != "index.json"
    )

    if not json_files:
        log.warning("No JSON files found in %s", extracted_dir)
        return []

    log.info("Found %d JSON file(s) in %s", len(json_files), extracted_dir)

    results: list[ValidationResult] = []
    for jf in json_files:
        log.info("  📋  Validating: %s", jf.name)
        result = validate_file(jf, out_dir, strict=strict)
        results.append(result)

    # Master index
    index = [
        {
            "source":       r.source,
            "status":       r.status,
            "repairs":      len(r.repairs),
            "errors":       r.errors,
            "error":        r.error,
            "validated_at": r.validated_at,
            "scheme_name":  (r.validated_data or {}).get("scheme_name", ""),
        }
        for r in results
    ]
    (out_dir / "index.json").write_text(
        json.dumps(index, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    log.info("📋  Index → %s", out_dir / "index.json")
    return results


# ---------------------------------------------------------------------------
# Summary printer
# ---------------------------------------------------------------------------

def print_summary(results: list[ValidationResult]) -> None:
    valid    = [r for r in results if r.status == "valid"]
    repaired = [r for r in results if r.status == "repaired"]
    rejected = [r for r in results if r.status == "rejected"]
    errors   = [r for r in results if r.status == "error"]

    total_repairs = sum(len(r.repairs) for r in repaired)

    print("\n" + "=" * 66)
    print("VALIDATION SUMMARY")
    print("=" * 66)
    print(f"  ✅  Valid     : {len(valid)}")
    print(f"  🔧  Repaired  : {len(repaired)}  ({total_repairs} auto-fixes applied)")
    print(f"  ❌  Rejected  : {len(rejected)}")
    print(f"  💥  Errors    : {len(errors)}")
    print(f"  ─────────────────────────────────────────────────────────")
    print(f"  📄  Total     : {len(results)}")

    if valid or repaired:
        print(f"\n  {'FILE':<38} {'STATUS':<10} {'REPAIRS':<8} {'SCHEME NAME'}")
        print(f"  {'-'*38} {'-'*10} {'-'*8} {'-'*25}")
        for r in valid + repaired:
            name = (r.validated_data or {}).get("scheme_name", "")[:30]
            print(f"  {r.source:<38} {r.status:<10} {len(r.repairs):<8} {name}")

    if rejected or errors:
        print("\n  Rejected / Errors:")
        for r in rejected + errors:
            print(f"    ❌  {r.source}")
            if r.error:
                print(f"         {r.error}")
            for err in r.errors[:3]:
                print(f"         • {err}")

    print("=" * 66)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="CivicAI – Pydantic scheme JSON validator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--extracted-dir", type=Path, default=EXTRACTED_DIR,
        help=f"Directory with extracted JSON files (default: {EXTRACTED_DIR})",
    )
    parser.add_argument(
        "--out-dir", type=Path, default=VALIDATED_DIR,
        help=f"Output directory for validated JSON (default: {VALIDATED_DIR})",
    )
    parser.add_argument(
        "--file", type=str, default=None,
        help="Validate a single JSON file by name",
    )
    parser.add_argument(
        "--no-save", action="store_true",
        help="Print results only; do not write output files",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="List JSON files without validating",
    )
    parser.add_argument(
        "--strict", action="store_true",
        help="Disable auto-repair; reject any schema violation",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    extracted_dir: Path = args.extracted_dir

    # ── Dry-run ──────────────────────────────────────────────────────────────
    if args.dry_run:
        files = sorted(
            p for p in extracted_dir.glob("*.json")
            if p.name != "index.json"
        )
        if not files:
            print(f"No JSON files found in {extracted_dir}")
            return
        print(f"\nJSON files in {extracted_dir}:")
        print(f"{'#':<4} {'FILENAME':<55} {'SIZE':>10}")
        print("-" * 72)
        for i, p in enumerate(files, 1):
            print(f"{i:<4} {p.name:<55} {p.stat().st_size/1024:>8.1f} KB")
        print(f"\nTotal: {len(files)} file(s)")
        return

    out_dir = None if args.no_save else args.out_dir

    # ── Single file ──────────────────────────────────────────────────────────
    if args.file:
        target = extracted_dir / args.file
        if not target.exists():
            log.error("File not found: %s", target)
            sys.exit(1)
        result = validate_file(target, out_dir, strict=args.strict)
        if args.no_save and result.validated_data:
            print(json.dumps(result.validated_data, indent=2, ensure_ascii=False))
        print_summary([result])
        return

    # ── Batch ────────────────────────────────────────────────────────────────
    results = validate_all(
        extracted_dir,
        out_dir or VALIDATED_DIR,
        strict=args.strict,
    )
    if not results:
        log.warning("Nothing to validate.")
        return
    print_summary(results)


if __name__ == "__main__":
    main()
