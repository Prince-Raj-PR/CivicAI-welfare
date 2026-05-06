import { validationResult } from 'express-validator'
import Program from '../models/Program.js'

// @desc    Get all programs
// @route   GET /api/v1/programs
// @access  Public
export const getPrograms = async (req, res) => {
  try {
    const { page = 1, limit = 10, type, agency, status = 'active' } = req.query
    
    // Build query
    const query = { status }
    
    // Filter by type
    if (type) {
      query.type = new RegExp(type, 'i')
    }
    
    // Filter by agency
    if (agency) {
      query.agency = new RegExp(agency, 'i')
    }
    
    // Execute query with pagination
    const programs = await Program.find(query)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 })
    
    // Get total count
    const total = await Program.countDocuments(query)
    
    res.json({
      success: true,
      count: programs.length,
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      },
      data: programs
    })
  } catch (error) {
    console.error('Get programs error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error'
    })
  }
}

// @desc    Get single program
// @route   GET /api/v1/programs/:id
// @access  Public
export const getProgram = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id)
    
    if (!program) {
      return res.status(404).json({
        success: false,
        error: 'Program not found'
      })
    }

    // Increment view count
    await program.incrementViews()

    res.json({
      success: true,
      data: program
    })
  } catch (error) {
    console.error('Get program error:', error)
    
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        error: 'Program not found'
      })
    }
    
    res.status(500).json({
      success: false,
      error: 'Server error'
    })
  }
}

// @desc    Search programs
// @route   GET /api/v1/programs/search
// @access  Public
export const searchPrograms = async (req, res) => {
  try {
    const { q, type, agency, maxIncome, location } = req.query
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      })
    }
    
    // Use MongoDB text search
    let query = {
      $text: { $search: q },
      status: 'active'
    }
    
    // Additional filters
    if (type) {
      query.type = new RegExp(type, 'i')
    }
    
    if (agency) {
      query.agency = new RegExp(agency, 'i')
    }
    
    if (maxIncome) {
      query['eligibilityCriteria.maxIncome'] = { $gte: parseInt(maxIncome) }
    }
    
    if (location) {
      query.location = new RegExp(location, 'i')
    }

    const results = await Program.find(query, {
      score: { $meta: 'textScore' }
    }).sort({ score: { $meta: 'textScore' } })

    res.json({
      success: true,
      count: results.length,
      data: results
    })
  } catch (error) {
    console.error('Search programs error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error'
    })
  }
}

// @desc    Create new program
// @route   POST /api/v1/programs
// @access  Private/Admin
export const createProgram = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      })
    }

    const program = await Program.create(req.body)

    res.status(201).json({
      success: true,
      data: program
    })
  } catch (error) {
    console.error('Create program error:', error)
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: Object.values(error.errors).map(err => err.message).join(', ')
      })
    }
    
    res.status(500).json({
      success: false,
      error: 'Server error'
    })
  }
}

// @desc    Update program
// @route   PUT /api/v1/programs/:id
// @access  Private/Admin
export const updateProgram = async (req, res) => {
  try {
    const program = await Program.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true, // Return updated document
        runValidators: true // Run model validators
      }
    )
    
    if (!program) {
      return res.status(404).json({
        success: false,
        error: 'Program not found'
      })
    }

    res.json({
      success: true,
      data: program
    })
  } catch (error) {
    console.error('Update program error:', error)
    
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        error: 'Program not found'
      })
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: Object.values(error.errors).map(err => err.message).join(', ')
      })
    }
    
    res.status(500).json({
      success: false,
      error: 'Server error'
    })
  }
}

// @desc    Delete program
// @route   DELETE /api/v1/programs/:id
// @access  Private/Admin
export const deleteProgram = async (req, res) => {
  try {
    const program = await Program.findByIdAndDelete(req.params.id)
    
    if (!program) {
      return res.status(404).json({
        success: false,
        error: 'Program not found'
      })
    }

    res.json({
      success: true,
      message: 'Program deleted successfully'
    })
  } catch (error) {
    console.error('Delete program error:', error)
    
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        error: 'Program not found'
      })
    }
    
    res.status(500).json({
      success: false,
      error: 'Server error'
    })
  }
}
