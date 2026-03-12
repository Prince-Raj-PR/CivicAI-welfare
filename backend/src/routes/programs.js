import express from 'express'
import { body } from 'express-validator'
import { 
  getPrograms, 
  getProgram, 
  createProgram, 
  updateProgram, 
  deleteProgram,
  searchPrograms 
} from '../controllers/programs.js'
import { protect, authorize } from '../middleware/auth.js'

const router = express.Router()

// @route   GET /api/v1/programs
// @desc    Get all programs
// @access  Public
router.get('/', getPrograms)

// @route   GET /api/v1/programs/search
// @desc    Search programs
// @access  Public
router.get('/search', searchPrograms)

// @route   GET /api/v1/programs/:id
// @desc    Get single program
// @access  Public
router.get('/:id', getProgram)

// @route   POST /api/v1/programs
// @desc    Create new program (admin only)
// @access  Private/Admin
router.post('/', protect, authorize('admin'), [
  body('name').notEmpty().withMessage('Program name is required'),
  body('description').notEmpty().withMessage('Program description is required'),
  body('type').notEmpty().withMessage('Program type is required'),
  body('agency').notEmpty().withMessage('Agency is required'),
  body('eligibilityCriteria').isArray().withMessage('Eligibility criteria must be an array')
], createProgram)

// @route   PUT /api/v1/programs/:id
// @desc    Update program (admin only)
// @access  Private/Admin
router.put('/:id', protect, authorize('admin'), updateProgram)

// @route   DELETE /api/v1/programs/:id
// @desc    Delete program (admin only)
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), deleteProgram)

export default router