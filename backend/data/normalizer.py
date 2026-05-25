"""
CivicAI - Scheme Data Normalizer
==================================
Stage 6 (final) of the ingestion pipeline.

Reads validated JSON files from backend/data/validated/, applies deep
normalization to every field, and writes production-ready records to
backend/data/normalized/.

What this stage does that validator.py does NOT
-----------------------------------------------
  The validator ensures data is structurally correct and within bounds.
  The normalizer makes data *consistent and query-ready*:

  • Categories   – deduplicate, sort, expand abbreviations to full names
  • State names  – canonical casing, abbreviation expansion, UT handling
  • Documents    – title-case, deduplicate, remove noise words, sort
  • Income       – parse free-text strings ("₹2.5 lakh/year") → int INR
  • Strings      – strip excess whitespace, sentence-case descriptions,
                   remove trailing punctuation from list items
  • Booleans     – ensure true/false/null (never string)
  • Ages         – ensure int or null (never float or string)
  • Scheme name  – strip redundant suffixes, normalize brackets

Normalization functions (all pure, importable)
----------------------------------------------
  normalize_categories(raw)        → list[str]
  normalize_state(raw)             → str
  normalize_documents(raw)         → list[str]
  normalize_income_string(raw)     → int | None
  normalize_scheme_name(raw)       → str
  normalize_description(raw)       → str
  normalize_record(data, source)   → NormalizeResult

Public API
----------
  normalize(data, source="")            → NormalizeResult
  normalize_file(path, out_dir)         → NormalizeResult
  normalize_all(validated_dir, out_dir) → list[NormalizeResult]

Usage
-----
    python3 normalizer.py                        # normalize all validated JSON
    python3 normalizer.py --file pmjay.json      # single file
    python3 normalizer.py --no-save              # print result to stdout
    python3 normalizer.py --dry-run              # list files without processing
"""

import re
import sys
import json
import logging
import argparse
from pathlib import Path
from datetime import datetime, timezone
from dataclasses import dataclass, field, asdict
from typing import Optional, Any

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

BASE_DIR        = Path(__file__).parent
VALIDATED_DIR   = BASE_DIR / "validated"
NORMALIZED_DIR  = BASE_DIR / "normalized"
LOG_DIR         = BASE_DIR / "raw" / "logs"

for _d in (NORMALIZED_DIR, LOG_DIR):
    _d.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

_ts      = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
LOG_FILE = LOG_DIR / f"normalize_{_ts}.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
    ],
)
log = logging.getLogger("civicai.normalizer")

# ---------------------------------------------------------------------------
# Result dataclass
# ---------------------------------------------------------------------------

@dataclass
class NormalizeResult:
    """Outcome of normalizing one validated scheme record."""
    source:           str
    status:           str = "ok"      # "ok" | "skipped" | "failed"
    normalized_data:  Optional[dict] = None
    changes:          list[str] = field(default_factory=list)
    error:            Optional[str] = None
    normalized_at:    str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


# ===========================================================================
# 1. CATEGORY NORMALIZATION
# ===========================================================================

# Canonical labels with their full display names
CATEGORY_CANONICAL: dict[str, str] = {
    "SC":                  "Scheduled Caste (SC)",
    "ST":                  "Scheduled Tribe (ST)",
    "OBC":                 "Other Backward Classes (OBC)",
    "EWS":                 "Economically Weaker Section (EWS)",
    "General":             "General",
    "Women":               "Women",
    "Farmer":              "Farmer",
    "BPL":                 "Below Poverty Line (BPL)",
    "Minority":            "Minority",
    "Disabled":            "Persons with Disability (PwD)",
    "Senior Citizen":      "Senior Citizen (60+)",
    "Student":             "Student",
    "Unorganised Worker":  "Unorganised / Informal Worker",
    "Urban Poor":          "Urban Poor",
    "Rural Poor":          "Rural Poor",
}

