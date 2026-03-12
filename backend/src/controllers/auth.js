import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { validationResult } from 'express-validator'

// Mock user data (replace with database later)
let users = []

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
      createdAt: new Date().toISOString()
    }

    users.push(user)

    // Generate token
    const token = generateToken(user.id, user.email)

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role: user.role
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
          role: user.role
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

    // In a real app, you would send an email with reset token
    res.json({
      success: true,
      message: 'Password reset email sent (simulated)'
    })
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

    // In a real app, you would verify the reset token
    res.json({
      success: true,
      message: 'Password reset successful (simulated)'
    })
  } catch (error) {
    console.error('Reset password error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error'
    })
  }
}