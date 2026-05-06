import mongoose from 'mongoose'

const eligibilityCheckSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    program: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Program',
      required: true,
    },
    userProfile: {
      age: Number,
      householdSize: Number,
      annualIncome: Number,
      employmentStatus: String,
      location: String,
    },
    result: {
      isEligible: {
        type: Boolean,
        required: true,
      },
      score: {
        type: Number,
        min: 0,
        max: 100,
      },
      matchedCriteria: [String],
      unmatchedCriteria: [String],
      recommendations: [String],
    },
    status: {
      type: String,
      enum: ['pending', 'eligible', 'not-eligible', 'needs-review'],
      default: 'pending',
    },
    applicationStatus: {
      type: String,
      enum: ['not-started', 'in-progress', 'submitted', 'approved', 'rejected'],
      default: 'not-started',
    },
    applicationDate: Date,
    notes: String,
  },
  {
    timestamps: true,
  }
)

// Indexes
eligibilityCheckSchema.index({ user: 1, program: 1 })
eligibilityCheckSchema.index({ user: 1, createdAt: -1 })
eligibilityCheckSchema.index({ 'result.isEligible': 1 })
eligibilityCheckSchema.index({ status: 1 })

// Compound index to prevent duplicate checks
eligibilityCheckSchema.index({ user: 1, program: 1, createdAt: -1 })

// Static method to get user's eligibility history
eligibilityCheckSchema.statics.getUserHistory = async function (userId, limit = 10) {
  return await this.find({ user: userId })
    .populate('program', 'name type agency maxBenefit')
    .sort({ createdAt: -1 })
    .limit(limit)
}

// Static method to get eligible programs for user
eligibilityCheckSchema.statics.getEligiblePrograms = async function (userId) {
  return await this.find({
    user: userId,
    'result.isEligible': true,
    status: 'eligible',
  })
    .populate('program')
    .sort({ 'result.score': -1 })
}

// Method to update application status
eligibilityCheckSchema.methods.updateApplicationStatus = async function (status, notes) {
  this.applicationStatus = status
  if (status === 'submitted' && !this.applicationDate) {
    this.applicationDate = new Date()
  }
  if (notes) {
    this.notes = notes
  }
  return await this.save()
}

const EligibilityCheck = mongoose.model('EligibilityCheck', eligibilityCheckSchema)

export default EligibilityCheck
