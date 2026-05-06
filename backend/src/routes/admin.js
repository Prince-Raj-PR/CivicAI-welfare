import express from 'express'
import { 
  importPrograms, 
  getAdminStats, 
  getRecentActivity 
} from '../controllers/admin.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()

// Admin middleware - check if user is admin
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next()
  } else {
    res.status(403).json({
      success: false,
      error: 'Access denied. Admin privileges required.'
    })
  }
}

// All admin routes require authentication and admin role
router.use(protect)
router.use(adminOnly)

// @route   POST /api/v1/admin/programs/import
// @desc    Import programs from government sources
// @access  Private/Admin
router.post('/programs/import', importPrograms)

// @route   GET /api/v1/admin/stats
// @desc    Get admin dashboard statistics
// @access  Private/Admin
router.get('/stats', getAdminStats)

// @route   GET /api/v1/admin/activity
// @desc    Get recent activity logs
// @access  Private/Admin
router.get('/activity', getRecentActivity)

export default router
