/**
 * CivicAI – Government Scheme Scraper
 * =====================================
 * Orchestrates all source scrapers and returns a unified array of
 * Program-shaped objects ready for MongoDB insertion.
 *
 * Sources (in priority order):
 *   1. myscheme.gov.in API  — 3000+ central & state schemes (JSON API)
 *   2. pmjay.js             — PM-JAY / Ayushman Bharat (live + static)
 *   3. pmkisan.js           — PM-KISAN (live + static)
 *   4. pmay.js              — PMAY Urban & Gramin (live + static)
 *   5. other_schemes.js     — MGNREGA, PMGKAY, APY, PMJJBY, PMSBY, etc.
 *
 * Usage:
 *   import { runScraper } from './scraper.js'
 *   const programs = await runScraper({ useMySchemeAPI: true })
 */

import { scrape as scrapeMyScheme } from './sources/myscheme.js'
import { scrape as scrapePmjay } from './sources/pmjay.js'
import { scrape as scrapePmkisan } from './sources/pmkisan.js'
import { scrape as scrapePmay } from './sources/pmay.js'
import { scrape as scrapeOthers } from './sources/other_schemes.js'

/**
 * Deduplicate programs by name (case-insensitive, normalized)
 * Keeps the first occurrence (highest-priority source wins).
 */
function deduplicateByName(programs) {
  const seen = new Map()
  const result = []

  for (const p of programs) {
    const key = p.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (!seen.has(key)) {
      seen.set(key, true)
      result.push(p)
    }
  }

  return result
}

/**
 * Run all scrapers and return merged, deduplicated program list.
 *
 * @param {object} opts
 * @param {boolean} opts.useMySchemeAPI - include myscheme.gov.in API (default: true)
 * @param {number}  opts.mySchemeMaxPages - max pages from myscheme API (default: 10)
 * @param {boolean} opts.verbose - verbose logging (default: true)
 * @returns {Promise<Array>} array of Program-shaped objects
 */
export async function runScraper({
  useMySchemeAPI = true,
  mySchemeMaxPages = 10,
  verbose = true,
} = {}) {
  const log = verbose ? console.log : () => {}
  const allPrograms = []
  const results = []

  log('\n' + '═'.repeat(60))
  log('  CivicAI Government Scheme Scraper')
  log('═'.repeat(60))

  // ── Curated sources first (highest quality) ────────────────────────────────
  const curated = [
    { name: 'PM-JAY',        fn: scrapePmjay },
    { name: 'PM-KISAN',      fn: scrapePmkisan },
    { name: 'PMAY',          fn: scrapePmay },
    { name: 'Other Schemes', fn: scrapeOthers },
  ]

  for (const { name, fn } of curated) {
    const t0 = Date.now()
    try {
      log(`\n[scraper] Running ${name}…`)
      const programs = await fn({ log })
      allPrograms.push(...programs)
      results.push({ source: name, count: programs.length, status: 'ok', ms: Date.now() - t0 })
      log(`[scraper] ${name} → ${programs.length} programs (${Date.now() - t0}ms)`)
    } catch (err) {
      results.push({ source: name, count: 0, status: 'failed', error: err.message })
      log(`[scraper] ${name} FAILED: ${err.message}`)
    }
  }

  // ── myScheme API (large volume, de-duplicated against curated) ────────────
  if (useMySchemeAPI) {
    const t0 = Date.now()
    try {
      log(`\n[scraper] Running myScheme API (max ${mySchemeMaxPages} pages)…`)
      const programs = await scrapeMyScheme({ maxPages: mySchemeMaxPages, log })
      allPrograms.push(...programs)
      results.push({ source: 'myscheme-api', count: programs.length, status: 'ok', ms: Date.now() - t0 })
      log(`[scraper] myScheme API → ${programs.length} programs (${Date.now() - t0}ms)`)
    } catch (err) {
      results.push({ source: 'myscheme-api', count: 0, status: 'failed', error: err.message })
      log(`[scraper] myScheme API FAILED: ${err.message}`)
      log('[scraper] Continuing with curated sources only…')
    }
  }

  // ── Deduplicate ───────────────────────────────────────────────────────────
  const beforeDedup = allPrograms.length
  const unique = deduplicateByName(allPrograms.filter((p) => p.name?.trim()))
  const dupsRemoved = beforeDedup - unique.length

  // ── Summary ───────────────────────────────────────────────────────────────
  log('\n' + '═'.repeat(60))
  log('  SCRAPE SUMMARY')
  log('═'.repeat(60))
  for (const r of results) {
    const icon = r.status === 'ok' ? '✅' : '❌'
    const timing = r.ms ? `  ${r.ms}ms` : ''
    log(`  ${icon}  ${r.source.padEnd(20)} ${r.count} programs${timing}`)
    if (r.error) log(`       Error: ${r.error}`)
  }
  log('─'.repeat(60))
  log(`  Total raw         : ${beforeDedup}`)
  log(`  Duplicates removed: ${dupsRemoved}`)
  log(`  Unique programs   : ${unique.length}`)
  log('═'.repeat(60))

  return unique
}
