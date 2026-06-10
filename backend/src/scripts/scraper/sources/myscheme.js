/**
 * myScheme.gov.in scraper
 * Reverse-engineered from the Next.js app bundle.
 *
 * Endpoint : GET https://api.myscheme.gov.in/search/v4/schemes
 * Auth     : x-api-key (static, embedded in public JS bundle)
 * Total    : ~3,726 schemes (central + all states)
 *
 * Pagination quirks discovered through testing:
 *   - `offset` param is ignored — always returns page 0
 *   - `from`   param works correctly for pagination (0, 10, 20, …)
 *   - `limit`  param is ignored — always returns 10 items per request
 */

import axios from 'axios'

const API_URL = 'https://api.myscheme.gov.in/search/v4/schemes'
const API_KEY = 'tYTy5eEhlu9rFjyxuCr7ra7ACp4dv1RH8gWuHTDc'
const PAGE_SIZE = 10   // actual items returned per request (fixed by API)
const DELAY_MS  = 300

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const HEADERS = {
  'x-api-key':       API_KEY,
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept':          'application/json, text/plain, */*',
  'Origin':          'https://www.myscheme.gov.in',
  'Referer':         'https://www.myscheme.gov.in/search',
}

// ── Category → Program.type ──────────────────────────────────────────────────
const CATEGORY_MAP = {
  'Agriculture,Rural & Environment':           'Financial Aid',
  'Agriculture, Rural & Environment':          'Financial Aid',
  'Education & Learning':                      'Education',
  'Health & Wellness':                         'Healthcare',
  'Housing & Shelter':                         'Housing',
  'Skills & Employment':                       'Employment',
  'Social welfare & Empowerment':              'Financial Aid',
  'Banking, Financial Services & Insurance':   'Financial Aid',
  'Science, IT & Communication':               'Education',
  'Sports & Culture':                          'Other',
  'Travel & Tourism':                          'Other',
  'Transport & Infrastructure':                'Other',
  'Utility & Sanitation':                      'Other',
  'Business & Entrepreneurship':               'Financial Aid',
  'Public Safety, Law & Justice':              'Other',
  'Tax & Revenue':                             'Financial Aid',
}

function inferType(categories = [], name = '') {
  for (const cat of categories) {
    const t = CATEGORY_MAP[cat.trim()]
    if (t) return t
  }
  const n = name.toLowerCase()
  if (/health|medical|hospital|ayushman|nha/.test(n))         return 'Healthcare'
  if (/hous|awas|shelter/.test(n))                            return 'Housing'
  if (/food|ration|anna|grain|nutrition/.test(n))             return 'Food Assistance'
  if (/educat|school|scholar|student|training|skill/.test(n)) return 'Education'
  if (/employ|job|rozgar|mgnrega|labour|labor/.test(n))       return 'Employment'
  if (/pension|senior|elderly|old.?age/.test(n))              return 'Seniors'
  if (/disab|divyang/.test(n))                                return 'Disability'
  return 'Financial Aid'
}

function inferAgeRange(ageField) {
  if (!ageField || typeof ageField !== 'object') return { minAge: null, maxAge: null }
  let min = Infinity, max = -Infinity
  for (const v of Object.values(ageField)) {
    if (v?.gte != null && v.gte < min) min = v.gte
    if (v?.lte != null && v.lte > max) max = v.lte
  }
  return {
    minAge: min === Infinity  || min <= 0   ? null : min,
    maxAge: max === -Infinity || max >= 100 ? null : max,
  }
}

function mapItem(item) {
  const f    = item.fields || {}
  const name = (f.schemeName || '').trim()
  if (!name) return null

  const slug       = f.slug || item.id
  const level      = f.level || 'Central'
  const stateRaw   = f.beneficiaryState?.[0] ?? 'All'
  const state      = (!stateRaw || stateRaw === 'All') ? 'All India' : stateRaw
  const categories = f.schemeCategory || []
  const ministry   = f.nodalMinistryName || 'Government of India'
  const tags       = f.tags || []
  const { minAge, maxAge } = inferAgeRange(f.age)

  return {
    name,
    description: (f.briefDescription || '').trim(),
    type:        inferType(categories, name),
    agency:      ministry,
    location:    state === 'All India' ? 'Nationwide' : state,
    state,
    eligibilityCriteria: {
      minAge, maxAge,
      maxIncome:          null,
      allowedCategories:  [],
      requiredDocuments:  [],
      studentRequired:    null,
      disabilityRequired: null,
    },
    benefits: { type: 'other', description: '' },
    applicationProcess: {
      url:   `https://www.myscheme.gov.in/schemes/${slug}`,
      steps: [],
    },
    tags:           [...new Set([...tags.map(t => t.toLowerCase()), level.toLowerCase()])],
    status:         'active',
    source:         'ai-pipeline',
    pipelineSource: 'myscheme-api',
  }
}

async function fetchPage(from) {
  const res = await axios.get(API_URL, {
    params: { lang: 'en', keyword: '', limit: 10, offset: 0, from, sort: 'schemename-asc' },
    headers: HEADERS,
    timeout: 20000,
  })
  const items = res.data?.data?.hits?.items ?? []
  const total = res.data?.data?.summary?.total ?? 0
  return { items, total }
}

/**
 * Scrape all schemes from myScheme.gov.in.
 *
 * @param {object}   opts
 * @param {number}   opts.maxPages  - max requests (default 400 covers all 3,726 at 10/req)
 * @param {function} opts.log
 */
export async function scrape({ maxPages = 400, log = console.log } = {}) {
  log('[myscheme] Starting — authenticated API (~3,726 schemes)')

  const programs = []
  const seenIds  = new Set()
  let from       = 0
  let total      = null
  let page       = 0

  while (page < maxPages) {
    try {
      const { items, total: t } = await fetchPage(from)

      if (total === null) {
        total = t
        const pages = Math.ceil(total / PAGE_SIZE)
        log(`[myscheme] ${total} schemes, ${pages} pages at ${PAGE_SIZE}/page`)
      }

      if (!items.length) {
        log('[myscheme] Empty page — done')
        break
      }

      let added = 0
      for (const item of items) {
        if (seenIds.has(item.id)) continue
        seenIds.add(item.id)
        const mapped = mapItem(item)
        if (mapped) { programs.push(mapped); added++ }
      }

      from += PAGE_SIZE
      page++

      if (page % 50 === 0) {
        log(`[myscheme] ${programs.length}/${total} fetched (page ${page})`)
      }

      if (from >= total) {
        log(`[myscheme] All ${programs.length} schemes fetched`)
        break
      }

      await sleep(DELAY_MS)
    } catch (err) {
      log(`[myscheme] Error at page ${page + 1} (from=${from}): ${err.message}`)
      if (page === 0) throw err
      break
    }
  }

  log(`[myscheme] Done — ${programs.length} unique programs`)
  return programs
}