# All aliases that map to a canonical short key
_CAT_ALIAS_TO_KEY: dict[str, str] = {
    # SC
    "sc": "SC", "scheduled caste": "SC", "scheduled castes": "SC",
    # ST
    "st": "ST", "scheduled tribe": "ST", "scheduled tribes": "ST",
    # OBC
    "obc": "OBC", "other backward class": "OBC", "other backward classes": "OBC",
    "other backward caste": "OBC",
    # EWS
    "ews": "EWS", "economically weaker section": "EWS",
    "economically weaker": "EWS",
    # General
    "general": "General", "general category": "General", "open category": "General",
    "unreserved": "General",
    # Women
    "women": "Women", "woman": "Women", "female": "Women", "females": "Women",
    "girl": "Women", "girls": "Women",
    # Farmer
    "farmer": "Farmer", "farmers": "Farmer", "agriculturist": "Farmer",
    "kisan": "Farmer", "agricultural worker": "Farmer",
    # BPL
    "bpl": "BPL", "below poverty line": "BPL", "apl": "BPL",
    # Minority
    "minority": "Minority", "minorities": "Minority",
    # Disabled
    "disabled": "Disabled", "differently abled": "Disabled",
    "pwd": "Disabled", "person with disability": "Disabled",
    "persons with disability": "Disabled", "handicapped": "Disabled",
    "divyangjan": "Disabled",
    # Senior Citizen
    "senior citizen": "Senior Citizen", "senior citizens": "Senior Citizen",
    "elderly": "Senior Citizen", "old age": "Senior Citizen",
    "aged": "Senior Citizen",
    # Student
    "student": "Student", "students": "Student",
    # Unorganised Worker
    "unorganised worker": "Unorganised Worker",
    "unorganized worker": "Unorganised Worker",
    "informal worker": "Unorganised Worker",
    "informal sector": "Unorganised Worker",
    "daily wage worker": "Unorganised Worker",
    # Urban Poor
    "urban poor": "Urban Poor", "urban slum": "Urban Poor",
    # Rural Poor
    "rural poor": "Rural Poor", "rural household": "Rural Poor",
}


def normalize_categories(raw: Any) -> list[str]:
    """
    Accept a list (or comma-string) of category labels.
    Returns a sorted, deduplicated list of canonical full names.

    Unknown labels are silently dropped.
    """
    if isinstance(raw, str):
        items = [s.strip() for s in raw.split(",") if s.strip()]
    elif isinstance(raw, list):
        items = [str(s).strip() for s in raw if str(s).strip()]
    else:
        return []

    seen: set[str] = set()
    result: list[str] = []

    for item in items:
        key = _CAT_ALIAS_TO_KEY.get(item.lower())
        if key is None:
            # Try partial match
            lower = item.lower()
            for alias, k in _CAT_ALIAS_TO_KEY.items():
                if alias in lower or lower in alias:
                    key = k
                    break
        if key and key not in seen:
            seen.add(key)
            result.append(CATEGORY_CANONICAL[key])

    return sorted(result)


# ===========================================================================
# 2. STATE NORMALIZATION
# ===========================================================================

