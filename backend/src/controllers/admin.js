import { fetchAndImportPrograms, loadSchemesFromPipeline } from '../services/programFetcher.js'
import Program from '../models/Program.js'
import User from '../models/User.js'
import EligibilityCheck from '../models/EligibilityCheck.js'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)
const SCHEMES_JSON = join(__dirname, '../../data/schemes.json')

// @desc    Import programs from AI pipeline (schemes.json)
// @route   POST /api/v1/admin/programs/import
// @access  Private/Admin
export const importPrograms = async (req, res) => {
  try {
    console.log('🔄 Starting program import from AI pipeline...')
    const result = await fetchAndImportPrograms()
    res.json({
      success: true,
      message: 'Programs imported successfully from AI pipeline',
      data: result,
    })
  } catch (error) {
    console.error('Import programs error:', error)
    res.status(500).json({ success: false, error: 'Failed to import programs' })
  }
}

// @desc    Get pipeline status (schemes.json metadata)
// @route   GET /api/v1/admin/pipeline/status
// @access  Private/Admin
export const getPipelineStatus = async (req, res) => {
  try {
    if (!existsSync(SCHEMES_JSON)) {
      return res.json({
        success: true,
        data: {
          available: false,
          message: 'schemes.json not found. Run the Python pipeline first.',
          schemesPath: SCHEMES_JSON,
        },
      })
    }

    const raw     = readFileSync(SCHEMES_JSON, 'utf-8')
    const schemes = JSON.parse(raw)
    const runs    = [...new Set(schemes.map(s => s._pipeline_run).filter(Boolean))]

    res.json({
      success: true,
      data: {
        available:    true,
        totalSchemes: schemes.length,
        lastRun:      runs[runs.length - 1] || null,
        allRuns:      runs,
        schemesPath:  SCHEMES_JSON,
        preview:      schemes.slice(0, 3).map(s => ({
          name:       s.scheme_name,
          state:      s.state,
          income_max: s.income_max,
          source:     s._source,
        })),
      },
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
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
  getPipelineStatus,
  getAdminStats,
  getRecentActivity,
}
