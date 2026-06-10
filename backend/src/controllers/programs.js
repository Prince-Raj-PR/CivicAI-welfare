import { validationResult } from 'express-validator'
import Program from '../models/Program.js'

// @desc    Get all programs
// @route   GET /api/v1/programs
// @access  Public
export const getPrograms = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, agency, status = 'active', state, search } = req.query

    // Build query
    const query = { status }

    if (type)   query.type   = new RegExp(type, 'i')
    if (agency) query.agency = new RegExp(agency, 'i')
    if (state)  query.state  = new RegExp(state, 'i')

    // Optional keyword search across name + description
    if (search) {
      query.$or = [
        { name:        new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { tags:        new RegExp(search, 'i') },
      ]
    }

    const pageNum  = Math.max(1, parseInt(page,  10))
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)))
    const skip     = (pageNum - 1) * limitNum

    const [programs, total] = await Promise.all([
      Program.find(query)
        .select('-__v')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Program.countDocuments(query),
    ])

    res.json({
      success: true,
      count:  programs.length,
      total,
      pagination: {
        page:   pageNum,
        limit:  limitNum,
        pages:  Math.ceil(total / limitNum),
        hasMore: pageNum * limitNum < total,
      },
      data: programs,
    })
  } catch (error) {
    console.error('Get programs error:', error)
    res.status(500).json({ success: false, error: 'Server error' })
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
