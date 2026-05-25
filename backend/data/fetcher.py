"""
CivicAI - Indian Government Welfare Scheme Data Fetcher
=========================================================
Downloads PDF files and HTML pages from Indian central government welfare
scheme portals. Saves raw content into backend/data/raw/ for the AI
ingestion pipeline.

Schemes covered
---------------
  PM-JAY / Ayushman Bharat   – Health insurance (₹5 lakh/family/year)
  PM-KISAN                   – Farmer income support (₹6,000/year)
  PMAY-Urban                 – Housing for urban poor
  PMAY-Gramin                – Housing for rural poor
  MGNREGA                    – Rural employment guarantee (100 days/year)
  PMGKAY                     – Free food grain (5 kg/person/month)
  PM-SVANidhi                – Street vendor micro-credit
  PMKVY                      – Skill development & vocational training
  NSP Scholarships           – National Scholarship Portal
  Atal Pension Yojana        – Pension for unorganised sector workers
  PMJJBY                     – Life insurance (₹2 lakh cover, ₹436/year)
  PMSBY                      – Accident insurance (₹2 lakh, ₹20/year)
  myScheme Portal            – Central scheme discovery portal

Usage:
    python fetcher.py                      # Fetch everything
    python fetcher.py --type pdf           # PDFs only
    python fetcher.py --type html          # HTML pages only
    python fetcher.py --source pmjay       # Single source by key prefix
    python fetcher.py --dry-run            # List targets without downloading
    python fetcher.py --force              # Re-download cached files
"""

import os
import re
import time
import json
import hashlib
import logging
import argparse
import mimetypes
from pathlib import Path
from datetime import datetime, timezone
from dataclasses import dataclass, field, asdict
from typing import Optional

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

BASE_DIR   = Path(__file__).parent          # backend/data/
RAW_DIR    = BASE_DIR / "raw"
PDF_DIR    = RAW_DIR / "pdfs"
HTML_DIR   = RAW_DIR / "html"
LOG_DIR    = RAW_DIR / "logs"
MANIFEST   = RAW_DIR / "manifest.json"

for _d in (PDF_DIR, HTML_DIR, LOG_DIR):
    _d.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

LOG_FILE = LOG_DIR / f"fetch_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
    ],
)
log = logging.getLogger("civicai.fetcher")

# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

@dataclass
class FetchTarget:
    """Describes one resource to download."""
    key:         str                        # unique slug, e.g. "snap_fact_sheet"
    url:         str                        # full URL
    content_type: str                       # "pdf" | "html"
    program:     str                        # parent program name
    agency:      str                        # issuing agency
    description: str = ""                  # human-readable label
    tags:        list[str] = field(default_factory=list)


@dataclass
class FetchResult:
    """Outcome of one download attempt."""
    key:          str
    url:          str
    status:       str                       # "ok" | "skipped" | "failed"
    filepath:     Optional[str] = None
    size_bytes:   int = 0
    sha256:       Optional[str] = None
    http_status:  Optional[int] = None
    error:        Optional[str] = None
    fetched_at:   str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ---------------------------------------------------------------------------
# Government sources
# ---------------------------------------------------------------------------

