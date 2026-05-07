import express from 'express'
import { chat, recommendations, simplify, tips } from '../controllers/ai.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()

// All AI routes require authentication
router.use(protect)

// @route   POST /api/v1/ai/chat
// @desc    Chat with AI assistant
// @access  Private
router.post('/chat', chat)

// @route   POST /api/v1/ai/recommendations
// @desc    Get AI-powered program recommendations
// @access  Private
router.post('/recommendations', recommendations)

// @route   POST /api/v1/ai/simplify
// @desc    Simplify program description
// @access  Private
router.post('/simplify', simplify)

// @route   POST /api/v1/ai/tips
// @desc    Get application tips
// @access  Private
router.post('/tips', tips)

export default router
