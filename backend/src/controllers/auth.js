import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { validationResult } from 'express-validator'
import { 
  sendVerificationEmail, 
  sendPasswordResetEmail, 
  sendWelcomeEmail,
  generateVerificationToken,
  generateResetToken 
} from '../utils/emailService.js'

// Mock user data (replace with database later)
let users = []
let verificationTokens = []
let resetTokens = []

// Generate JWT Token
const generateToken = (id, email) => {
  return jwt.sign({ id, email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  })
}

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      })
    }

    const { firstName, lastName, email, password, phone } = req.body

    // Check if user already exists
    const existingUser = users.find(user => user.email === email)
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists with this email'
      })
    }

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Create user
    const user = {
      id: Date.now().toString(),
      firstName,
      lastName,
      email,
      password: hashedPassword,
      phone: phone || null,
      role: 'user',
      isEmailVerified: false,
      createdAt: new Date().toISOString()
    }

    users.push(user)

    // Generate verification token
    const verificationToken = generateVerificationToken()
    verificationTokens.push({
      token: verificationToken,
      userId: user.id,
      email: user.email,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    })

    // Send verification email
    try {
      await sendVerificationEmail(email, firstName, verificationToken)
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError)
      // Don't fail registration if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.',
      data: {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isEmailVerified: user.isEmailVerified
        }
      }
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error during registration'
    })
  }
}

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      })
    }

    const { email, password } = req.body

    // Find user
    const user = users.find(user => user.email === email)
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      })
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(401).json({
        success: false,
        error: 'Please verify your email address before logging in',
        code: 'EMAIL_NOT_VERIFIED'
      })
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      })
    }

    // Generate token
    const token = generateToken(user.id, user.email)

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isEmailVerified: user.isEmailVerified
        }
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error during login'
    })
  }
}

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = users.find(user => user.id === req.user.id)
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt
      }
    })
  } catch (error) {
    console.error('Get me error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error'
    })
  }
}

// @desc    Forgot password
// @route   POST /api/v1/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body

    const user = users.find(user => user.email === email)
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }

    // Generate reset token
    const resetToken = generateResetToken()
    resetTokens.push({
      token: resetToken,
      userId: user.id,
      email: user.email,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    })

    // Send password reset email
    try {
      await sendPasswordResetEmail(email, user.firstName, resetToken)
      
      res.json({
        success: true,
        message: 'Password reset email sent successfully'
      })
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError)
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
// @route   PUT /api/v1/auth/reset-password/:resettoken
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    const { password } = req.body
    const { resettoken } = req.params

    // Find valid reset token
    const tokenData = resetTokens.find(
      token => token.token === resettoken && new Date() < token.expiresAt
    )

    if (!tokenData) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      })
    }

    // Find user
    const userIndex = users.findIndex(user => user.id === tokenData.userId)
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Update user password
    users[userIndex].password = hashedPassword

    // Remove used reset token
    const tokenIndex = resetTokens.findIndex(token => token.token === resettoken)
    if (tokenIndex > -1) {
      resetTokens.splice(tokenIndex, 1)
    }

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
// @desc    Verify email
// @route   POST /api/v1/auth/verify-email
// @access  Public
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Verification token is required'
      })
    }

    // Find valid verification token
    const tokenData = verificationTokens.find(
      tokenItem => tokenItem.token === token && new Date() < tokenItem.expiresAt
    )

    if (!tokenData) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification token'
      })
    }

    // Find and update user
    const userIndex = users.findIndex(user => user.id === tokenData.userId)
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }

    // Mark email as verified
    users[userIndex].isEmailVerified = true
    users[userIndex].emailVerifiedAt = new Date().toISOString()

    // Remove used verification token
    const tokenIndex = verificationTokens.findIndex(tokenItem => tokenItem.token === token)
    if (tokenIndex > -1) {
      verificationTokens.splice(tokenIndex, 1)
    }

    // Send welcome email
    try {
      await sendWelcomeEmail(users[userIndex].email, users[userIndex].firstName)
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError)
      // Don't fail verification if welcome email fails
    }

    // Generate JWT token for automatic login
    const jwtToken = generateToken(users[userIndex].id, users[userIndex].email)

    res.json({
      success: true,
      message: 'Email verified successfully! Welcome to CivicAI!',
      data: {
        token: jwtToken,
        user: {
          id: users[userIndex].id,
          firstName: users[userIndex].firstName,
          lastName: users[userIndex].lastName,
          email: users[userIndex].email,
          phone: users[userIndex].phone,
          role: users[userIndex].role,
          isEmailVerified: users[userIndex].isEmailVerified
        }
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

// @desc    Resend verification email
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
    const user = users.find(user => user.email === email)
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

    // Remove any existing verification tokens for this user
    verificationTokens = verificationTokens.filter(token => token.userId !== user.id)

    // Generate new verification token
    const verificationToken = generateVerificationToken()
    verificationTokens.push({
      token: verificationToken,
      userId: user.id,
      email: user.email,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    })

    // Send verification email
    try {
      await sendVerificationEmail(email, user.firstName, verificationToken)
      
      res.json({
        success: true,
        message: 'Verification email sent successfully'
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