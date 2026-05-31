import { validationResult } from 'express-validator'
import Program from '../models/Program.js'
import EligibilityCheck from '../models/EligibilityCheck.js'
import User from '../models/User.js'
import { analyzeEligibilityWithAI, getAIRecommendations } from '../services/aiService.js'

// Indian Poverty Line (BPL) thresholds — annual INR (approximate)
const INDIA_BPL_ANNUAL = {
  rural:  96000,   // ₹8,000/month
  urban:  120000,  // ₹10,000/month
  default: 100000,
}

// Eligibility checking algorithm — supports both legacy US fields and new Indian pipeline fields
const checkProgramEligibility = (userProfile, program) => {
  let score = 0
  const matchedCriteria   = []
  const unmatchedCriteria = []
  const recommendations   = []

  const criteria = program.eligibilityCriteria || {}

  // ── Age ──────────────────────────────────────────────────────────────────
  if (criteria.minAge != null || criteria.maxAge != null) {
    const age = userProfile.age
    if (age != null) {
      if (criteria.minAge && age < criteria.minAge) {
        unmatchedCriteria.push(`Minimum age required: ${criteria.minAge} years`)
      } else if (criteria.maxAge && age > criteria.maxAge) {
        unmatchedCriteria.push(`Maximum age allowed: ${criteria.maxAge} years`)
      } else {
        matchedCriteria.push('Age requirement met')
        score += 20
      }
    }
  }

  // ── Income ───────────────────────────────────────────────────────────────
  if (criteria.maxIncome != null) {
    const income = userProfile.annualIncome
    if (income != null) {
      if (income <= criteria.maxIncome) {
        matchedCriteria.push(`Income within limit (₹${criteria.maxIncome.toLocaleString('en-IN')}/year)`)
        score += 30
      } else {
        unmatchedCriteria.push(`Annual income exceeds limit of ₹${criteria.maxIncome.toLocaleString('en-IN')}`)
      }
    }
  }

  // ── Household size ───────────────────────────────────────────────────────
  if (criteria.minHouseholdSize || criteria.maxHouseholdSize) {
    const hs = userProfile.householdSize
    if (hs != null) {
      if (criteria.minHouseholdSize && hs < criteria.minHouseholdSize) {
        unmatchedCriteria.push(`Minimum household size: ${criteria.minHouseholdSize}`)
      } else if (criteria.maxHouseholdSize && hs > criteria.maxHouseholdSize) {
        unmatchedCriteria.push(`Maximum household size: ${criteria.maxHouseholdSize}`)
      } else {
        matchedCriteria.push('Household size requirement met')
        score += 15
      }
    }
  }

  // ── Employment status ────────────────────────────────────────────────────
  if (criteria.employmentStatus && criteria.employmentStatus.length > 0) {
    const status = userProfile.employmentStatus
    if (status) {
      if (criteria.employmentStatus.includes(status)) {
        matchedCriteria.push('Employment status requirement met')
        score += 10
      } else {
        unmatchedCriteria.push(`Employment status must be one of: ${criteria.employmentStatus.join(', ')}`)
      }
    }
  }

  // ── Allowed categories (Indian pipeline field) ───────────────────────────
  if (criteria.allowedCategories && criteria.allowedCategories.length > 0) {
    const userCategory = userProfile.category  // e.g. "SC", "OBC", "General"
    if (userCategory) {
      // Match against canonical full names or short codes
      const matched = criteria.allowedCategories.some(cat =>
        cat.toLowerCase().includes(userCategory.toLowerCase()) ||
        userCategory.toLowerCase().includes(cat.toLowerCase().split('(')[0].trim())
      )
      if (matched) {
        matchedCriteria.push(`Category eligible: ${userCategory}`)
        score += 15
      } else {
        unmatchedCriteria.push(`Category not in eligible list: ${criteria.allowedCategories.join(', ')}`)
      }
    } else {
      // No category provided — give partial credit (open to all if no restriction)
      score += 5
    }
  }

  // ── Student requirement ──────────────────────────────────────────────────
  if (criteria.studentRequired === true) {
    if (userProfile.isStudent === true || userProfile.employmentStatus === 'student') {
      matchedCriteria.push('Student status requirement met')
      score += 5
    } else {
      unmatchedCriteria.push('Must be a student to qualify')
    }
  }

  // ── Disability requirement ───────────────────────────────────────────────
  if (criteria.disabilityRequired === true) {
    if (userProfile.hasDisability === true) {
      matchedCriteria.push('Disability requirement met')
      score += 5
    } else {
      unmatchedCriteria.push('Must have a disability to qualify')
    }
  }

  // ── Base score ───────────────────────────────────────────────────────────
  score += 15

  // ── Eligibility decision ─────────────────────────────────────────────────
  const isEligible = unmatchedCriteria.length === 0 && score >= 50

  // ── Recommendations ──────────────────────────────────────────────────────
  if (isEligible) {
    recommendations.push('You appear to be eligible for this program')
    recommendations.push('Gather required documents before applying')
    if (criteria.requiredDocuments && criteria.requiredDocuments.length > 0) {
      recommendations.push(`Required documents: ${criteria.requiredDocuments.join(', ')}`)
    }
  } else {
    recommendations.push('You may not meet all eligibility requirements')
    if (unmatchedCriteria.length > 0) {
      recommendations.push('Review the unmatched criteria below')
    }
  }

  return {
    isEligible,
    score: Math.min(score, 100),
    matchedCriteria,
    unmatchedCriteria,
    recommendations,
  }
}

