import { validationResult } from 'express-validator'

// Mock programs data
let programs = [
  {
    id: '1',
    name: 'Supplemental Nutrition Assistance Program (SNAP)',
    description: 'Provides food assistance to low-income individuals and families.',
    type: 'Food Assistance',
    agency: 'USDA',
    maxBenefit: 835,
    location: 'Nationwide',
    eligibilityCriteria: [
      { field: 'income', operator: 'lte', value: 130, unit: 'percent_poverty_line' },
      { field: 'assets', operator: 'lte', value: 2750, unit: 'dollars' },
      { field: 'citizenship', operator: 'eq', value: 'us_citizen_or_eligible_non_citizen' }
    ],
    applicationUrl: 'https://www.fns.usda.gov/snap/apply',
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Medicaid',
    description: 'Health insurance program for low-income individuals and families.',
    type: 'Healthcare',
    agency: 'CMS',
    maxBenefit: 0,
    location: 'Nationwide',
    eligibilityCriteria: [
      { field: 'income', operator: 'lte', value: 138, unit: 'percent_poverty_line' },
      { field: 'age', operator: 'gte', value: 0, unit: 'years' }
    ],
    applicationUrl: 'https://www.medicaid.gov/apply',
    createdAt: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Housing Choice Voucher Program',
    description: 'Rental assistance for low-income families, elderly, and disabled.',
    type: 'Housing',
    agency: 'HUD',
    maxBenefit: 1200,
    location: 'Nationwide',
    eligibilityCriteria: [
      { field: 'income', operator: 'lte', value: 50, unit: 'percent_area_median_income' },
      { field: 'citizenship', operator: 'eq', value: 'us_citizen_or_eligible_non_citizen' }
    ],
    applicationUrl: 'https://www.hud.gov/topics/housing_choice_voucher',
    createdAt: new Date().toISOString()
  }
]

// @desc    Get all programs
// @route   GET /api/v1/programs
// @access  Public
export const getPrograms = async (req, res) => {
  try {
    const { page = 1, limit = 10, type, agency } = req.query
    
    let filteredPrograms = [...programs]
    
    // Filter by type
    if (type) {
      filteredPrograms = filteredPrograms.filter(program => 
        program.type.toLowerCase().includes(type.toLowerCase())
      )
    }
    
    // Filter by agency
    if (agency) {
      filteredPrograms = filteredPrograms.filter(program => 
        program.agency.toLowerCase().includes(agency.toLowerCase())
      )
    }
    
    // Pagination
    const startIndex = (page - 1) * limit
    const endIndex = page * limit
    const paginatedPrograms = filteredPrograms.slice(startIndex, endIndex)
    
    res.json({
      success: true,
      count: paginatedPrograms.length,
      total: filteredPrograms.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(filteredPrograms.length / limit)
      },
      data: paginatedPrograms
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
    const program = programs.find(program => program.id === req.params.id)
    
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
    console.error('Get program error:', error)
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
    const { q, type, agency } = req.query
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      })
    }
    
    let results = programs.filter(program => 
      program.name.toLowerCase().includes(q.toLowerCase()) ||
      program.description.toLowerCase().includes(q.toLowerCase())
    )
    
    // Additional filters
    if (type) {
      results = results.filter(program => 
        program.type.toLowerCase().includes(type.toLowerCase())
      )
    }
    
    if (agency) {
      results = results.filter(program => 
        program.agency.toLowerCase().includes(agency.toLowerCase())
      )
    }

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

    const program = {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString()
    }

    programs.push(program)

    res.status(201).json({
      success: true,
      data: program
    })
  } catch (error) {
    console.error('Create program error:', error)
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
    const programIndex = programs.findIndex(program => program.id === req.params.id)
    
    if (programIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Program not found'
      })
    }

    programs[programIndex] = { 
      ...programs[programIndex], 
      ...req.body, 
      id: req.params.id,
      updatedAt: new Date().toISOString()
    }

    res.json({
      success: true,
      data: programs[programIndex]
    })
  } catch (error) {
    console.error('Update program error:', error)
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
    const programIndex = programs.findIndex(program => program.id === req.params.id)
    
    if (programIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Program not found'
      })
    }

    programs.splice(programIndex, 1)

    res.json({
      success: true,
      message: 'Program deleted successfully'
    })
  } catch (error) {
    console.error('Delete program error:', error)
    res.status(500).json({
      success: false,
      error: 'Server error'
    })
  }
}