import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import Program from '../models/Program.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)

// Path to the AI pipeline output
const SCHEMES_JSON = join(__dirname, '../../data/schemes.json')

// ─────────────────────────────────────────────────────────────────────────────
// Type mapping: pipeline category keywords → Program.type enum
// ─────────────────────────────────────────────────────────────────────────────
const TYPE_MAP = {
  health:      'Healthcare',
  medical:     'Healthcare',
  ayushman:    'Healthcare',
  pmjay:       'Healthcare',
  food:        'Food Assistance',
  nutrition:   'Food Assistance',
  ration:      'Food Assistance',
  pmgkay:      'Food Assistance',
  wic:         'Food Assistance',
  housing:     'Housing',
  awas:        'Housing',
  pmay:        'Housing',
  education:   'Education',
  scholarship: 'Education',
  nsp:         'Education',
  skill:       'Employment',
  employment:  'Employment',
  mgnrega:     'Employment',
  rozgar:      'Employment',
  pmkvy:       'Employment',
  financial:   'Financial Aid',
  pension:     'Financial Aid',
  apy:         'Financial Aid',
  tanf:        'Financial Aid',
  ssi:         'Financial Aid',
  liheap:      'Financial Aid',
  childcare:   'Childcare',
  ccdf:        'Childcare',
  disability:  'Disability',
  divyang:     'Disability',
  veteran:     'Veterans',
  senior:      'Seniors',
  elderly:     'Seniors',
}

/**
 * Derive a Program.type enum value from a scheme name / benefit string.
 */
const inferType = (schemeName = '', benefit = '') => {
  const text = `${schemeName} ${benefit}`.toLowerCase()
  for (const [keyword, type] of Object.entries(TYPE_MAP)) {
    if (text.includes(keyword)) return type
  }
  return 'Other'
}

/**
 * Convert a pipeline scheme record → Program document shape.
 */
const schemeToProgram = (scheme) => {
  const name        = scheme.scheme_name || 'Unknown Scheme'
  const description = scheme.description || ''
  const incomeMax   = typeof scheme.income_max === 'number' ? scheme.income_max : null
  const ageMin      = typeof scheme.age_min    === 'number' ? scheme.age_min    : undefined
  const ageMax      = typeof scheme.age_max    === 'number' ? scheme.age_max    : undefined
  const state       = scheme.state || 'All India'
  const benefit     = scheme.benefit || ''
  const docs        = Array.isArray(scheme.required_documents) ? scheme.required_documents : []
  const categories  = Array.isArray(scheme.allowed_categories) ? scheme.allowed_categories : []
  const appProcess  = scheme.application_process || ''

  return {
    name,
    description,
    type:     inferType(name, benefit),
    agency:   'Government of India',
    location: state === 'All India' ? 'Nationwide' : state,
    state,
    eligibilityCriteria: {
      ...(incomeMax !== null && { maxIncome: incomeMax }),
      ...(ageMin    !== undefined && { minAge: ageMin }),
      ...(ageMax    !== undefined && { maxAge: ageMax }),
      requiredDocuments:  docs,
      allowedCategories:  categories,
      studentRequired:    scheme.student_required    ?? null,
      disabilityRequired: scheme.disability_required ?? null,
    },
    benefits: {
      type:        'service',
      description: benefit,
    },
    maxBenefit: 0,
    applicationProcess: {
      steps: appProcess ? [appProcess] : [],
    },
    status:         'active',
    tags:           categories.map(c => c.toLowerCase()),
    pipelineSource: scheme._source    || '',
    pipelineRun:    scheme._pipeline_run || '',
    source:         'ai-pipeline',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Load schemes.json produced by the Python pipeline
// ─────────────────────────────────────────────────────────────────────────────
export const loadSchemesFromPipeline = () => {
  if (!existsSync(SCHEMES_JSON)) {
    console.warn(`⚠️  schemes.json not found at ${SCHEMES_JSON}`)
    console.warn('   Run the Python pipeline first: python3 backend/data/pipeline.py')
    return []
  }

  try {
    const raw = readFileSync(SCHEMES_JSON, 'utf-8')
    const schemes = JSON.parse(raw)
    if (!Array.isArray(schemes)) {
      console.error('❌ schemes.json is not a JSON array')
      return []
    }
    console.log(`📂 Loaded ${schemes.length} scheme(s) from schemes.json`)
    return schemes
  } catch (err) {
    console.error('❌ Failed to read schemes.json:', err.message)
    return []
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Upsert all schemes from the pipeline into MongoDB
// ─────────────────────────────────────────────────────────────────────────────
export const fetchAndImportPrograms = async () => {
  console.log('🚀 Starting program import from AI pipeline (schemes.json)...')

  const schemes = loadSchemesFromPipeline()

  if (schemes.length === 0) {
    return { success: true, imported: 0, updated: 0, skipped: 0, total: 0 }
  }

  let imported = 0
  let updated  = 0
  let skipped  = 0

  for (const scheme of schemes) {
    try {
      const programData = schemeToProgram(scheme)

      // Upsert by name + source to avoid duplicates
      const existing = await Program.findOne({
        name:   programData.name,
        source: 'ai-pipeline',
      })

      if (existing) {
        await Program.findByIdAndUpdate(existing._id, programData, {
          runValidators: false,
        })
        updated++
        console.log(`✏️  Updated: ${programData.name}`)
      } else {
        await Program.create(programData)
        imported++
        console.log(`✅ Imported: ${programData.name}`)
      }
    } catch (err) {
      console.error(`❌ Error importing "${scheme.scheme_name}":`, err.message)
      skipped++
    }
  }

  console.log('\n📈 Import Summary:')
  console.log(`   ✅ Imported : ${imported}`)
  console.log(`   ✏️  Updated  : ${updated}`)
  console.log(`   ❌ Skipped  : ${skipped}`)
  console.log(`   📊 Total    : ${schemes.length}`)

  return {
    success: true,
    imported,
    updated,
    skipped,
    total: schemes.length,
  }
}

export default { fetchAndImportPrograms, loadSchemesFromPipeline }
