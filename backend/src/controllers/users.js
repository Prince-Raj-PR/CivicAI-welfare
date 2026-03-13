import { handleValidationErrors, formatUserResponse, errorResponses } from '../utils/authHelpers.js'

// Mock user data (same as auth.js - in real app, use database)
let users = []

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private/Admin
export const getUsers = async (req, res) => {
  try {
    const usersWithoutPasswords = users.map(formatUserResponse)
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
    const user = users.find(user => user.id === req.params.id)
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }

    // Only allow users to see their own profile or admin to see any
    if (req.user.id !== user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this user'
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
    const userIndex = users.findIndex(user => user.id === req.params.id)
    
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }

    // Update user
    users[userIndex] = { ...users[userIndex], ...req.body, id: req.params.id }

    res.json({
      success: true,
      data: {
        id: users[userIndex].id,
        firstName: users[userIndex].firstName,
        lastName: users[userIndex].lastName,
        email: users[userIndex].email,
        phone: users[userIndex].phone,
        role: users[userIndex].role,
        createdAt: users[userIndex].createdAt
      }
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
    const userIndex = users.findIndex(user => user.id === req.params.id)
    
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }

    users.splice(userIndex, 1)

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

    const userIndex = users.findIndex(user => user.id === req.user.id)
    
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }

    // Update only allowed fields
    const allowedFields = ['firstName', 'lastName', 'phone']
    const updates = {}
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field]
      }
    })

    users[userIndex] = { ...users[userIndex], ...updates }

    res.json({
      success: true,
      data: {
        id: users[userIndex].id,
        firstName: users[userIndex].firstName,
        lastName: users[userIndex].lastName,
        email: users[userIndex].email,
        phone: users[userIndex].phone,
        role: users[userIndex].role,
        createdAt: users[userIndex].createdAt
      }
    })
  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error'
    })
  }
}