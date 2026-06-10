/**
 * CivicAI – Scheme Seeder
 * ========================
 * Runs the scraper and upserts all programs into MongoDB.
 *
 * Usage:
 *   node src/scripts/scraper/seed.js              # scrape + upsert
 *   node src/scripts/scraper/seed.js --clear      # drop existing ai-pipeline records first
 *   node src/scripts/scraper/seed.js --dry-run    # scrape only, no DB writes
 *   node src/scripts/scraper/seed.js --no-api     # skip myScheme API, use curated only
 *   node src/scripts/scraper/seed.js --pages 5    # limit myScheme API to 5 pages
 *
 * npm script shortcut (add to package.json):
 *   "scrape": "node src/scripts/scraper/seed.js"
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { runScraper } from './scraper.js'
import Program from '../../models/Program.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../../../.env') })

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const CLEAR_EXISTING = args.includes('--clear')
const DRY_RUN = args.includes('--dry-run')
const NO_API = args.includes('--no-api')
const pagesArg = args.find((a) => a.startsWith('--pages'))
const MY_SCHEME_MAX_PAGES = pagesArg ? parseInt(pagesArg.split('=')[1] || args[args.indexOf(pagesArg) + 1], 10) : 400

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Map a scraped program object to the Program Mongoose model shape.
 * Handles all possible field variations from different scrapers.
 */
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
    source: p.source || 'ai-pipeline',
    pipelineSource: p.pipelineSource || 'scraper',
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('\n🌐 CivicAI Scheme Seeder')
  console.log('─'.repeat(50))

  if (DRY_RUN) console.log('⚠️  DRY RUN — no database writes')
  if (CLEAR_EXISTING) console.log('⚠️  --clear flag set — will remove existing ai-pipeline records')
  if (NO_API) console.log('ℹ️  --no-api — skipping myScheme API, using curated sources only')

  // ── 1. Scrape ─────────────────────────────────────────────────────────────
  let programs
  try {
    programs = await runScraper({
      useMySchemeAPI: !NO_API,
      mySchemeMaxPages: MY_SCHEME_MAX_PAGES,
      verbose: true,
    })
  } catch (err) {
    console.error('❌ Scraper failed:', err.message)
    process.exit(1)
  }

  if (programs.length === 0) {
    console.warn('⚠️  No programs scraped — nothing to seed')
    process.exit(0)
  }

  if (DRY_RUN) {
    console.log(`\n✅ Dry run complete — ${programs.length} programs would be seeded`)
    console.log('\nSample (first 3):')
    programs.slice(0, 3).forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name} [${p.type}] — ${p.state}`)
    })
    process.exit(0)
  }

  // ── 2. Connect to MongoDB ─────────────────────────────────────────────────
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not set in .env')
    process.exit(1)
  }

  console.log('\n🔗 Connecting to MongoDB…')
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('✅ Connected')

  // ── 3. Optionally clear existing pipeline records ──────────────────────────
  if (CLEAR_EXISTING) {
    const deleted = await Program.deleteMany({ source: 'ai-pipeline' })
    console.log(`🗑️  Cleared ${deleted.deletedCount} existing ai-pipeline records`)
  }

  // ── 4. Upsert each program ────────────────────────────────────────────────
  console.log(`\n📥 Upserting ${programs.length} programs…\n`)

  let inserted = 0
  let updated = 0
  let failed = 0

  for (const p of programs) {
    try {
      const doc = toMongooseDoc(p)

      const result = await Program.findOneAndUpdate(
        {
          // Match by normalized name (case-insensitive)
          name: { $regex: new RegExp(`^${escapeRegex(doc.name)}$`, 'i') },
          source: 'ai-pipeline',
        },
        { $set: doc },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )

      // Mongoose doesn't expose wasNew on findOneAndUpdate easily;
      // use updatedExisting from the raw result
      const wasNew = result.createdAt?.getTime() === result.updatedAt?.getTime()
      wasNew ? inserted++ : updated++

      process.stdout.write(wasNew ? '+' : '.')
    } catch (err) {
      failed++
      process.stdout.write('✗')
      if (process.env.NODE_ENV === 'development') {
        console.error(`\n  ❌ Failed to upsert "${p.name}": ${err.message}`)
      }
    }
  }

  process.stdout.write('\n')

  // ── 5. Summary ────────────────────────────────────────────────────────────
  const total = await Program.countDocuments()

  console.log('\n' + '═'.repeat(60))
  console.log('  SEED SUMMARY')
  console.log('═'.repeat(60))
  console.log(`  ✅  New records inserted : ${inserted}`)
  console.log(`  🔄  Existing updated     : ${updated}`)
  console.log(`  ❌  Failed               : ${failed}`)
  console.log(`  📚  Total in database    : ${total}`)
  console.log('═'.repeat(60))

  await mongoose.disconnect()
  console.log('\n🔌 Disconnected from MongoDB')
  console.log('✅ Done\n')
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

seed().catch((err) => {
  console.error('❌ Unhandled error:', err)
  process.exit(1)
})
