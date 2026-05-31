import { validationResult } from 'express-validator'
import { handleValidationErrors, formatUserResponse, errorResponses } from '../utils/authHelpers.js'
import User from '../models/User.js'

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private/Admin
export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password -otp -otpExpiry')
    const usersWithoutPasswords = users.map(user => formatUserResponse(user.toObject()))
    
    res.json({
      success: true,
      count: usersWithoutPasswords.length,
      data: usersWithoutPasswords
    })
  } catch (error) {
    console.error('Get users error:', error)
    errorResponses.serverError(res)
  }
}

// @desc    Get single user
// @route   GET /api/v1/users/:id
// @access  Private
export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -otp -otpExpiry')
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }

    // Only allow users to see their own profile or admin to see any
    if (req.user.id !== user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this user'
      })
    }

    res.json({
      success: true,
      data: formatUserResponse(user.toObject())
    })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error'
    })
  }
}
// @desc    Update user
// @route   PUT /api/v1/users/:id
// @access  Private/Admin
export const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }

    // Update allowed fields
    const allowedFields = ['firstName', 'lastName', 'phone', 'role', 'isActive']
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field]
      }
    })

    await user.save()

    res.json({
      success: true,
      data: formatUserResponse(user.toObject())
    })
  } catch (error) {
    console.error('Update user error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error'
    })
  }
}

// @desc    Delete user
// @route   DELETE /api/v1/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }

    await user.deleteOne()

    res.json({
      success: true,
      message: 'User deleted successfully'
    })
  } catch (error) {
    console.error('Delete user error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error'
    })
  }
}

// @desc    Update user profile
// @route   PUT /api/v1/users/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      })
    }

    const user = await User.findById(req.user.id)
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }

    // Update only allowed fields
    const allowedFields = ['firstName', 'lastName', 'phone', 'dateOfBirth', 'address', 'city', 'state', 'zipCode', 'householdSize', 'annualIncome', 'employmentStatus', 'hasDisability', 'isVeteran', 'isStudent', 'numChildren']
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field]
      }
    })

    await user.save()

    res.json({
      success: true,
      data: formatUserResponse(user.toObject())
    })
  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error'
    })
  }
}