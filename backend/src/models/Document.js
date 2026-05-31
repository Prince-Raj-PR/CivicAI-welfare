import mongoose from 'mongoose'

const documentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      index: true,
    },
    documentType: {
      type: String,
      required: true,
      enum: [
        'id_proof',
        'address_proof',
        'income_proof',
        'birth_certificate',
        'disability_certificate',
        'veteran_certificate',
        'student_id',
        'bank_statement',
        'tax_return',
        'utility_bill',
        'other',
      ],
      index: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    // Storage information (for future S3 integration)
    storageProvider: {
      type: String,
      enum: ['local', 's3', 'azure', 'gcs'],
      default: 'local',
    },
    storagePath: {
      type: String,
      required: true,
    },
    storageUrl: {
      type: String,
    },
    // Verification
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: {
      type: Date,
    },
    verificationNotes: {
      type: String,
    },
    // OCR/Extraction data
    extractedData: {
      type: mongoose.Schema.Types.Mixed,
    },
    ocrConfidence: {
      type: Number,
      min: 0,
      max: 100,
    },
    // Expiration
    expirationDate: {
      type: Date,
    },
    // Metadata
    description: {
      type: String,
    },
    tags: [String],
  },
  {
    timestamps: true,
  }
)

// Indexes
documentSchema.index({ user: 1, documentType: 1 })
documentSchema.index({ application: 1 })
documentSchema.index({ isVerified: 1 })
documentSchema.index({ expirationDate: 1 })

// Virtual for checking if document is expired
documentSchema.virtual('isExpired').get(function () {
  if (!this.expirationDate) return false
  return this.expirationDate < new Date()
})

// Virtual for days until expiration
documentSchema.virtual('daysUntilExpiration').get(function () {
  if (!this.expirationDate) return null
  const days = Math.floor((this.expirationDate - Date.now()) / (1000 * 60 * 60 * 24))
  return days
})

// Method to verify document
documentSchema.methods.verify = async function (verifierId, notes) {
  this.isVerified = true
  this.verifiedBy = verifierId
  this.verifiedAt = new Date()
  if (notes) this.verificationNotes = notes
  return this.save()
}

// Method to reject verification
documentSchema.methods.rejectVerification = async function (verifierId, notes) {
  this.isVerified = false
  this.verifiedBy = verifierId
  this.verifiedAt = new Date()
  this.verificationNotes = notes
  return this.save()
}

// Static method to find user's documents
documentSchema.statics.findByUser = function (userId, documentType = null) {
  const query = { user: userId }
  if (documentType) query.documentType = documentType
  return this.find(query).sort({ createdAt: -1 })
}

// Static method to find documents for application
documentSchema.statics.findByApplication = function (applicationId) {
  return this.find({ application: applicationId }).sort({ createdAt: -1 })
}

// Static method to find expiring documents
documentSchema.statics.findExpiringSoon = function (days = 30) {
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + days)
  
  return this.find({
    expirationDate: {
      $gte: new Date(),
      $lte: futureDate,
    },
  })
    .populate('user', 'firstName lastName email')
    .sort({ expirationDate: 1 })
}

// Static method to find expired documents
documentSchema.statics.findExpired = function () {
  return this.find({
    expirationDate: { $lt: new Date() },
  })
    .populate('user', 'firstName lastName email')
    .sort({ expirationDate: -1 })
}

const Document = mongoose.model('Document', documentSchema)

export default Document
