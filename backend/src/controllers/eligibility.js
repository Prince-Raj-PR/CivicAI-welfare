import { validationResult } from 'express-validator'
import Program from '../models/Program.js'
import EligibilityCheck from '../models/EligibilityCheck.js'
import User from '../models/User.js'

// Federal Poverty Guidelines 2024 (simplified)
const povertyGuidelines = {
  1: 15060,
  2: 20440,
  3: 25820,
  4: 31200,
  5: 36580,
  6: 41960,
  7: 47340,
  8: 52720
}

// Calculate poverty line for household size
const getPovertyLine = (householdSize) => {
  if (householdSize <= 8) {
    return povertyGuidelines[householdSize]
  }
  // For each additional person, add $5,380
  return povertyGuidelines[8] + ((householdSize - 8) * 5380)
}

// Simple eligibility checking algorithm
const checkProgramEligibility = (userProfile, program) => {
  let score = 0
  let matchedCriteria = []
  let unmatchedCriteria = []
  let recommendations = []

  const criteria = program.eligibilityCriteria

  // Check age requirements
  if (criteria.minAge !== undefined || criteria.maxAge !== undefined) {
    const age = userProfile.age
    if (age) {
      if (criteria.minAge && age < criteria.minAge) {
        unmatchedCriteria.push(`Age must be at least ${criteria.minAge}`)
      } else if (criteria.maxAge && age > criteria.maxAge) {
        unmatchedCriteria.push(`Age must be at most ${criteria.maxAge}`)
      } else {
        matchedCriteria.push('Age requirement met')
        score += 20
      }
    }
  }

  // Check income requirements
  if (criteria.maxIncome !== undefined) {
    const income = userProfile.annualIncome
    if (income !== undefined) {
      if (income <= criteria.maxIncome) {
        matchedCriteria.push('Income requirement met')
        score += 30
      } else {
        unmatchedCriteria.push(`Income exceeds maximum of $${criteria.maxIncome}`)
      }
    }
  }

  // Check household size requirements
  if (criteria.minHouseholdSize || criteria.maxHouseholdSize) {
    const householdSize = userProfile.householdSize
    if (householdSize) {
      if (criteria.minHouseholdSize && householdSize < criteria.minHouseholdSize) {
        unmatchedCriteria.push(`Household size must be at least ${criteria.minHouseholdSize}`)
      } else if (criteria.maxHouseholdSize && householdSize > criteria.maxHouseholdSize) {
        unmatchedCriteria.push(`Household size must be at most ${criteria.maxHouseholdSize}`)
      } else {
        matchedCriteria.push('Household size requirement met')
        score += 20
      }
    }
  }

  // Check employment status
  if (criteria.employmentStatus && criteria.employmentStatus.length > 0) {
    const status = userProfile.employmentStatus
    if (status) {
      if (criteria.employmentStatus.includes(status)) {
        matchedCriteria.push('Employment status requirement met')
        score += 15
      } else {
        unmatchedCriteria.push(`Employment status must be one of: ${criteria.employmentStatus.join(', ')}`)
      }
    }
  }

  // Base score for checking
  score += 15

  // Determine eligibility
  const isEligible = unmatchedCriteria.length === 0 && score >= 50

  // Generate recommendations
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
    recommendations
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
      
      // Save eligibility check to database
      const check = await EligibilityCheck.create({
        user: req.user.id,
        program: program._id,
        userProfile: personalInfo,
        result: eligibilityResult,
        status: eligibilityResult.isEligible ? 'eligible' : 'not-eligible'
      })

      results.push({
        programId: program._id,
        programName: program.name,
        programType: program.type,
        maxBenefit: program.maxBenefit,
        ...eligibilityResult,
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
