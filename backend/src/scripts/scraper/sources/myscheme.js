import axios from 'axios'

const BASE_URL = 'https://www.myscheme.gov.in'
const API_BASE = `${BASE_URL}/api/v1`

// Polite delay between requests (ms)
const DELAY_MS = 800

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Map a raw myScheme API record → Program model shape
 */
function mapToProgram(raw) {
  // Extract benefit amount hint from benefit text
  const benefitText = raw.benefits || raw.benefit_description || ''

  // Determine type from tags/category
  const type = inferType(raw.tags || [], raw.ministry || '', raw.name || '')

  // Build eligibility criteria
  const eligibility = {
    minAge: raw.min_age ?? raw.eligibility?.min_age ?? null,
    maxAge: raw.max_age ?? raw.eligibility?.max_age ?? null,
    maxIncome: parseIncome(raw.income_limit ?? raw.eligibility?.income_limit),
    allowedCategories: normalizeCategories(
      raw.beneficiary_categories ?? raw.target_beneficiaries ?? []
    ),
    requiredDocuments: Array.isArray(raw.documents_required)
      ? raw.documents_required
      : [],
    studentRequired: raw.student_required ?? null,
    disabilityRequired: raw.disability_required ?? null,
  }

  return {
    name: raw.name || raw.scheme_name || '',
    description: raw.description || raw.short_description || '',
    type,
    agency: raw.ministry || raw.department || raw.nodal_ministry || 'Government of India',
    location: 'Nationwide',
    state: normalizeState(raw.state ?? raw.scheme_type),
    eligibilityCriteria: eligibility,
    benefits: {
      type: 'other',
      description: benefitText,
    },
    applicationProcess: {
      url: raw.apply_url || raw.application_url || '',
      steps: raw.application_process
        ? [raw.application_process]
        : [],
    },
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    status: 'active',
    source: 'ai-pipeline',
    pipelineSource: 'myscheme-api',
  }
}

function inferType(tags, ministry, name) {
  const combined = [...tags, ministry, name].join(' ').toLowerCase()

  if (/health|medical|hospital|ayushman|pm.?jay/.test(combined)) return 'Healthcare'
  if (/food|ration|anna|grain|nutrition/.test(combined)) return 'Food Assistance'
  if (/hous|awas|shelter|dwelling/.test(combined)) return 'Housing'
  if (/educat|school|scholar|student|college|skill|training/.test(combined)) return 'Education'
  if (/employ|job|work|labour|labor|mgnrega|nrega/.test(combined)) return 'Employment'
  if (/pension|retire|senior|elderly|old.age/.test(combined)) return 'Seniors'
  if (/disab|divyang|pwd/.test(combined)) return 'Disability'
  if (/veteran|ex.servicem|armed.force/.test(combined)) return 'Veterans'
  if (/child|infant|maternity|prenatal/.test(combined)) return 'Childcare'
  return 'Financial Aid'
}

function parseIncome(raw) {
  if (raw == null) return null
  if (typeof raw === 'number') return raw > 0 ? raw : null

  const s = String(raw).replace(/,/g, '').toLowerCase().trim()
  if (!s || ['null', 'n/a', 'no limit', 'unlimited', 'none'].includes(s)) return null

  const m = s.match(/([\d.]+)\s*(crore|lakh|lac|thousand|k)?/)
  if (!m) return null

  let val = parseFloat(m[1])
  const unit = m[2] || ''

  if (unit.startsWith('crore')) val *= 10_000_000
  else if (unit.startsWith('lakh') || unit.startsWith('lac')) val *= 100_000
  else if (unit.startsWith('thousand') || unit === 'k') val *= 1_000

  return val > 0 && val <= 10_000_000 ? Math.round(val) : null
}

function normalizeCategories(raw) {
  if (!Array.isArray(raw)) return []
  return raw.map((c) => String(c).trim()).filter(Boolean)
}

function normalizeState(raw) {
  if (!raw || /central|national|all/i.test(raw)) return 'All India'
  return String(raw).trim()
}

/**
 * Fetch one page of schemes from the API
 */
async function fetchPage(page, limit = 50) {
  const url = `${API_BASE}/schemes?page=${page}&limit=${limit}`
  const response = await axios.get(url, {
    timeout: 15000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; CivicAI/1.0)',
      Accept: 'application/json',
    },
  })
  return response.data
}

/**
 * Fetch full detail for one scheme slug
 */
async function fetchDetail(slug) {
  try {
    const url = `${API_BASE}/scheme/${slug}`
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CivicAI/1.0)',
        Accept: 'application/json',
      },
    })
    return response.data
  } catch {
    return null
  }
}

/**
 * Main scrape function — returns array of mapped Program objects
 *
 * @param {object} opts
 * @param {number} opts.maxPages - max pages to fetch (default: 20 = 1000 schemes)
 * @param {number} opts.limit    - schemes per page (default: 50)
 * @param {function} opts.log    - logger function
 */
export async function scrape({ maxPages = 20, limit = 50, log = console.log } = {}) {
  log(`[myscheme] Starting — max ${maxPages} pages × ${limit} per page`)

  const programs = []
  let page = 1
  let totalFetched = 0

  while (page <= maxPages) {
    try {
      log(`[myscheme] Fetching page ${page}/${maxPages}…`)
      const data = await fetchPage(page, limit)

      // Handle both { schemes: [] } and { data: [] } response shapes
      const items =
        data?.schemes ?? data?.data ?? data?.results ?? (Array.isArray(data) ? data : [])

      if (!items.length) {
        log(`[myscheme] Empty page ${page} — stopping`)
        break
      }

      for (const item of items) {
        // Optionally fetch full detail if list item is sparse
        let detail = item
        if (item.slug && !item.description) {
          detail = (await fetchDetail(item.slug)) ?? item
          await sleep(DELAY_MS / 2)
        }

        const mapped = mapToProgram(detail)
        if (mapped.name) programs.push(mapped)
        totalFetched++
      }

      log(`[myscheme] Page ${page} → ${items.length} schemes (total: ${totalFetched})`)

      // Check if there are more pages
      const totalPages = data?.total_pages ?? data?.totalPages ?? null
      if (totalPages && page >= totalPages) break

      page++
      await sleep(DELAY_MS)
    } catch (err) {
      log(`[myscheme] Page ${page} error: ${err.message}`)
      // If first page fails, the API shape may be different — stop
      if (page === 1) throw err
      break
    }
  }

  log(`[myscheme] Done — ${programs.length} programs mapped`)
  return programs
}