TARGETS: list[FetchTarget] = [

    # ── PM-JAY / Ayushman Bharat ─────────────────────────────────────────────
    FetchTarget(
        key="pmjay_overview",
        url="https://nha.gov.in/PM-JAY",
        content_type="html",
        program="PM-JAY (Ayushman Bharat)",
        agency="National Health Authority, Ministry of Health & Family Welfare",
        description="PM-JAY scheme overview – eligibility, benefits, coverage",
        tags=["pmjay", "health", "insurance", "ayushman", "html"],
    ),
    FetchTarget(
        key="pmjay_beneficiary_check",
        url="https://beneficiary.nha.gov.in/",
        content_type="html",
        program="PM-JAY (Ayushman Bharat)",
        agency="National Health Authority",
        description="PM-JAY beneficiary eligibility check portal",
        tags=["pmjay", "eligibility", "beneficiary", "html"],
    ),
    FetchTarget(
        key="pmjay_pib_factsheet",
        url="https://pib.gov.in/PressReleseDetailm.aspx?PRID=2123250",
        content_type="html",
        program="PM-JAY (Ayushman Bharat)",
        agency="Press Information Bureau, Government of India",
        description="PIB press release – AB PM-JAY impact and statistics",
        tags=["pmjay", "health", "pib", "html"],
    ),

    # ── PM-KISAN ─────────────────────────────────────────────────────────────
    FetchTarget(
        key="pmkisan_home",
        url="https://pmkisan.gov.in/",
        content_type="html",
        program="PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)",
        agency="Department of Agriculture & Farmers Welfare, MoAFW",
        description="PM-KISAN portal – scheme details and beneficiary status",
        tags=["pmkisan", "farmer", "agriculture", "income", "html"],
    ),
    FetchTarget(
        key="pmkisan_pib_eligibility",
        url="https://www.pib.gov.in/PressNoteDetails.aspx?ModuleId=3&NoteId=153249&lang=2&reg=3",
        content_type="html",
        program="PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)",
        agency="Press Information Bureau, Government of India",
        description="PIB note – PM-KISAN eligibility and installment details",
        tags=["pmkisan", "farmer", "eligibility", "pib", "html"],
    ),
    FetchTarget(
        key="pmkisan_india_gov",
        url="https://services.india.gov.in/service/detail/pm-kisan-samman-nidhi-1",
        content_type="html",
        program="PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)",
        agency="National Government Services Portal",
        description="PM-KISAN service detail on india.gov.in",
        tags=["pmkisan", "farmer", "india.gov", "html"],
    ),

    # ── PMAY-Urban ───────────────────────────────────────────────────────────
    FetchTarget(
        key="pmay_urban_about",
        url="https://pmay-urban.gov.in/about",
        content_type="html",
        program="PMAY-Urban (Pradhan Mantri Awas Yojana – Urban)",
        agency="Ministry of Housing and Urban Affairs",
        description="PMAY-Urban scheme overview and eligibility",
        tags=["pmay", "housing", "urban", "html"],
    ),
    FetchTarget(
        key="pmay_urban_eligibility",
        url="https://pmaymis.gov.in/PMAYMIS2_2024/PMAY_SURVEY/Applicant_Login.aspx",
        content_type="html",
        program="PMAY-Urban (Pradhan Mantri Awas Yojana – Urban)",
        agency="Ministry of Housing and Urban Affairs",
        description="PMAY-Urban 2.0 applicant portal",
        tags=["pmay", "housing", "urban", "apply", "html"],
    ),

    # ── PMAY-Gramin ──────────────────────────────────────────────────────────
    FetchTarget(
        key="pmay_gramin_home",
        url="https://pmayg.nic.in/netiay/home.aspx",
        content_type="html",
        program="PMAY-Gramin (Pradhan Mantri Awas Yojana – Gramin)",
        agency="Ministry of Rural Development",
        description="PMAY-Gramin portal – rural housing scheme",
        tags=["pmay", "housing", "rural", "gramin", "html"],
    ),

    # ── MGNREGA ──────────────────────────────────────────────────────────────
    FetchTarget(
        key="mgnrega_home",
        url="https://nregarep1.nic.in/netnrega/MGNREGA_new/nrega_home.aspx",
        content_type="html",
        program="MGNREGA (Mahatma Gandhi National Rural Employment Guarantee Act)",
        agency="Ministry of Rural Development",
        description="MGNREGA official portal – 100-day employment guarantee",
        tags=["mgnrega", "employment", "rural", "html"],
    ),
    FetchTarget(
        key="mgnrega_pib_stats",
        url="https://www.pib.gov.in/PressNoteDetails.aspx?ModuleId=3&NoteId=155090&id=155090",
        content_type="html",
        program="MGNREGA (Mahatma Gandhi National Rural Employment Guarantee Act)",
        agency="Press Information Bureau, Government of India",
        description="PIB note – MGNREGA FY 2025-26 allocation and statistics",
        tags=["mgnrega", "employment", "pib", "html"],
    ),

    # ── PMGKAY (Free Food Grain) ─────────────────────────────────────────────
    FetchTarget(
        key="pmgkay_pib_extension",
        url="https://www.pib.gov.in/PressNoteDetails.aspx?ModuleId=3&NoteId=151969&lang=2&reg=3",
        content_type="html",
        program="PMGKAY (Pradhan Mantri Garib Kalyan Anna Yojana)",
        agency="Ministry of Consumer Affairs, Food & Public Distribution",
        description="PMGKAY 5-year extension – free food grain for 81 crore beneficiaries",
        tags=["pmgkay", "food", "ration", "pib", "html"],
    ),
    FetchTarget(
        key="pmgkay_budget_page",
        url="https://www.indiabudget.gov.in/pmgky/",
        content_type="html",
        program="PMGKAY (Pradhan Mantri Garib Kalyan Anna Yojana)",
        agency="Ministry of Finance, Government of India",
        description="PMGKAY official budget page – scheme details and beneficiaries",
        tags=["pmgkay", "food", "welfare", "html"],
    ),

    # ── PM SVANidhi ──────────────────────────────────────────────────────────
    FetchTarget(
        key="svanidhi_home",
        url="https://pmsvanidhi.mohua.gov.in/",
        content_type="html",
        program="PM SVANidhi (PM Street Vendor's AtmaNirbhar Nidhi)",
        agency="Ministry of Housing and Urban Affairs",
        description="PM SVANidhi – micro-credit for street vendors",
        tags=["svanidhi", "vendor", "microcredit", "urban", "html"],
    ),

    # ── PMKVY (Skill India) ──────────────────────────────────────────────────
    FetchTarget(
        key="pmkvy_home",
        url="https://www.pmkvyofficial.org/",
        content_type="html",
        program="PMKVY (Pradhan Mantri Kaushal Vikas Yojana)",
        agency="Ministry of Skill Development and Entrepreneurship",
        description="PMKVY official portal – skill training and certification",
        tags=["pmkvy", "skill", "training", "employment", "html"],
    ),
    FetchTarget(
        key="skillindia_schemes",
        url="https://www.skillindia.gov.in/",
        content_type="html",
        program="PMKVY (Pradhan Mantri Kaushal Vikas Yojana)",
        agency="Ministry of Skill Development and Entrepreneurship",
        description="Skill India portal – all skill development schemes",
        tags=["pmkvy", "skill", "india", "html"],
    ),

    # ── National Scholarship Portal (NSP) ────────────────────────────────────
    FetchTarget(
        key="nsp_home",
        url="https://scholarships.gov.in/",
        content_type="html",
        program="NSP (National Scholarship Portal)",
        agency="Ministry of Electronics and Information Technology",
        description="NSP – central portal for all government scholarships",
        tags=["nsp", "scholarship", "education", "html"],
    ),
    FetchTarget(
        key="nsp_schemes_list",
        url="https://scholarships.gov.in/public/schemeGuidelines/schemeList.action",
        content_type="html",
        program="NSP (National Scholarship Portal)",
        agency="Ministry of Electronics and Information Technology",
        description="NSP – list of all scholarship schemes and guidelines",
        tags=["nsp", "scholarship", "schemes", "html"],
    ),

    # ── Atal Pension Yojana ──────────────────────────────────────────────────
    FetchTarget(
        key="apy_home",
        url="https://www.npscra.nsdl.co.in/scheme-details.php",
        content_type="html",
        program="APY (Atal Pension Yojana)",
        agency="Pension Fund Regulatory and Development Authority (PFRDA)",
        description="APY scheme details – pension for unorganised sector workers",
        tags=["apy", "pension", "retirement", "html"],
    ),
    FetchTarget(
        key="apy_pfrda_page",
        url="https://www.pfrda.org.in/index1.cshtml?lngId=6&SublinkId=1",
        content_type="html",
        program="APY (Atal Pension Yojana)",
        agency="Pension Fund Regulatory and Development Authority (PFRDA)",
        description="PFRDA – APY eligibility and subscriber details",
        tags=["apy", "pension", "pfrda", "html"],
    ),

    # ── PMJJBY (Life Insurance) ──────────────────────────────────────────────
    FetchTarget(
        key="pmjjby_jansuraksha",
        url="https://jansuraksha.gov.in/PMJJBY.aspx",
        content_type="html",
        program="PMJJBY (Pradhan Mantri Jeevan Jyoti Bima Yojana)",
        agency="Ministry of Finance, Department of Financial Services",
        description="PMJJBY – ₹2 lakh life insurance at ₹436/year",
        tags=["pmjjby", "insurance", "life", "html"],
    ),

    # ── PMSBY (Accident Insurance) ───────────────────────────────────────────
    FetchTarget(
        key="pmsby_jansuraksha",
        url="https://jansuraksha.gov.in/PMSBY.aspx",
        content_type="html",
        program="PMSBY (Pradhan Mantri Suraksha Bima Yojana)",
        agency="Ministry of Finance, Department of Financial Services",
        description="PMSBY – ₹2 lakh accident insurance at ₹20/year",
        tags=["pmsby", "insurance", "accident", "html"],
    ),

    # ── myScheme Portal ──────────────────────────────────────────────────────
    FetchTarget(
        key="myscheme_home",
        url="https://www.myscheme.gov.in/",
        content_type="html",
        program="myScheme (Government Scheme Discovery Portal)",
        agency="National e-Governance Division (NeGD), MeitY",
        description="myScheme – central portal to discover and apply for all GoI schemes",
        tags=["myscheme", "portal", "discovery", "html"],
    ),

    # ── PIB Press Releases (PDF) ─────────────────────────────────────────────
    FetchTarget(
        key="pmkisan_pib_pdf",
        url="https://www.pib.gov.in/PressNoteDetails.aspx?ModuleId=3&NoteId=154960",
        content_type="html",
        program="PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)",
        agency="Press Information Bureau, Government of India",
        description="PIB – PM-KISAN DBT installment details 2025",
        tags=["pmkisan", "dbt", "pib", "html"],
    ),
    FetchTarget(
        key="mgnrega_pib_pdf",
        url="https://www.pib.gov.in/PressReleasePage.aspx?PRID=2088996",
        content_type="html",
        program="MGNREGA (Mahatma Gandhi National Rural Employment Guarantee Act)",
        agency="Press Information Bureau, Government of India",
        description="PIB – MGNREGA livelihood and Panchayati Raj details",
        tags=["mgnrega", "rural", "pib", "html"],
    ),

    # ── Social Justice Schemes ───────────────────────────────────────────────
    FetchTarget(
        key="socialjustice_sc_schemes",
        url="https://socialjustice.gov.in/schemes/104",
        content_type="html",
        program="SC Welfare Schemes (Social Justice)",
        agency="Department of Social Justice and Empowerment",
        description="Schemes for Scheduled Castes – skill development and income generation",
        tags=["sc", "welfare", "social-justice", "html"],
    ),
]