# Official canonical state/UT names (Title Case)
_STATE_CANONICAL: dict[str, str] = {
    "all india":                                    "All India",
    "andhra pradesh":                               "Andhra Pradesh",
    "arunachal pradesh":                            "Arunachal Pradesh",
    "assam":                                        "Assam",
    "bihar":                                        "Bihar",
    "chhattisgarh":                                 "Chhattisgarh",
    "goa":                                          "Goa",
    "gujarat":                                      "Gujarat",
    "haryana":                                      "Haryana",
    "himachal pradesh":                             "Himachal Pradesh",
    "jharkhand":                                    "Jharkhand",
    "karnataka":                                    "Karnataka",
    "kerala":                                       "Kerala",
    "madhya pradesh":                               "Madhya Pradesh",
    "maharashtra":                                  "Maharashtra",
    "manipur":                                      "Manipur",
    "meghalaya":                                    "Meghalaya",
    "mizoram":                                      "Mizoram",
    "nagaland":                                     "Nagaland",
    "odisha":                                       "Odisha",
    "punjab":                                       "Punjab",
    "rajasthan":                                    "Rajasthan",
    "sikkim":                                       "Sikkim",
    "tamil nadu":                                   "Tamil Nadu",
    "telangana":                                    "Telangana",
    "tripura":                                      "Tripura",
    "uttar pradesh":                                "Uttar Pradesh",
    "uttarakhand":                                  "Uttarakhand",
    "west bengal":                                  "West Bengal",
    # Union Territories
    "andaman and nicobar islands":                  "Andaman and Nicobar Islands",
    "andaman & nicobar islands":                    "Andaman and Nicobar Islands",
    "chandigarh":                                   "Chandigarh",
    "dadra and nagar haveli and daman and diu":     "Dadra and Nagar Haveli and Daman and Diu",
    "dadra & nagar haveli":                         "Dadra and Nagar Haveli and Daman and Diu",
    "daman and diu":                                "Dadra and Nagar Haveli and Daman and Diu",
    "delhi":                                        "Delhi (NCT)",
    "nct of delhi":                                 "Delhi (NCT)",
    "new delhi":                                    "Delhi (NCT)",
    "jammu and kashmir":                            "Jammu and Kashmir",
    "jammu & kashmir":                              "Jammu and Kashmir",
    "j&k":                                          "Jammu and Kashmir",
    "ladakh":                                       "Ladakh",
    "lakshadweep":                                  "Lakshadweep",
    "puducherry":                                   "Puducherry",
    "pondicherry":                                  "Puducherry",
    # Common abbreviations
    "ap":  "Andhra Pradesh",
    "up":  "Uttar Pradesh",
    "mp":  "Madhya Pradesh",
    "hp":  "Himachal Pradesh",
    "wb":  "West Bengal",
    "tn":  "Tamil Nadu",
    "mh":  "Maharashtra",
    "ka":  "Karnataka",
    "kl":  "Kerala",
    "rj":  "Rajasthan",
    "gj":  "Gujarat",
    "pb":  "Punjab",
    "hr":  "Haryana",
    "br":  "Bihar",
    "jh":  "Jharkhand",
    "or":  "Odisha",
    "cg":  "Chhattisgarh",
    "uk":  "Uttarakhand",
    "ts":  "Telangana",
    "as":  "Assam",
    "mn":  "Manipur",
    "ml":  "Meghalaya",
    "mz":  "Mizoram",
    "nl":  "Nagaland",
    "tr":  "Tripura",
    "sk":  "Sikkim",
    "ar":  "Arunachal Pradesh",
    "ga":  "Goa",
}

# Null-like strings that mean "All India"
_STATE_NULL = {"n/a", "na", "null", "none", "not applicable", "pan india",
               "nationwide", "national", "central", "india", "all states",
               "all over india", "entire india", "whole india", "-", ""}


def normalize_state(raw: Any) -> str:
    """
    Return the canonical state/UT name, or 'All India' for central schemes.
    Handles abbreviations, alternate spellings, and null-like values.
    """
    if raw is None:
        return "All India"

    s = str(raw).strip()
    lower = s.lower()

    if lower in _STATE_NULL:
        return "All India"

    # Exact match
    if lower in _STATE_CANONICAL:
        return _STATE_CANONICAL[lower]

    # Partial / substring match
    for key, canonical in _STATE_CANONICAL.items():
        if key in lower or lower in key:
            return canonical

    log.debug("    Unknown state '%s' → 'All India'", s)
    return "All India"


# ===========================================================================
# 3. DOCUMENT NORMALIZATION
# ===========================================================================

