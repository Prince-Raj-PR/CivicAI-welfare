import mongoose from 'mongoose'

const applicationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    program: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Program',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'under_review', 'approved', 'denied', 'withdrawn'],
      default: 'draft',
      index: true,
    },
    formData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {},
    },
    eligibilityScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    submissionDate: {
      type: Date,
    },
    reviewDate: {
      type: Date,
    },
    decisionDate: {
      type: Date,
    },
    assignedReviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewerNotes: {
      type: String,
    },
    denialReason: {
      type: String,
    },
    documents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
      },
    ],
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes for efficient queries
applicationSchema.index({ user: 1, status: 1 })
applicationSchema.index({ program: 1, status: 1 })
applicationSchema.index({ assignedReviewer: 1, status: 1 })
applicationSchema.index({ createdAt: -1 })

// Virtual for application age
applicationSchema.virtual('applicationAge').get(function () {
  if (this.submissionDate) {
    return Math.floor((Date.now() - this.submissionDate.getTime()) / (1000 * 60 * 60 * 24))
  }
  return null
})

// Method to submit application
applicationSchema.methods.submit = async function () {
  if (this.status !== 'draft') {
    throw new Error('Only draft applications can be submitted')
  }
  this.status = 'submitted'
  this.submissionDate = new Date()
  return this.save()
}

// Method to approve application
applicationSchema.methods.approve = async function (reviewerId, notes) {
  if (this.status !== 'under_review') {
    throw new Error('Only applications under review can be approved')
  }
  this.status = 'approved'
  this.decisionDate = new Date()
  this.assignedReviewer = reviewerId
  if (notes) this.reviewerNotes = notes
  return this.save()
}

// Method to deny application
applicationSchema.methods.deny = async function (reviewerId, reason, notes) {
  if (this.status !== 'under_review') {
    throw new Error('Only applications under review can be denied')
  }
  this.status = 'denied'
  this.decisionDate = new Date()
  this.assignedReviewer = reviewerId
  this.denialReason = reason
  if (notes) this.reviewerNotes = notes
  return this.save()
}

// Method to withdraw application
applicationSchema.methods.withdraw = async function () {
  if (['approved', 'denied'].includes(this.status)) {
    throw new Error('Cannot withdraw approved or denied applications')
  }
  this.status = 'withdrawn'
  return this.save()
}

// Static method to get user's applications
applicationSchema.statics.findByUser = function (userId, status = null) {
  const query = { user: userId }
  if (status) query.status = status
  return this.find(query)
    .populate('program', 'name category agency benefitType')
    .sort({ createdAt: -1 })
}

// Static method to get applications for review
applicationSchema.statics.findForReview = function (status = 'submitted') {
  return this.find({ status })
    .populate('user', 'firstName lastName email')
    .populate('program', 'name category agency')
    .sort({ submissionDate: 1 })
}

// Static method to get reviewer's assigned applications
applicationSchema.statics.findByReviewer = function (reviewerId) {
  return this.find({ assignedReviewer: reviewerId, status: 'under_review' })
    .populate('user', 'firstName lastName email')
    .populate('program', 'name category agency')
    .sort({ reviewDate: 1 })
}

const Application = mongoose.model('Application', applicationSchema)

export default Application
