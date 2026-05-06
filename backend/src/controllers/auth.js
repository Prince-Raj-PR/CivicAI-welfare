import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import User from '../models/User.js'
import { 
  sendVerificationEmail, 
  sendPasswordResetEmail, 
  sendWelcomeEmail,
  generateVerificationOTP,
  generateResetOTP 
} from '../utils/emailService.js'
import { 
  handleValidationErrors, 
  formatUserResponse, 
  errorResponses 
} from '../utils/authHelpers.js'

// Generate JWT Token
const generateToken = (userId, email, role = 'user') => {
  return jwt.sign({ id: userId, email, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  })
}

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    if (handleValidationErrors(req, res)) return

    const { firstName, lastName, email, password, phone } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) return errorResponses.userExists(res)

    // Generate verification OTP (6 digits)
    const verificationOTP = generateVerificationOTP()
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Create user (password will be hashed by pre-save hook)
    const user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password,
      profile: {
        phone: phone || null
      },
      emailVerificationOTP: verificationOTP,
      emailVerificationOTPExpires: otpExpires
    })

    // Send verification email (don't fail registration if email fails)
    try {
      await sendVerificationEmail(email, firstName, verificationOTP)
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError)
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email for the verification code.',
      data: { user: user.toPublicJSON() }
    })
  } catch (error) {
    console.error('Register error:', error)
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return errorResponses.userExists(res)
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: Object.values(error.errors).map(err => err.message).join(', ')
      })
    }
    
    errorResponses.serverError(res, 'Server error during registration')
  }
}

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    if (handleValidationErrors(req, res)) return

    const { email, password } = req.body

    // Find user and include password field
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password')
    if (!user) return errorResponses.invalidCredentials(res)

    // Check if email is verified
    if (!user.isEmailVerified) return errorResponses.emailNotVerified(res)

    // Check password using model method
    const isMatch = await user.comparePassword(password)
    if (!isMatch) return errorResponses.invalidCredentials(res)

    // Update last login
    user.lastLogin = new Date()
    await user.save()

    // Generate token and respond
    const token = generateToken(user._id, user.email, user.role)
    res.json({
      success: true,
      data: {
        token,
        user: user.toPublicJSON()
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    errorResponses.serverError(res, 'Server error during login')
  }
}

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    if (!user) return errorResponses.userNotFound(res)

    res.json({
      success: true,
      data: user.toPublicJSON()
    })
  } catch (error) {
    console.error('Get me error:', error)
    errorResponses.serverError(res)
  }
}

// @desc    Forgot password
// @route   POST /api/v1/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }

    // Generate reset OTP (6 digits)
    const resetOTP = generateResetOTP()
    user.passwordResetOTP = resetOTP
    user.passwordResetOTPExpires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    await user.save()

    // Send password reset email
    try {
      await sendPasswordResetEmail(email, user.firstName, resetOTP)
      
      res.json({
        success: true,
        message: 'Password reset code sent to your email'
      })
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError)
      
      // Clear reset OTP if email fails
      user.passwordResetOTP = undefined
      user.passwordResetOTPExpires = undefined
      await user.save()
      
      res.status(500).json({
        success: false,
        error: 'Failed to send password reset email'
      })
    }
  } catch (error) {
    console.error('Forgot password error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error'
    })
  }
}

// @desc    Reset password
// @route   PUT /api/v1/auth/reset-password
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, password } = req.body

    if (!email || !otp || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email, OTP, and new password are required'
      })
    }

    // Find user with valid reset OTP
    const user = await User.findOne({
      email: email.toLowerCase(),
      passwordResetOTP: otp,
      passwordResetOTPExpires: { $gt: Date.now() }
    }).select('+passwordResetOTP +passwordResetOTPExpires')

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired OTP'
      })
    }

    // Update password (will be hashed by pre-save hook)
    user.password = password
    user.passwordResetOTP = undefined
    user.passwordResetOTPExpires = undefined
    await user.save()

    res.json({
      success: true,
      message: 'Password reset successful'
    })
  } catch (error) {
    console.error('Reset password error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error'
    })
  }
}

// @desc    Verify email with OTP
// @route   POST /api/v1/auth/verify-email
// @access  Public
export const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Email and OTP are required'
      })
    }

    // Find user with valid verification OTP
    const user = await User.findOne({
      email: email.toLowerCase(),
      emailVerificationOTP: otp,
      emailVerificationOTPExpires: { $gt: Date.now() }
    }).select('+emailVerificationOTP +emailVerificationOTPExpires')

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired OTP'
      })
    }

    // Mark email as verified
    user.isEmailVerified = true
    user.emailVerificationOTP = undefined
    user.emailVerificationOTPExpires = undefined
    await user.save()

    // Send welcome email
    try {
      await sendWelcomeEmail(user.email, user.firstName)
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError)
      // Don't fail verification if welcome email fails
    }

    // Generate JWT token for automatic login
    const jwtToken = generateToken(user._id, user.email, user.role)

    res.json({
      success: true,
      message: 'Email verified successfully! Welcome to CivicAI!',
      data: {
        token: jwtToken,
        user: user.toPublicJSON()
      }
    })
  } catch (error) {
    console.error('Verify email error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error during email verification'
    })
  }
}

// @desc    Resend verification OTP
// @route   POST /api/v1/auth/resend-verification
// @access  Public
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      })
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }

    // Check if already verified
    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        error: 'Email is already verified'
      })
    }

    // Generate new verification OTP
    const verificationOTP = generateVerificationOTP()
    user.emailVerificationOTP = verificationOTP
    user.emailVerificationOTPExpires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    await user.save()

    // Send verification email
    try {
      await sendVerificationEmail(email, user.firstName, verificationOTP)
      
      res.json({
        success: true,
        message: 'Verification code sent to your email'
      })
    } catch (emailError) {
      console.error('Failed to resend verification email:', emailError)
      res.status(500).json({
        success: false,
        error: 'Failed to send verification email'
      })
    }
  } catch (error) {
    console.error('Resend verification error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error'
    })
  }
}
