import { validationResult } from 'express-validator'

// Handle validation errors
export const handleValidationErrors = (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    })
    return true
  }
  return false
}

// Format user response (remove sensitive data)
export const formatUserResponse = (user) => {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt
  }
}

// Standard error responses
export const errorResponses = {
  userNotFound: (res) => res.status(404).json({
    success: false,
    error: 'User not found'
  }),
  
  invalidCredentials: (res) => res.status(401).json({
    success: false,
    error: 'Invalid credentials'
  }),
  
  emailNotVerified: (res) => res.status(401).json({
    success: false,
    error: 'Please verify your email address before logging in',
    code: 'EMAIL_NOT_VERIFIED'
  }),
  
  userExists: (res) => res.status(400).json({
    success: false,
    error: 'User already exists with this email'
  }),
  
  serverError: (res, message = 'Server error') => res.status(500).json({
    success: false,
    error: message
  })
}