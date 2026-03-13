import express from 'express'
import { testEmailConfig } from '../utils/emailService.js'

const router = express.Router()

// @route   GET /api/v1/test/email
// @desc    Test email configuration
// @access  Public (remove in production)
router.get('/email', async (req, res) => {
  try {
    const result = await testEmailConfig()
    
    if (result.success) {
      res.json({
        success: true,
        message: 'SMTP configuration is working correctly',
        details: result
      })
    } else {
      res.status(500).json({
        success: false,
        error: 'SMTP configuration failed',
        details: result
      })
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to test email configuration',
      details: error.message
    })
  }
})

export default router