import { fetchAndImportPrograms } from '../services/programFetcher.js'
import Program from '../models/Program.js'
import User from '../models/User.js'
import EligibilityCheck from '../models/EligibilityCheck.js'

// @desc    Import programs from government sources
// @route   POST /api/v1/admin/programs/import
// @access  Private/Admin
export const importPrograms = async (req, res) => {
  try {
    console.log('🔄 Starting program import...')
    
    const result = await fetchAndImportPrograms()

    res.json({
      success: true,
      message: 'Programs imported successfully',
      data: result
    })
  } catch (error) {
    console.error('Import programs error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to import programs'
    })
  }
}

// @desc    Get admin dashboard stats
// @route   GET /api/v1/admin/stats
// @access  Private/Admin
export const getAdminStats = async (req, res) => {
  try {
    const [
      totalPrograms,
      activePrograms,
      totalUsers,
      verifiedUsers,
      totalChecks,
      recentChecks
    ] = await Promise.all([
      Program.countDocuments(),
      Program.countDocuments({ status: 'active' }),
      User.countDocuments(),
      User.countDocuments({ isEmailVerified: true }),
      EligibilityCheck.countDocuments(),
      EligibilityCheck.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      })
    ])

    res.json({
      success: true,
      data: {
        programs: {
          total: totalPrograms,
          active: activePrograms,
          inactive: totalPrograms - activePrograms
        },
        users: {
          total: totalUsers,
          verified: verifiedUsers,
          unverified: totalUsers - verifiedUsers
        },
        eligibilityChecks: {
          total: totalChecks,
          lastWeek: recentChecks
        }
      }
    })
  } catch (error) {
    console.error('Get admin stats error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admin stats'
    })
  }
}

// @desc    Get recent activity
// @route   GET /api/v1/admin/activity
// @access  Private/Admin
export const getRecentActivity = async (req, res) => {
  try {
    const { limit = 10 } = req.query

    const [recentPrograms, recentUsers, recentChecks] = await Promise.all([
      Program.find()
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .select('name agency createdAt updatedAt'),
      User.find()
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .select('firstName lastName email createdAt'),
      EligibilityCheck.find()
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .populate('user', 'firstName lastName email')
        .populate('program', 'name')
    ])

    const activity = [
      ...recentPrograms.map(p => ({
        type: 'program',
        action: p.createdAt.getTime() === p.updatedAt.getTime() ? 'created' : 'updated',
        item: p.name,
        timestamp: p.updatedAt
      })),
      ...recentUsers.map(u => ({
        type: 'user',
        action: 'registered',
        item: `${u.firstName} ${u.lastName}`,
        timestamp: u.createdAt
      })),
      ...recentChecks.map(c => ({
        type: 'eligibility',
        action: 'checked',
        item: `${c.user?.firstName} checked ${c.program?.name}`,
        timestamp: c.createdAt
      }))
    ].sort((a, b) => b.timestamp - a.timestamp).slice(0, parseInt(limit))

    res.json({
      success: true,
      data: activity
    })
  } catch (error) {
    console.error('Get recent activity error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent activity'
    })
  }
}

export default {
  importPrograms,
  getAdminStats,
  getRecentActivity
}
