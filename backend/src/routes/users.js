import express from 'express'
import { body } from 'express-validator'
import { 
  getUsers, 
  getUser, 
  updateUser, 
  deleteUser,
  updateProfile 
} from '../controllers/users.js'
import { protect, authorize } from '../middleware/auth.js'

const router = express.Router()

// @route   GET /api/v1/users
// @desc    Get all users (admin only)
// @access  Private/Admin
router.get('/', protect, authorize('admin'), getUsers)

// @route   GET /api/v1/users/:id
// @desc    Get single user
// @access  Private
router.get('/:id', protect, getUser)

// @route   PUT /api/v1/users/:id
// @desc    Update user (admin only)
// @access  Private/Admin
router.put('/:id', protect, authorize('admin'), updateUser)

// @route   DELETE /api/v1/users/:id
// @desc    Delete user (admin only)
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), deleteUser)

// @route   PUT /api/v1/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, [
  body('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
  body('email').optional().isEmail().withMessage('Please provide a valid email'),
  body('phone').optional().isMobilePhone().withMessage('Please provide a valid phone number')
], updateProfile)

export default router