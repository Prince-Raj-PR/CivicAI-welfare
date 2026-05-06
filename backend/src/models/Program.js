import mongoose from 'mongoose'

const programSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Program name is required'],
      trim: true,
      maxlength: [200, 'Program name cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Program description is required'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    type: {
      type: String,
      required: [true, 'Program type is required'],
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
    },
    agency: {
      type: String,
      required: [true, 'Agency name is required'],
      trim: true,
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },
    eligibilityCriteria: {
      minAge: {
        type: Number,
        min: 0,
        max: 150,
      },
      maxAge: {
        type: Number,
        min: 0,
        max: 150,
      },
      maxIncome: {
        type: Number,
        min: 0,
      },
      minHouseholdSize: {
        type: Number,
        min: 1,
      },
      maxHouseholdSize: {
        type: Number,
        min: 1,
      },
      employmentStatus: [
        {
          type: String,
          enum: ['employed', 'unemployed', 'self-employed', 'retired', 'student'],
        },
      ],
      requiredDocuments: [String],
      additionalRequirements: [String],
    },
    benefits: {
      type: {
        type: String,
        enum: ['monetary', 'service', 'voucher', 'tax-credit', 'other'],
        default: 'monetary',
      },
      amount: {
        type: Number,
        min: 0,
      },
      frequency: {
        type: String,
        enum: ['one-time', 'monthly', 'quarterly', 'annually'],
      },
      description: String,
    },
    maxBenefit: {
      type: Number,
      default: 0,
      min: 0,
    },
    applicationProcess: {
      url: String,
      steps: [String],
      estimatedTime: String,
      contactInfo: {
        phone: String,
        email: String,
        website: String,
      },
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending', 'expired'],
      default: 'active',
    },
    startDate: Date,
    endDate: Date,
    tags: [String],
    views: {
      type: Number,
      default: 0,
    },
    applications: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes for better query performance
programSchema.index({ name: 'text', description: 'text', tags: 'text' })
programSchema.index({ type: 1 })
programSchema.index({ location: 1 })
programSchema.index({ status: 1 })
programSchema.index({ 'eligibilityCriteria.maxIncome': 1 })

// Method to increment views
programSchema.methods.incrementViews = async function () {
  this.views += 1
  return await this.save()
}

// Method to increment applications
programSchema.methods.incrementApplications = async function () {
  this.applications += 1
  return await this.save()
}

// Static method to search programs
programSchema.statics.searchPrograms = async function (query) {
  return await this.find(
    {
      $text: { $search: query },
      status: 'active',
    },
    {
      score: { $meta: 'textScore' },
    }
  ).sort({ score: { $meta: 'textScore' } })
}

const Program = mongoose.model('Program', programSchema)

export default Program
