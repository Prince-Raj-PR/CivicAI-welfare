import { chatWithAI, getAIRecommendations, simplifyDescription, generateApplicationTips } from '../services/aiService.js'
import Program from '../models/Program.js'

// @desc    Chat with AI assistant
// @route   POST /api/v1/ai/chat
// @access  Private
export const chat = async (req, res) => {
  try {
    const { message, context } = req.body

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      })
    }

    // Add user profile to context if available
    const enrichedContext = {
      ...context,
      userId: req.user.id
    }

    const response = await chatWithAI(message, enrichedContext)

    res.json({
      success: true,
      data: response
    })
  } catch (error) {
    console.error('AI chat error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to process chat message'
    })
  }
}

// @desc    Get AI-powered program recommendations
// @route   POST /api/v1/ai/recommendations
// @access  Private
export const recommendations = async (req, res) => {
  try {
    const { personalInfo } = req.body

    if (!personalInfo) {
      return res.status(400).json({
        success: false,
        error: 'Personal information is required'
      })
    }

    // Get all active programs
    const programs = await Program.find({ status: 'active' })

    if (programs.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No programs available'
      })
    }

    const recommendations = await getAIRecommendations(personalInfo, programs)

    res.json({
      success: true,
      data: recommendations
    })
  } catch (error) {
    console.error('AI recommendations error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to generate recommendations'
    })
  }
}

// @desc    Simplify program description
// @route   POST /api/v1/ai/simplify
// @access  Private
export const simplify = async (req, res) => {
  try {
    const { description } = req.body

    if (!description) {
      return res.status(400).json({
        success: false,
        error: 'Description is required'
      })
    }

    const simplified = await simplifyDescription(description)

    res.json({
      success: true,
      data: {
        original: description,
        simplified
      }
    })
  } catch (error) {
    console.error('Simplify description error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to simplify description'
    })
  }
}

// @desc    Get application tips
// @route   POST /api/v1/ai/tips
// @access  Private
export const tips = async (req, res) => {
  try {
    const { programId, personalInfo } = req.body

    if (!programId || !personalInfo) {
      return res.status(400).json({
        success: false,
        error: 'Program ID and personal information are required'
      })
    }

    const program = await Program.findById(programId)

    if (!program) {
      return res.status(404).json({
        success: false,
        error: 'Program not found'
      })
    }

    const applicationTips = await generateApplicationTips(program, personalInfo)

    res.json({
      success: true,
      data: {
        program: program.name,
        tips: applicationTips
      }
    })
  } catch (error) {
    console.error('Generate tips error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to generate application tips'
    })
  }
}

export default {
  chat,
  recommendations,
  simplify,
  tips
}