// @desc    Check eligibility for programs
// @route   POST /api/v1/eligibility/check
// @access  Private
export const checkEligibility = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      })
    }

    const { personalInfo, programIds } = req.body
    
    // Get programs to check
    let programsToCheck
    if (programIds && programIds.length > 0) {
      programsToCheck = await Program.find({ 
        _id: { $in: programIds },
        status: 'active'
      })
    } else {
      programsToCheck = await Program.find({ status: 'active' })
    }

    if (programsToCheck.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No programs found'
      })
    }

    // Check eligibility for each program
    const results = []
    for (const program of programsToCheck) {
      const eligibilityResult = checkProgramEligibility(personalInfo, program)
      
      // Enhance with AI analysis if Groq API key is configured
      let finalResult = eligibilityResult
      if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your-groq-api-key-here') {
        try {
          console.log('🤖 Calling AI enhancement for program:', program.name)
          finalResult = await analyzeEligibilityWithAI(personalInfo, program, eligibilityResult)
          console.log('✅ AI enhancement completed')
        } catch (aiError) {
          console.error('❌ AI enhancement failed, using basic result:', aiError)
        }
      } else {
        console.log('⚠️  Groq AI not configured, skipping AI enhancement')
      }
      
      // Save eligibility check to database
      const check = await EligibilityCheck.create({
        user: req.user.id,
        program: program._id,
        userProfile: personalInfo,
        result: finalResult,
        status: finalResult.isEligible ? 'eligible' : 'not-eligible'
      })

      results.push({
        programId: program._id,
        programName: program.name,
        programType: program.type,
        maxBenefit: program.maxBenefit,
        ...finalResult,
        checkId: check._id,
        checkedAt: check.createdAt
      })
    }

    res.json({
      success: true,
      data: {
        summary: {
          totalPrograms: results.length,
          eligiblePrograms: results.filter(r => r.isEligible).length,
          averageScore: results.reduce((sum, r) => sum + r.score, 0) / results.length
        },
        results
      }
    })
  } catch (error) {
    console.error('Check eligibility error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error during eligibility check'
    })
  }
}

// @desc    Get user's eligibility check history
// @route   GET /api/v1/eligibility/history
// @access  Private
export const getEligibilityHistory = async (req, res) => {
  try {
    const { limit = 10 } = req.query

    const history = await EligibilityCheck.getUserHistory(req.user.id, parseInt(limit))

    res.json({
      success: true,
      count: history.length,
      data: history
    })
  } catch (error) {
    console.error('Get eligibility history error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error'
    })
  }
}

// @desc    Get eligible programs for user
// @route   GET /api/v1/eligibility/eligible
// @access  Private
export const getEligiblePrograms = async (req, res) => {
  try {
    const eligiblePrograms = await EligibilityCheck.getEligiblePrograms(req.user.id)

    res.json({
      success: true,
      count: eligiblePrograms.length,
      data: eligiblePrograms
    })
  } catch (error) {
    console.error('Get eligible programs error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error'
    })
  }
}

// @desc    Update application status
// @route   PUT /api/v1/eligibility/:id/application
// @access  Private
export const updateApplicationStatus = async (req, res) => {
  try {
    const { status, notes } = req.body
    
    const check = await EligibilityCheck.findOne({
      _id: req.params.id,
      user: req.user.id
    })

    if (!check) {
      return res.status(404).json({
        success: false,
        error: 'Eligibility check not found'
      })
    }

    await check.updateApplicationStatus(status, notes)

    res.json({
      success: true,
      data: check,
      message: 'Application status updated successfully'
    })
  } catch (error) {
    console.error('Update application status error:', error)
    
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        error: 'Eligibility check not found'
      })
    }
    
    res.status(500).json({
      success: false,
      error: 'Server error'
    })
  }
}

// @desc    Get single eligibility check
// @route   GET /api/v1/eligibility/:id
// @access  Private
export const getEligibilityCheck = async (req, res) => {
  try {
    const check = await EligibilityCheck.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate('program', 'name type agency maxBenefit applicationProcess')

    if (!check) {
      return res.status(404).json({
        success: false,
        error: 'Eligibility check not found'
      })
    }

    res.json({
      success: true,
      data: check
    })
  } catch (error) {
    console.error('Get eligibility check error:', error)
    
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        error: 'Eligibility check not found'
      })
    }
    
    res.status(500).json({
      success: false,
      error: 'Server error'
    })
  }
}