# Canonical document names (lower-case key → display name)
_DOC_CANONICAL: dict[str, str] = {
    "aadhaar":                      "Aadhaar Card",
    "aadhaar card":                 "Aadhaar Card",
    "aadhar":                       "Aadhaar Card",
    "aadhar card":                  "Aadhaar Card",
    "uid":                          "Aadhaar Card",
    "uidai":                        "Aadhaar Card",
    "pan":                          "PAN Card",
    "pan card":                     "PAN Card",
    "permanent account number":     "PAN Card",
    "ration card":                  "Ration Card",
    "bpl card":                     "BPL / Ration Card",
    "bpl ration card":              "BPL / Ration Card",
    "income certificate":           "Income Certificate",
    "income proof":                 "Income Certificate",
    "proof of income":              "Income Certificate",
    "salary slip":                  "Salary Slip",
    "salary certificate":           "Salary Slip",
    "bank passbook":                "Bank Passbook / Account Details",
    "bank account":                 "Bank Passbook / Account Details",
    "bank account details":         "Bank Passbook / Account Details",
    "cancelled cheque":             "Cancelled Cheque",
    "birth certificate":            "Birth Certificate",
    "age proof":                    "Age Proof (Birth Certificate / School Certificate)",
    "school certificate":           "Age Proof (Birth Certificate / School Certificate)",
    "caste certificate":            "Caste Certificate",
    "sc certificate":               "Caste Certificate",
    "st certificate":               "Caste Certificate",
    "obc certificate":              "Caste Certificate",
    "community certificate":        "Caste Certificate",
    "disability certificate":       "Disability Certificate",
    "pwd certificate":              "Disability Certificate",
    "medical certificate":          "Medical Certificate",
    "domicile certificate":         "Domicile / Residence Certificate",
    "residence certificate":        "Domicile / Residence Certificate",
    "proof of residence":           "Domicile / Residence Certificate",
    "address proof":                "Address Proof",
    "voter id":                     "Voter ID Card",
    "voter id card":                "Voter ID Card",
    "voter card":                   "Voter ID Card",
    "epic":                         "Voter ID Card",
    "passport":                     "Passport",
    "driving licence":              "Driving Licence",
    "driving license":              "Driving Licence",
    "land records":                 "Land Records / Khasra-Khatauni",
    "khasra":                       "Land Records / Khasra-Khatauni",
    "khatauni":                     "Land Records / Khasra-Khatauni",
    "secc":                         "SECC 2011 Registration Proof",
    "secc registration":            "SECC 2011 Registration Proof",
    "secc 2011":                    "SECC 2011 Registration Proof",
    "job card":                     "MGNREGA Job Card",
    "mgnrega job card":             "MGNREGA Job Card",
    "nrega job card":               "MGNREGA Job Card",
    "self declaration":             "Self-Declaration Affidavit",
    "affidavit":                    "Self-Declaration Affidavit",
    "photograph":                   "Passport-Size Photograph",
    "passport size photo":          "Passport-Size Photograph",
    "passport-size photograph":     "Passport-Size Photograph",
    "photo":                        "Passport-Size Photograph",
    "mobile number":                "Registered Mobile Number",
    "mobile":                       "Registered Mobile Number",
    "email":                        "Email Address",
}

# Noise words to strip from document strings before matching
_DOC_NOISE = re.compile(
    r"\b(valid|original|attested|self.attested|copy|copies|recent|current"
    r"|latest|duly|signed|notarized|notarised|certified|true)\b",
    re.IGNORECASE,
)

# Trailing punctuation / noise
_DOC_TRAIL = re.compile(r"[,;.\-–—]+$")


def _clean_doc_item(raw: str) -> str:
    """Strip noise words and trailing punctuation from a document string."""
    s = _DOC_NOISE.sub("", raw).strip()
    s = _DOC_TRAIL.sub("", s).strip()
    # Collapse multiple spaces
    s = re.sub(r"\s{2,}", " ", s)
    return s


def normalize_documents(raw: Any) -> list[str]:
    """
    Accept a list (or comma-string) of document names.
    Returns a sorted, deduplicated list of canonical document names.

    Unknown documents are title-cased and kept as-is (not dropped).
    """
    if isinstance(raw, str):
        items = [s.strip() for s in re.split(r"[,;]", raw) if s.strip()]
    elif isinstance(raw, list):
        items = [str(s).strip() for s in raw if str(s).strip()]
    else:
        return []

    seen: set[str] = set()
    result: list[str] = []

    for item in items:
        cleaned = _clean_doc_item(item)
        if not cleaned:
            continue

        lower = cleaned.lower()

        # Exact match in canonical map
        canonical = _DOC_CANONICAL.get(lower)

        if canonical is None:
            # Partial match: key must appear as a whole word in the item,
            # or the item must be a whole word within the key.
            # Use word-boundary regex to avoid "pan" matching "panchayat".
            for key, val in _DOC_CANONICAL.items():
                key_words = set(key.split())
                lower_words = set(lower.split())
                # Match only if there is significant word overlap (≥ 2 words or exact single word)
                overlap = key_words & lower_words
                if overlap and (len(overlap) >= 2 or (len(key_words) == 1 and key_words == lower_words)):
                    canonical = val
                    break

        if canonical is None:
            # Unknown document — title-case and keep
            canonical = cleaned.title()

        if canonical not in seen:
            seen.add(canonical)
            result.append(canonical)

    return sorted(result)


