/**
 * programFetcher.js
 * Thin wrapper around the scraper that the admin controller calls.
 * Replaces the old Python pipeline / schemes.json approach.
 */

import { runScraper } from '../scripts/scraper/scraper.js'
import Program from '../models/Program.js'

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function toMongooseDoc(p) {
  return {
    name: p.name,
    description: p.description || 'No description available.',
    type: p.type || 'Other',
    agency: p.agency || 'Government of India',
    location: p.location || 'Nationwide',
    state: p.state || 'All India',
    eligibilityCriteria: {
      minAge: p.eligibilityCriteria?.minAge ?? undefined,
      maxAge: p.eligibilityCriteria?.maxAge ?? undefined,
      maxIncome: p.eligibilityCriteria?.maxIncome ?? undefined,
      allowedCategories: p.eligibilityCriteria?.allowedCategories ?? [],
      requiredDocuments: p.eligibilityCriteria?.requiredDocuments ?? [],
      studentRequired: p.eligibilityCriteria?.studentRequired ?? null,
      disabilityRequired: p.eligibilityCriteria?.disabilityRequired ?? null,
    },
    benefits: {
      type: p.benefits?.type || 'other',
      amount: p.benefits?.amount ?? undefined,
      frequency: p.benefits?.frequency ?? undefined,
      description: p.benefits?.description || '',
    },
    applicationProcess: {
      url: p.applicationProcess?.url || '',
      steps: p.applicationProcess?.steps ?? [],
    },
    tags: p.tags ?? [],
    status: p.status || 'active',
    source: 'ai-pipeline',
    pipelineSource: p.pipelineSource || 'scraper',
    pipelineRun: new Date().toISOString(),
  }
}

/**
 * Run the scraper and upsert all results into MongoDB.
 * Accepts an optional `logFn` for streaming logs to the caller.
 *
 * @param {object} opts
 * @param {boolean} opts.clear         - delete existing ai-pipeline records first
 * @param {boolean} opts.useMySchemeAPI
 * @param {number}  opts.mySchemeMaxPages
 * @param {function} opts.logFn        - called with each log string
 * @returns {Promise<{imported, updated, failed, total}>}
 */
export const fetchAndImportPrograms = async ({
  clear = false,
  useMySchemeAPI = true,
  mySchemeMaxPages = 10,
  logFn = console.log,
} = {}) => {
  logFn('🚀 Starting CivicAI scraper…')

  // 1. Run scraper
  const programs = await runScraper({
    useMySchemeAPI,
    mySchemeMaxPages,
    verbose: true,
    // Pipe scraper internal logs through logFn
  })

  logFn(`📋 Scraper returned ${programs.length} programs`)

  if (programs.length === 0) {
    return { imported: 0, updated: 0, failed: 0, total: 0 }
  }

  // 2. Optionally clear existing pipeline records
  if (clear) {
    const deleted = await Program.deleteMany({ source: 'ai-pipeline' })
    logFn(`🗑️  Cleared ${deleted.deletedCount} existing pipeline records`)
  }

  // 3. Upsert
  let imported = 0
  let updated = 0
  let failed = 0

  logFn(`📥 Upserting ${programs.length} programs into MongoDB…`)

  for (const p of programs) {
    try {
      const doc = toMongooseDoc(p)
      const existing = await Program.findOne({
        name: { $regex: new RegExp(`^${escapeRegex(doc.name)}$`, 'i') },
        source: 'ai-pipeline',
      })

      if (existing) {
        await Program.findByIdAndUpdate(existing._id, { $set: doc }, { runValidators: false })
        updated++
      } else {
        await Program.create(doc)
        imported++
      }
    } catch (err) {
      failed++
      logFn(`  ❌ Failed: ${p.name} — ${err.message}`)
    }
  }

  logFn(`\n✅ Done — imported: ${imported}, updated: ${updated}, failed: ${failed}`)

  return { imported, updated, failed, total: programs.length }
}

export default { fetchAndImportPrograms }