# ---------------------------------------------------------------------------
# HTTP session with retry logic
# ---------------------------------------------------------------------------

def build_session(
    retries: int = 4,
    backoff_factor: float = 1.5,
    timeout: int = 30,
) -> requests.Session:
    """
    Returns a requests.Session with:
    - Automatic retries on 429, 500, 502, 503, 504
    - Exponential back-off between retries
    - A browser-like User-Agent to avoid bot blocks
    """
    session = requests.Session()

    retry_strategy = Retry(
        total=retries,
        backoff_factor=backoff_factor,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET", "HEAD"],
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("https://", adapter)
    session.mount("http://",  adapter)

    session.headers.update({
        "User-Agent": (
            "Mozilla/5.0 (compatible; CivicAI-Fetcher/1.0; "
            "+https://github.com/Prince-Raj-PR/civicai-welfare)"
        ),
        "Accept": "text/html,application/xhtml+xml,application/pdf,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    })

    session.timeout = timeout
    return session


# ---------------------------------------------------------------------------
# Filename helpers
# ---------------------------------------------------------------------------

def _safe_filename(key: str, url: str, content_type: str) -> str:
    """
    Derive a deterministic, filesystem-safe filename.
    Falls back to a URL hash if the URL has no useful path segment.
    """
    ext_map = {"pdf": ".pdf", "html": ".html"}
    ext = ext_map.get(content_type, ".bin")

    # Try to grab the last path segment from the URL
    path_part = url.rstrip("/").split("/")[-1]
    path_part = re.sub(r"[^\w\-.]", "_", path_part)

    # Strip any existing extension so we control it
    path_part = re.sub(r"\.(pdf|html?|aspx|php)$", "", path_part, flags=re.I)

    if len(path_part) < 3:
        # URL path is too short to be useful; use a hash
        path_part = hashlib.md5(url.encode()).hexdigest()[:10]

    return f"{key}__{path_part}{ext}"


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


# ---------------------------------------------------------------------------
# Core download functions
# ---------------------------------------------------------------------------

def download_pdf(
    session: requests.Session,
    target: FetchTarget,
    force: bool = False,
) -> FetchResult:
    """Download a PDF and save it to PDF_DIR."""
    filename = _safe_filename(target.key, target.url, "pdf")
    dest = PDF_DIR / filename

    if dest.exists() and not force:
        log.info("  ⏭  SKIP  %s  (already exists)", filename)
        return FetchResult(
            key=target.key,
            url=target.url,
            status="skipped",
            filepath=str(dest),
            size_bytes=dest.stat().st_size,
        )

    log.info("  ⬇  PDF   %s", target.url)
    try:
        resp = session.get(target.url, timeout=session.timeout, stream=True)
        resp.raise_for_status()

        # Validate content-type
        ct = resp.headers.get("Content-Type", "")
        if "pdf" not in ct.lower() and not target.url.lower().endswith(".pdf"):
            log.warning("    ⚠  Unexpected Content-Type '%s' for %s", ct, target.key)

        data = resp.content
        dest.write_bytes(data)

        result = FetchResult(
            key=target.key,
            url=target.url,
            status="ok",
            filepath=str(dest),
            size_bytes=len(data),
            sha256=_sha256(data),
            http_status=resp.status_code,
        )
        log.info("    ✅  Saved %s  (%.1f KB)", filename, len(data) / 1024)
        return result

    except requests.exceptions.ConnectionError as exc:
        log.error("    ❌  Connection error for %s: %s", target.key, exc)
        return FetchResult(key=target.key, url=target.url, status="failed", error=str(exc))
    except requests.exceptions.Timeout as exc:
        log.error("    ❌  Timeout for %s: %s", target.key, exc)
        return FetchResult(key=target.key, url=target.url, status="failed", error="timeout")
    except requests.exceptions.HTTPError as exc:
        log.error("    ❌  HTTP %s for %s", exc.response.status_code, target.key)
        return FetchResult(
            key=target.key, url=target.url, status="failed",
            http_status=exc.response.status_code, error=str(exc),
        )
    except Exception as exc:
        log.error("    ❌  Unexpected error for %s: %s", target.key, exc)
        return FetchResult(key=target.key, url=target.url, status="failed", error=str(exc))


def download_html(
    session: requests.Session,
    target: FetchTarget,
    force: bool = False,
) -> FetchResult:
    """Download an HTML page and save it to HTML_DIR."""
    filename = _safe_filename(target.key, target.url, "html")
    dest = HTML_DIR / filename

    if dest.exists() and not force:
        log.info("  ⏭  SKIP  %s  (already exists)", filename)
        return FetchResult(
            key=target.key,
            url=target.url,
            status="skipped",
            filepath=str(dest),
            size_bytes=dest.stat().st_size,
        )

    log.info("  ⬇  HTML  %s", target.url)
    try:
        resp = session.get(target.url, timeout=session.timeout)
        resp.raise_for_status()

        # Detect encoding; fall back to utf-8
        encoding = resp.encoding or "utf-8"
        html = resp.text

        dest.write_text(html, encoding="utf-8")
        data_bytes = html.encode("utf-8")

        result = FetchResult(
            key=target.key,
            url=target.url,
            status="ok",
            filepath=str(dest),
            size_bytes=len(data_bytes),
            sha256=_sha256(data_bytes),
            http_status=resp.status_code,
        )
        log.info("    ✅  Saved %s  (%.1f KB)", filename, len(data_bytes) / 1024)
        return result

    except requests.exceptions.ConnectionError as exc:
        log.error("    ❌  Connection error for %s: %s", target.key, exc)
        return FetchResult(key=target.key, url=target.url, status="failed", error=str(exc))
    except requests.exceptions.Timeout as exc:
        log.error("    ❌  Timeout for %s: %s", target.key, exc)
        return FetchResult(key=target.key, url=target.url, status="failed", error="timeout")
    except requests.exceptions.HTTPError as exc:
        log.error("    ❌  HTTP %s for %s", exc.response.status_code, target.key)
        return FetchResult(
            key=target.key, url=target.url, status="failed",
            http_status=exc.response.status_code, error=str(exc),
        )
    except Exception as exc:
        log.error("    ❌  Unexpected error for %s: %s", target.key, exc)
        return FetchResult(key=target.key, url=target.url, status="failed", error=str(exc))


# ---------------------------------------------------------------------------
# Dispatcher
# ---------------------------------------------------------------------------

def fetch_target(
    session: requests.Session,
    target: FetchTarget,
    force: bool = False,
    delay: float = 1.0,
) -> FetchResult:
    """Route a target to the correct downloader and apply a polite delay."""
    if target.content_type == "pdf":
        result = download_pdf(session, target, force=force)
    elif target.content_type == "html":
        result = download_html(session, target, force=force)
    else:
        log.warning("Unknown content_type '%s' for %s", target.content_type, target.key)
        result = FetchResult(
            key=target.key, url=target.url,
            status="failed", error=f"unknown content_type: {target.content_type}",
        )

    # Polite crawl delay (skip for cached/skipped items)
    if result.status != "skipped":
        time.sleep(delay)

    return result


# ---------------------------------------------------------------------------
# Manifest
# ---------------------------------------------------------------------------

def load_manifest() -> dict:
    if MANIFEST.exists():
        try:
            return json.loads(MANIFEST.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {}
    return {}


def save_manifest(results: list[FetchResult]) -> None:
    existing = load_manifest()
    for r in results:
        existing[r.key] = asdict(r)
    MANIFEST.write_text(
        json.dumps(existing, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    log.info("📄 Manifest updated → %s", MANIFEST)


# ---------------------------------------------------------------------------
# Main orchestrator
# ---------------------------------------------------------------------------

def run(
    targets: list[FetchTarget],
    force: bool = False,
    delay: float = 1.2,
    retries: int = 4,
    timeout: int = 30,
) -> list[FetchResult]:
    """
    Fetch all targets sequentially.

    Args:
        targets:  List of FetchTarget objects to process.
        force:    Re-download even if the file already exists.
        delay:    Seconds to wait between requests (polite crawling).
        retries:  Max retry attempts per request.
        timeout:  HTTP request timeout in seconds.

    Returns:
        List of FetchResult objects.
    """
    session = build_session(retries=retries, timeout=timeout)
    results: list[FetchResult] = []

    log.info("=" * 60)
    log.info("CivicAI Government Data Fetcher")
    log.info("Targets : %d", len(targets))
    log.info("Output  : %s", RAW_DIR)
    log.info("Force   : %s", force)
    log.info("=" * 60)

    for i, target in enumerate(targets, 1):
        log.info("[%d/%d] %s  (%s)", i, len(targets), target.key, target.program)
        result = fetch_target(session, target, force=force, delay=delay)
        results.append(result)

    # Persist manifest
    save_manifest(results)

    # Summary
    ok      = sum(1 for r in results if r.status == "ok")
    skipped = sum(1 for r in results if r.status == "skipped")
    failed  = sum(1 for r in results if r.status == "failed")

    log.info("")
    log.info("=" * 60)
    log.info("SUMMARY")
    log.info("  ✅  Downloaded : %d", ok)
    log.info("  ⏭   Skipped   : %d  (already cached)", skipped)
    log.info("  ❌  Failed     : %d", failed)
    log.info("  📁  Output dir : %s", RAW_DIR)
    log.info("  📄  Log file   : %s", LOG_FILE)
    log.info("=" * 60)

    if failed:
        log.warning("Some downloads failed. Check the log for details.")

    return results


# ---------------------------------------------------------------------------
# Filter helpers (used by CLI)
# ---------------------------------------------------------------------------

def filter_by_type(targets: list[FetchTarget], content_type: str) -> list[FetchTarget]:
    return [t for t in targets if t.content_type == content_type]


def filter_by_source(targets: list[FetchTarget], source_key: str) -> list[FetchTarget]:
    """Match by key prefix or program name (case-insensitive)."""
    key_lower = source_key.lower()
    return [
        t for t in targets
        if t.key.lower().startswith(key_lower)
        or key_lower in t.program.lower()
    ]


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="CivicAI – Government welfare data fetcher",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--type", choices=["pdf", "html"],
        help="Only fetch this content type",
    )
    parser.add_argument(
        "--source",
        help="Only fetch targets whose key starts with SOURCE (e.g. snap, wic, ssi)",
    )
    parser.add_argument(
        "--force", action="store_true",
        help="Re-download even if file already exists",
    )
    parser.add_argument(
        "--delay", type=float, default=1.2,
        help="Seconds between requests (default: 1.2)",
    )
    parser.add_argument(
        "--retries", type=int, default=4,
        help="Max retry attempts per request (default: 4)",
    )
    parser.add_argument(
        "--timeout", type=int, default=30,
        help="HTTP timeout in seconds (default: 30)",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Print targets without downloading",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    # Build target list
    targets = list(TARGETS)

    if args.type:
        targets = filter_by_type(targets, args.type)
        log.info("Filtered to content_type=%s → %d targets", args.type, len(targets))

    if args.source:
        targets = filter_by_source(targets, args.source)
        log.info("Filtered to source=%s → %d targets", args.source, len(targets))

    if not targets:
        log.warning("No targets matched the given filters. Exiting.")
        return

    # Dry-run: just list what would be fetched
    if args.dry_run:
        print(f"\n{'KEY':<35} {'TYPE':<6} {'PROGRAM':<40} URL")
        print("-" * 120)
        for t in targets:
            print(f"{t.key:<35} {t.content_type:<6} {t.program:<40} {t.url}")
        print(f"\nTotal: {len(targets)} targets")
        return

    # Run
    run(
        targets=targets,
        force=args.force,
        delay=args.delay,
        retries=args.retries,
        timeout=args.timeout,
    )


if __name__ == "__main__":
    main()
