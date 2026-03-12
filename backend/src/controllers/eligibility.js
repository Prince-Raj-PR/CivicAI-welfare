import { validationResult } from 'express-validator'

// Mock eligibility results storage
let eligibilityResults = []

// Mock programs data (same as programs.js)
const programs = [
  {
    id: '1',
    name: 'Supplemental Nutrition Assistance Program (SNAP)',
    eligibilityCriteria: [
      { field: 'income', operator: 'lte', value: 130, unit: 'percent_poverty_line' },
      { field: 'assets', operator: 'lte', value: 2750, unit: 'dollars' }
    ]
  },
  {
    id: '2',
    name: 'Medicaid',
    eligibilityCriteria: [
      { field: 'income', operator: 'lte', value: 138, unit: 'percent_poverty_line' }
    ]
  },
  {
    id: '3',
    name: 'Housing Choice Voucher Program',
    eligibilityCriteria: [
      { field: 'income', operator: 'lte', value: 50, unit: 'percent_area_median_income' }
    ]
  }
]

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
const checkProgramEligibility = (personalInfo, program) => {
  let score = 0
  let maxScore = program.eligibilityCriteria.length
  let eligible = true
  let reasons = []

  for (const criteria of program.eligibilityCriteria) {
    const { field, operator, value, unit } = criteria
    let userValue = personalInfo[field]
    let threshold = value

    // Convert values based on unit
    if (unit === 'percent_poverty_line') {
      const povertyLine = getPovertyLine(personalInfo.householdSize)
      threshold = (value / 100) * povertyLine
    } else if (unit === 'percent_area_median_income') {
      // Simplified - using national median income
      const medianIncome = 70000
      threshold = (value / 100) * medianIncome
    }

    // Check criteria
    let criteriaMatch = false
    switch (operator) {
      case 'lte':
        criteriaMatch = userValue <= threshold
        break
      case 'gte':
        criteriaMatch = userValue >= threshold
        break
      case 'eq':
        criteriaMatch = userValue === value
        break
      default:
        criteriaMatch = false
    }

    if (criteriaMatch) {
      score++
      reasons.push(`✓ ${field} requirement met`)
    } else {
      eligible = false
      reasons.push(`✗ ${field} requirement not met (${userValue} vs ${threshold})`)
    }
  }

  return {
    eligible,
    score: (score / maxScore) * 100,
    reasons,
    details: {
      criteriaMatched: score,
      totalCriteria: maxScore
    }
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
    
    // If no specific programs requested, check all
    const programsToCheck = programIds ? 
      programs.filter(p => programIds.includes(p.id)) : 
      programs

    const results = programsToCheck.map(program => {
      const eligibilityResult = checkProgramEligibility(personalInfo, program)
      
      return {
        programId: program.id,
        programName: program.name,
        ...eligibilityResult,
        checkedAt: new Date().toISOString()
      }
    })

    // Save results for history
    const checkResult = {
      id: Date.now().toString(),
      userId: req.user.id,
      personalInfo,
      results,
      createdAt: new Date().toISOString()
    }
    
    eligibilityResults.push(checkResult)

    res.json({
      success: true,
      data: {
        checkId: checkResult.id,
        summary: {
          totalPrograms: results.length,
          eligiblePrograms: results.filter(r => r.eligible).length,
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
    const userResults = eligibilityResults.filter(result => result.userId === req.user.id)
    
    // Sort by most recent first
    userResults.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    res.json({
      success: true,
      count: userResults.length,
      data: userResults.map(result => ({
        id: result.id,
        createdAt: result.createdAt,
        summary: {
          totalPrograms: result.results.length,
          eligiblePrograms: result.results.filter(r => r.eligible).length,
          averageScore: result.results.reduce((sum, r) => sum + r.score, 0) / result.results.length
        },
        results: result.results
      }))
    })
  } catch (error) {
    console.error('Get eligibility history error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error'
    })
  }
}

// @desc    Save eligibility result
// @route   POST /api/v1/eligibility/save
// @access  Private
export const saveEligibilityResult = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      })
    }

    const { programId, eligible, score, notes } = req.body
    
    const savedResult = {
      id: Date.now().toString(),
      userId: req.user.id,
      programId,
      eligible,
      score,
      notes: notes || '',
      savedAt: new Date().toISOString()
    }

    // In a real app, you'd save this to a separate collection
    // For now, we'll just return success
    
    res.status(201).json({
      success: true,
      data: savedResult,
      message: 'Eligibility result saved successfully'
    })
  } catch (error) {
    console.error('Save eligibility result error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error'
    })
  }
}