# ===========================================================================
# 4. INCOME STRING → INTEGER NORMALIZATION
# ===========================================================================

# Unit multipliers
_UNIT_MAP: dict[str, int] = {
    "crore":   10_000_000,
    "cr":      10_000_000,
    "lakh":    100_000,
    "lac":     100_000,
    "l":       100_000,
    "thousand": 1_000,
    "k":        1_000,
}

# Regex: optional ₹/Rs., number (int or decimal), optional unit, optional /year|/month
_INCOME_RE = re.compile(
    r"(?:rs\.?|₹|inr)?\s*"          # optional currency symbol
    r"([\d,]+(?:\.\d+)?)"            # number (with optional commas / decimal)
    r"\s*"
    r"(crore|cr|lakh|lac|l|thousand|k)?"  # optional unit
    r"(?:\s*(?:per|/)\s*(year|yr|annum|pa|month|mo|pm))?",  # optional period
    re.IGNORECASE,
)

# Null-like strings
_INCOME_NULL = {"n/a", "na", "null", "none", "not applicable", "no limit",
                "no income limit", "unlimited", "-", ""}


def normalize_income_string(raw: Any) -> Optional[int]:
    """
    Convert an income string to an annual integer in INR.

    Examples
    --------
    "₹2.5 lakh/year"   → 250000
    "Rs. 3,00,000"     → 300000
    "2 lakh per month" → 2400000
    "50000"            → 50000   (assumed annual if > 50k, else ×12)
    "No limit"         → None
    250000             → 250000  (int passthrough)
    None               → None
    """
    # Already an integer
    if isinstance(raw, int):
        if raw <= 0:
            return None
        if raw > 10_000_000:
            return None
        # Heuristic: values ≤ 50,000 are likely monthly
        if raw <= 50_000:
            return raw * 12
        return raw

    # Float → round to int
    if isinstance(raw, float):
        return int(raw) if 0 < raw <= 10_000_000 else None

    if raw is None:
        return None

    s = str(raw).strip()

    if s.lower() in _INCOME_NULL:
        return None

    # Try direct integer parse first (handles "250000", "2,50,000")
    plain = s.replace(",", "").replace("₹", "").replace("Rs.", "").replace("INR", "").strip()
    try:
        val = int(float(plain))
        # Heuristic: values ≤ 50,000 are likely monthly
        if val <= 50_000:
            return val * 12
        return val if val <= 10_000_000 else None
    except ValueError:
        pass

    # Regex parse for "2.5 lakh/year", "₹3 crore", etc.
    m = _INCOME_RE.search(s)
    if not m:
        log.debug("    Cannot parse income string: '%s'", s)
        return None

    number_str = m.group(1).replace(",", "")
    unit_str   = (m.group(2) or "").lower()
    period_str = (m.group(3) or "").lower()

    try:
        number = float(number_str)
    except ValueError:
        return None

    # Apply unit multiplier
    multiplier = _UNIT_MAP.get(unit_str, 1)
    annual_inr = number * multiplier

    # Convert monthly to annual
    if period_str in ("month", "mo", "pm"):
        annual_inr *= 12

    result = int(round(annual_inr))

    # Sanity check
    if result <= 0 or result > 10_000_000:
        log.debug("    Income '%s' → %d out of range → None", s, result)
        return None

    return result


# ===========================================================================
# 5. STRING FIELD NORMALIZATION
# ===========================================================================

# Redundant suffixes often appended to scheme names by LLMs
_NAME_SUFFIXES = re.compile(
    r"\s*[-–—]\s*(scheme|yojana|programme|program|project|initiative)$",
    re.IGNORECASE,
)

