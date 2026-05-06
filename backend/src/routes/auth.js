import express from 'express'
import { body } from 'express-validator'
import { 
  register, 
  login, 
  getMe, 
  forgotPassword, 
  resetPassword,
  verifyEmail,
  resendVerification 
} from '../controllers/auth.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()

// @route   POST /api/v1/auth/register
// @desc    Register user
// @access  Public
router.post('/register', [
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
], register)

// @route   POST /api/v1/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], login)

// @route   GET /api/v1/auth/me
// @desc    Get current logged in user
// @access  Private
router.get('/me', protect, getMe)

// @route   POST /api/v1/auth/forgot-password
// @desc    Request password reset OTP
// @access  Public
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Please provide a valid email')
], forgotPassword)

// @route   PUT /api/v1/auth/reset-password
// @desc    Reset password with OTP
// @access  Public
router.put('/reset-password', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
], resetPassword)

// @route   POST /api/v1/auth/verify-email
// @desc    Verify email with OTP
// @access  Public
router.post('/verify-email', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
], verifyEmail)

// @route   POST /api/v1/auth/resend-verification
// @desc    Resend verification OTP
// @access  Public
router.post('/resend-verification', [
  body('email').isEmail().withMessage('Please provide a valid email')
], resendVerification)

export default router
