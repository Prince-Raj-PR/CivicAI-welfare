import express from 'express'
import { body } from 'express-validator'
import { 
  checkEligibility, 
  getEligibilityHistory, 
  saveEligibilityResult 
} from '../controllers/eligibility.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()

// @route   POST /api/v1/eligibility/check
// @desc    Check eligibility for programs
// @access  Private
router.post('/check', protect, [
  body('personalInfo').isObject().withMessage('Personal information is required'),
  body('personalInfo.age').isNumeric().withMessage('Age must be a number'),
  body('personalInfo.income').isNumeric().withMessage('Income must be a number'),
  body('personalInfo.householdSize').isNumeric().withMessage('Household size must be a number'),
  body('personalInfo.state').notEmpty().withMessage('State is required')
], checkEligibility)

// @route   GET /api/v1/eligibility/history
// @desc    Get user's eligibility check history
// @access  Private
router.get('/history', protect, getEligibilityHistory)

// @route   POST /api/v1/eligibility/save
// @desc    Save eligibility result
// @access  Private
router.post('/save', protect, [
  body('programId').notEmpty().withMessage('Program ID is required'),
  body('eligible').isBoolean().withMessage('Eligible status must be boolean'),
  body('score').isNumeric().withMessage('Score must be a number')
], saveEligibilityResult)

export default router