# Normalize brackets: "PM-JAY ( Ayushman Bharat )" → "PM-JAY (Ayushman Bharat)"
_BRACKET_SPACE = re.compile(r"\(\s+|\s+\)")


def normalize_scheme_name(raw: Any) -> str:
    """
    Clean a scheme name:
    - Strip leading/trailing whitespace
    - Normalize bracket spacing
    - Remove redundant trailing suffixes
    - Collapse internal whitespace
    """
    if not raw:
        return ""
    s = str(raw).strip()
    s = _BRACKET_SPACE.sub(lambda m: "(" if "(" in m.group() else ")", s)
    s = _NAME_SUFFIXES.sub("", s).strip()
    s = re.sub(r"\s{2,}", " ", s)
    return s


def normalize_description(raw: Any) -> str:
    """
    Clean a description string:
    - Strip whitespace
    - Ensure it ends with a period
    - Collapse internal whitespace / newlines to single spaces
    - Sentence-case the first character
    """
    if not raw:
        return ""
    s = str(raw).strip()
    # Collapse newlines and multiple spaces
    s = re.sub(r"[\r\n]+", " ", s)
    s = re.sub(r"\s{2,}", " ", s)
    # Sentence-case first character
    if s and s[0].islower():
        s = s[0].upper() + s[1:]
    # Ensure ends with period
    if s and s[-1] not in ".!?":
        s += "."
    return s


def _normalize_free_text(raw: Any, max_len: int = 2000) -> str:
    """Generic free-text normalizer for benefit / application_process."""
    if not raw:
        return ""
    s = str(raw).strip()
    s = re.sub(r"[\r\n]+", " ", s)
    s = re.sub(r"\s{2,}", " ", s)
    return s[:max_len]


# ===========================================================================
# 6. MASTER normalize() FUNCTION
# ===========================================================================

def normalize(data: dict, source: str = "") -> NormalizeResult:
    """
    Apply all normalization passes to a validated scheme_data dict.

    Parameters
    ----------
    data   : validated_data dict from ValidationResult
    source : label for logging (e.g. filename)

    Returns
    -------
    NormalizeResult with normalized_data and a list of changes made.
    """
    result = NormalizeResult(source=source)

    if not isinstance(data, dict) or not data:
        result.status = "skipped"
        result.error  = "Input is not a non-empty dict"
        log.warning("  ⚠  SKIPPED  %s: %s", source, result.error)
        return result

    out: dict = {}
    changes: list[str] = []

    def record(field: str, before: Any, after: Any) -> None:
        if before != after:
            changes.append(f"{field}: {before!r} → {after!r}")

    try:
        # ── scheme_name ──────────────────────────────────────────────────────
        raw_name = data.get("scheme_name", "")
        norm_name = normalize_scheme_name(raw_name)
        record("scheme_name", raw_name, norm_name)
        out["scheme_name"] = norm_name

        # ── description ──────────────────────────────────────────────────────
        raw_desc = data.get("description", "")
        norm_desc = normalize_description(raw_desc)
        record("description", raw_desc, norm_desc)
        out["description"] = norm_desc

        # ── income_max ───────────────────────────────────────────────────────
        raw_inc = data.get("income_max")
        norm_inc = normalize_income_string(raw_inc)
        record("income_max", raw_inc, norm_inc)
        out["income_max"] = norm_inc

        # ── allowed_categories ───────────────────────────────────────────────
        raw_cats = data.get("allowed_categories", [])
        norm_cats = normalize_categories(raw_cats)
        record("allowed_categories", raw_cats, norm_cats)
        out["allowed_categories"] = norm_cats

        # ── age_min / age_max ────────────────────────────────────────────────
        for age_field in ("age_min", "age_max"):
            raw_age = data.get(age_field)
            if raw_age is None:
                out[age_field] = None
            else:
                try:
                    norm_age = int(raw_age)
                    norm_age = max(0, min(120, norm_age))
                except (TypeError, ValueError):
                    norm_age = None
                record(age_field, raw_age, norm_age)
                out[age_field] = norm_age

        # ── boolean fields ───────────────────────────────────────────────────
        for bool_field in ("student_required", "disability_required"):
            raw_bool = data.get(bool_field)
            if isinstance(raw_bool, bool) or raw_bool is None:
                out[bool_field] = raw_bool
            elif isinstance(raw_bool, str):
                norm_bool = raw_bool.lower() in ("true", "yes", "1")
                record(bool_field, raw_bool, norm_bool)
                out[bool_field] = norm_bool
            else:
                out[bool_field] = None

        # ── state ────────────────────────────────────────────────────────────
        raw_state = data.get("state", "All India")
        norm_state = normalize_state(raw_state)
        record("state", raw_state, norm_state)
        out["state"] = norm_state

        # ── benefit ──────────────────────────────────────────────────────────
        out["benefit"] = _normalize_free_text(data.get("benefit", ""), max_len=1000)

        # ── required_documents ───────────────────────────────────────────────
        raw_docs = data.get("required_documents", [])
        norm_docs = normalize_documents(raw_docs)
        record("required_documents", raw_docs, norm_docs)
        out["required_documents"] = norm_docs

        # ── application_process ──────────────────────────────────────────────
        out["application_process"] = _normalize_free_text(
            data.get("application_process", ""), max_len=2000
        )

    except Exception as exc:
        result.status = "failed"
        result.error  = f"{type(exc).__name__}: {exc}"
        log.error("  ❌  FAILED  %s: %s", source, result.error)
        return result

    result.normalized_data = out
    result.changes         = changes
    result.status          = "ok"

    log.info(
        "  ✅  %-42s  changes=%d",
        source or "record",
        len(changes),
    )
    return result


