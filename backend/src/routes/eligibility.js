import express from 'express'
import { body } from 'express-validator'
import { 
  checkEligibility, 
  getEligibilityHistory,
  getEligiblePrograms,
  updateApplicationStatus,
  getEligibilityCheck
} from '../controllers/eligibility.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()

// @route   POST /api/v1/eligibility/check
// @desc    Check eligibility for programs
// @access  Private
router.post('/check', protect, [
  body('personalInfo').isObject().withMessage('Personal information is required'),
  body('personalInfo.age').optional().isNumeric().withMessage('Age must be a number'),
  body('personalInfo.annualIncome').optional().isNumeric().withMessage('Income must be a number'),
  body('personalInfo.householdSize').optional().isNumeric().withMessage('Household size must be a number'),
  body('personalInfo.employmentStatus').optional().isString().withMessage('Employment status must be a string'),
  body('programIds').optional().isArray().withMessage('Program IDs must be an array')
], checkEligibility)

// @route   GET /api/v1/eligibility/history
// @desc    Get user's eligibility check history
// @access  Private
router.get('/history', protect, getEligibilityHistory)

// @route   GET /api/v1/eligibility/eligible
// @desc    Get eligible programs for user
// @access  Private
router.get('/eligible', protect, getEligiblePrograms)

// @route   GET /api/v1/eligibility/:id
// @desc    Get single eligibility check
// @access  Private
router.get('/:id', protect, getEligibilityCheck)

// @route   PUT /api/v1/eligibility/:id/application
// @desc    Update application status
// @access  Private
router.put('/:id/application', protect, [
  body('status').isIn(['not-started', 'in-progress', 'submitted', 'approved', 'rejected'])
    .withMessage('Invalid application status'),
  body('notes').optional().isString().withMessage('Notes must be a string')
], updateApplicationStatus)

export default router
