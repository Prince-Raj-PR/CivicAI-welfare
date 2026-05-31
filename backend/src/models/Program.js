import mongoose from 'mongoose'

/**
 * Program model — stores both manually-created programs and records
 * imported from the Python AI ingestion pipeline (schemes.json).
 *
 * Pipeline field mapping (schemes.json → MongoDB):
 *   scheme_name          → name
 *   description          → description
 *   income_max           → eligibilityCriteria.maxIncome
 *   allowed_categories   → eligibilityCriteria.allowedCategories
 *   age_min              → eligibilityCriteria.minAge
 *   age_max              → eligibilityCriteria.maxAge
 *   student_required     → eligibilityCriteria.studentRequired
 *   disability_required  → eligibilityCriteria.disabilityRequired
 *   state                → state
 *   benefit              → benefits.description
 *   required_documents   → eligibilityCriteria.requiredDocuments
 *   application_process  → applicationProcess.steps[0]
 *   _source              → pipelineSource
 *   _pipeline_run        → pipelineRun
 */
const programSchema = new mongoose.Schema(
  {
    // ── Core identity ────────────────────────────────────────────────────────
    name: {
      type:      String,
      required:  [true, 'Program name is required'],
      trim:      true,
      maxlength: [300, 'Program name cannot exceed 300 characters'],
    },
    description: {
      type:      String,
      required:  [true, 'Program description is required'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },

    // ── Classification ───────────────────────────────────────────────────────
    type: {
      type:    String,
      required:[true, 'Program type is required'],
      enum: [
        'Healthcare',
        'Food Assistance',
        'Housing',
        'Education',
        'Employment',
        'Financial Aid',
        'Childcare',
        'Disability',
        'Veterans',
        'Seniors',
        'Other',
      ],
      default: 'Other',
    },
    agency: {
      type:    String,
      required:[true, 'Agency name is required'],
      trim:    true,
    },

    // ── Geography ────────────────────────────────────────────────────────────
    // location: human-readable string ("Nationwide", "Maharashtra", …)
    location: {
      type:    String,
      trim:    true,
      default: 'Nationwide',
    },
    // state: canonical state name from the pipeline normalizer
    state: {
      type:    String,
      trim:    true,
      default: 'All India',
    },

    // ── Eligibility criteria ─────────────────────────────────────────────────
    eligibilityCriteria: {
      // Age
      minAge: { type: Number, min: 0, max: 120 },
      maxAge: { type: Number, min: 0, max: 120 },

      // Income (annual INR — from pipeline income_max)
      maxIncome: { type: Number, min: 0 },

      // Household
      minHouseholdSize: { type: Number, min: 1 },
      maxHouseholdSize: { type: Number, min: 1 },

      // Employment (legacy field kept for backward compatibility)
      employmentStatus: [
        {
          type: String,
          enum: ['employed', 'unemployed', 'self-employed', 'retired', 'student'],
        },
      ],

      // Documents (from pipeline required_documents)
      requiredDocuments:    [String],
      additionalRequirements:[String],

      // Indian pipeline fields
      // Canonical full names: "Scheduled Caste (SC)", "Below Poverty Line (BPL)", …
      allowedCategories:  [String],
      studentRequired:    { type: Boolean, default: null },
      disabilityRequired: { type: Boolean, default: null },
    },

    // ── Benefits ─────────────────────────────────────────────────────────────
    benefits: {
      type: {
        type:    String,
        enum:    ['monetary', 'service', 'voucher', 'tax-credit', 'other'],
        default: 'service',
      },
      amount:      { type: Number, min: 0 },
      frequency: {
        type: String,
        enum: ['one-time', 'monthly', 'quarterly', 'annually'],
      },
      // Free-text benefit description (from pipeline benefit field)
      description: { type: String, maxlength: 1000 },
    },
    maxBenefit: { type: Number, default: 0, min: 0 },

    // ── Application process ──────────────────────────────────────────────────
    applicationProcess: {
      url:           String,
      // steps[0] holds the pipeline application_process string
      steps:         [String],
      estimatedTime: String,
      contactInfo: {
        phone:   String,
        email:   String,
        website: String,
      },
    },

    // ── Status & lifecycle ───────────────────────────────────────────────────
    status: {
      type:    String,
      enum:    ['active', 'inactive', 'pending', 'expired'],
      default: 'active',
    },
    startDate: Date,
    endDate:   Date,

    // ── Metadata ─────────────────────────────────────────────────────────────
    tags:  [String],
    views: { type: Number, default: 0, min: 0 },
    applications: { type: Number, default: 0, min: 0 },

    // Data origin: "manual" | "ai-pipeline" | "seed"
    source: { type: String, default: 'manual', trim: true },

    // Pipeline provenance (populated when source === "ai-pipeline")
    pipelineSource: { type: String, trim: true }, // schemes.json _source
    pipelineRun:    { type: String, trim: true }, // schemes.json _pipeline_run
  },
  {
    timestamps: true,
  }
)

// ── Indexes ──────────────────────────────────────────────────────────────────
programSchema.index({ name: 'text', description: 'text', tags: 'text' })
programSchema.index({ type: 1 })
programSchema.index({ status: 1 })
programSchema.index({ state: 1 })
programSchema.index({ location: 1 })
programSchema.index({ source: 1 })
programSchema.index({ 'eligibilityCriteria.maxIncome': 1 })
programSchema.index({ 'eligibilityCriteria.allowedCategories': 1 })

// ── Instance methods ─────────────────────────────────────────────────────────
programSchema.methods.incrementViews = async function () {
  this.views += 1
  return this.save()
}

programSchema.methods.incrementApplications = async function () {
  this.applications += 1
  return this.save()
}

// ── Static methods ───────────────────────────────────────────────────────────
programSchema.statics.searchPrograms = async function (query) {
  return this.find(
    { $text: { $search: query }, status: 'active' },
    { score: { $meta: 'textScore' } }
  ).sort({ score: { $meta: 'textScore' } })
}

/**
 * Find programs that match a user profile from the eligibility check.
 * Filters by income, age, category, and state.
 */
programSchema.statics.findEligible = async function ({
  annualIncome,
  age,
  category,
  state,
  isStudent,
  hasDisability,
} = {}) {
  const query = { status: 'active' }

  if (annualIncome != null) {
    query.$or = [
      { 'eligibilityCriteria.maxIncome': { $gte: annualIncome } },
      { 'eligibilityCriteria.maxIncome': { $exists: false } },
      { 'eligibilityCriteria.maxIncome': null },
    ]
  }

  if (age != null) {
    query.$and = [
      {
        $or: [
          { 'eligibilityCriteria.minAge': { $lte: age } },
          { 'eligibilityCriteria.minAge': { $exists: false } },
        ],
      },
      {
        $or: [
          { 'eligibilityCriteria.maxAge': { $gte: age } },
          { 'eligibilityCriteria.maxAge': { $exists: false } },
        ],
      },
    ]
  }

  if (state) {
    query.$or = [
      { state: 'All India' },
      { state: new RegExp(state, 'i') },
    ]
  }

  return this.find(query).sort({ createdAt: -1 })
}

const Program = mongoose.model('Program', programSchema)

export default Program