# ===========================================================================
# 7. FILE-LEVEL HELPERS
# ===========================================================================

def _load_validated_json(path: Path) -> tuple[Optional[dict], Optional[str]]:
    """
    Read a validated JSON file and return (validated_data, error_message).
    Handles both the full ValidationResult wrapper and bare scheme dicts.
    """
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        return None, f"Invalid JSON: {exc}"
    except Exception as exc:
        return None, f"Read error: {exc}"

    if not isinstance(raw, dict):
        return None, f"Top-level value is {type(raw).__name__}, expected dict"

    # Unwrap ValidationResult wrapper if present
    if "validated_data" in raw:
        vd = raw["validated_data"]
        if vd is None:
            return None, f"validated_data is null (status={raw.get('status')})"
        if not isinstance(vd, dict):
            return None, "validated_data is not a dict"
        return vd, None

    # Bare scheme dict — use directly
    return raw, None


def normalize_file(path: Path, out_dir: Optional[Path]) -> NormalizeResult:
    """
    Load a validated JSON file, normalize it, and optionally write output.

    Output files (in out_dir)
    -------------------------
    <stem>.json  – normalized_data + NormalizeResult metadata
    """
    validated_data, load_error = _load_validated_json(path)

    if load_error:
        result = NormalizeResult(
            source=path.name,
            status="failed",
            error=load_error,
        )
        log.error("  ❌  FAILED  %s: %s", path.name, load_error)
    else:
        result = normalize(validated_data, source=path.name)

    if out_dir and result.normalized_data is not None:
        out_dir.mkdir(parents=True, exist_ok=True)
        output = {
            "source":          result.source,
            "status":          result.status,
            "changes":         result.changes,
            "error":           result.error,
            "normalized_at":   result.normalized_at,
            "normalized_data": result.normalized_data,
        }
        (out_dir / path.stem).with_suffix(".json").write_text(
            json.dumps(output, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

    return result


def normalize_all(
    validated_dir: Path,
    out_dir: Path,
) -> list[NormalizeResult]:
    """
    Normalize every *.json file in validated_dir.
    Writes one output JSON per file plus a master index.json.
    """
    json_files = sorted(
        p for p in validated_dir.glob("*.json")
        if p.name != "index.json"
    )

    if not json_files:
        log.warning("No JSON files found in %s", validated_dir)
        return []

    log.info("Found %d JSON file(s) in %s", len(json_files), validated_dir)

    results: list[NormalizeResult] = []
    for jf in json_files:
        log.info("  📋  Normalizing: %s", jf.name)
        result = normalize_file(jf, out_dir)
        results.append(result)

    # Master index
    index = [
        {
            "source":        r.source,
            "status":        r.status,
            "changes":       len(r.changes),
            "error":         r.error,
            "normalized_at": r.normalized_at,
            "scheme_name":   (r.normalized_data or {}).get("scheme_name", ""),
        }
        for r in results
    ]
    index_path = out_dir / "index.json"
    index_path.write_text(
        json.dumps(index, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    log.info("📋  Index → %s", index_path)
    return results


# ===========================================================================
# 8. SUMMARY PRINTER
# ===========================================================================

def print_summary(results: list[NormalizeResult]) -> None:
    ok      = [r for r in results if r.status == "ok"]
    skipped = [r for r in results if r.status == "skipped"]
    failed  = [r for r in results if r.status == "failed"]

    total_changes = sum(len(r.changes) for r in ok)

    print("\n" + "=" * 68)
    print("NORMALIZATION SUMMARY")
    print("=" * 68)
    print(f"  ✅  OK       : {len(ok)}")
    print(f"  ⏭   Skipped  : {len(skipped)}")
    print(f"  ❌  Failed   : {len(failed)}")
    print(f"  ─────────────────────────────────────────────────────────────")
    print(f"  📄  Total    : {len(results)}")
    print(f"  🔧  Changes  : {total_changes} field normalizations applied")

    if ok:
        print(f"\n  {'FILE':<38} {'CHANGES':>8}  {'SCHEME NAME'}")
        print(f"  {'-'*38} {'-'*8}  {'-'*28}")
        for r in ok:
            name = (r.normalized_data or {}).get("scheme_name", "")[:30]
            print(f"  {r.source:<38} {len(r.changes):>8}  {name}")

    if failed or skipped:
        print("\n  Issues:")
        for r in failed + skipped:
            print(f"    {'❌' if r.status == 'failed' else '⏭'}  {r.source}: {r.error}")

    print("=" * 68)


# ===========================================================================
# 9. CLI
# ===========================================================================

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="CivicAI – Scheme data normalizer",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--validated-dir", type=Path, default=VALIDATED_DIR,
        help=f"Directory with validated JSON files (default: {VALIDATED_DIR})",
    )
    parser.add_argument(
        "--out-dir", type=Path, default=NORMALIZED_DIR,
        help=f"Output directory for normalized JSON (default: {NORMALIZED_DIR})",
    )
    parser.add_argument(
        "--file", type=str, default=None,
        help="Normalize a single JSON file by name",
    )
    parser.add_argument(
        "--no-save", action="store_true",
        help="Print normalized JSON to stdout; do not write files",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="List JSON files without normalizing",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    validated_dir: Path = args.validated_dir

    # ── Dry-run ──────────────────────────────────────────────────────────────
    if args.dry_run:
        files = sorted(
            p for p in validated_dir.glob("*.json")
            if p.name != "index.json"
        )
        if not files:
            print(f"No JSON files found in {validated_dir}")
            return
        print(f"\nJSON files in {validated_dir}:")
        print(f"{'#':<4} {'FILENAME':<55} {'SIZE':>10}")
        print("-" * 72)
        for i, p in enumerate(files, 1):
            print(f"{i:<4} {p.name:<55} {p.stat().st_size / 1024:>8.1f} KB")
        print(f"\nTotal: {len(files)} file(s)")
        return

    out_dir = None if args.no_save else args.out_dir

    # ── Single file ──────────────────────────────────────────────────────────
    if args.file:
        target = validated_dir / args.file
        if not target.exists():
            log.error("File not found: %s", target)
            sys.exit(1)
        result = normalize_file(target, out_dir)
        if args.no_save and result.normalized_data:
            print(json.dumps(result.normalized_data, indent=2, ensure_ascii=False))
        print_summary([result])
        return

    # ── Batch ────────────────────────────────────────────────────────────────
    results = normalize_all(validated_dir, out_dir or NORMALIZED_DIR)
    if not results:
        log.warning("Nothing to normalize.")
        return
    print_summary(results)


if __name__ == "__main__":
    main()
