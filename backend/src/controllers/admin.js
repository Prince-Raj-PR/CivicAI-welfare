/**
 * Admin Controller
 * Handles: scraper triggering (sync + SSE streaming), stats, activity
 */

import { fetchAndImportPrograms } from '../services/programFetcher.js'
import { runScraper } from '../scripts/scraper/scraper.js'
import Program from '../models/Program.js'
import User from '../models/User.js'
import EligibilityCheck from '../models/EligibilityCheck.js'

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Run scraper + import into MongoDB (non-streaming, one-shot)
// @route   POST /api/v1/admin/scraper/run
// @access  Private/Admin
// ─────────────────────────────────────────────────────────────────────────────
export const runScraperImport = async (req, res) => {
  const {
    clear = false,
    useMySchemeAPI = true,
    mySchemeMaxPages = 10,
  } = req.body ?? {}

  try {
    const result = await fetchAndImportPrograms({
      clear,
      useMySchemeAPI,
      mySchemeMaxPages: parseInt(mySchemeMaxPages, 10) || 10,
    })

    res.json({
      success: true,
      message: 'Scraper completed successfully',
      data: result,
    })
  } catch (err) {
    console.error('Scraper error:', err)
    res.status(500).json({ success: false, error: err.message })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Run scraper with SSE live log streaming
// @route   GET /api/v1/admin/scraper/stream?clear=false&useMySchemeAPI=true&pages=10
// @access  Private/Admin
//
// The client listens with EventSource. Each scraper log line is sent as a
// `data: <json>` SSE event with type "log". A final "done" event closes the stream.
// ─────────────────────────────────────────────────────────────────────────────
export const runScraperStream = async (req, res) => {
  const clear = req.query.clear === 'true'
  const useMySchemeAPI = req.query.useMySchemeAPI !== 'false'
  const mySchemeMaxPages = parseInt(req.query.pages, 10) || 10

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // disable nginx buffering
  res.flushHeaders()

  const send = (type, payload) => {
    res.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`)
  }

  // Helper: send a log line
  const logFn = (message) => {
    send('log', { message: String(message) })
  }

  // Keep-alive ping every 20s to prevent proxy timeouts
  const keepAlive = setInterval(() => {
    res.write(': ping\n\n')
  }, 20000)

  try {
    send('start', { message: '🚀 Scraper started', timestamp: new Date().toISOString() })

    // Run scraper with log streaming
    const programs = await runScraper({
      useMySchemeAPI,
      mySchemeMaxPages,
      verbose: true,
      // override internal log calls to stream via SSE
      // (runScraper accepts a `log` option — passed through to each source)
    })

    logFn(`📋 Scraper returned ${programs.length} programs`)

    // Import into MongoDB
    logFn('📥 Importing into MongoDB…')

    let imported = 0
    let updated = 0
    let failed = 0

    if (clear) {
      const deleted = await Program.deleteMany({ source: 'ai-pipeline' })
      logFn(`🗑️  Cleared ${deleted.deletedCount} existing pipeline records`)
    }

    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    for (const p of programs) {
      try {
        const doc = {
          name: p.name,
          description: p.description || 'No description available.',
          type: p.type || 'Other',
          agency: p.agency || 'Government of India',
          location: p.location || 'Nationwide',
          state: p.state || 'All India',
          eligibilityCriteria: {
            minAge: p.eligibilityCriteria?.minAge ?? undefined,
            maxAge: p.eligibilityCriteria?.maxAge ?? undefined,
            maxIncome: p.eligibilityCriteria?.maxIncome ?? undefined,
            allowedCategories: p.eligibilityCriteria?.allowedCategories ?? [],
            requiredDocuments: p.eligibilityCriteria?.requiredDocuments ?? [],
            studentRequired: p.eligibilityCriteria?.studentRequired ?? null,
            disabilityRequired: p.eligibilityCriteria?.disabilityRequired ?? null,
          },
          benefits: {
            type: p.benefits?.type || 'other',
            amount: p.benefits?.amount ?? undefined,
            frequency: p.benefits?.frequency ?? undefined,
            description: p.benefits?.description || '',
          },
          applicationProcess: {
            url: p.applicationProcess?.url || '',
            steps: p.applicationProcess?.steps ?? [],
          },
          tags: p.tags ?? [],
          status: 'active',
          source: 'ai-pipeline',
          pipelineSource: p.pipelineSource || 'scraper',
          pipelineRun: new Date().toISOString(),
        }

        const existing = await Program.findOne({
          name: { $regex: new RegExp(`^${escapeRegex(doc.name)}$`, 'i') },
          source: 'ai-pipeline',
        })

        if (existing) {
          await Program.findByIdAndUpdate(existing._id, { $set: doc }, { runValidators: false })
          updated++
        } else {
          await Program.create(doc)
          imported++
        }
      } catch (err) {
        failed++
        logFn(`  ❌ Failed: ${p.name} — ${err.message}`)
      }
    }

    send('done', {
      message: '✅ Scraper completed',
      data: {
        total: programs.length,
        imported,
        updated,
        failed,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Scraper stream error:', err)
    send('error', { message: `❌ Scraper failed: ${err.message}` })
  } finally {
    clearInterval(keepAlive)
    res.end()
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get scraper / database status
// @route   GET /api/v1/admin/scraper/status
// @access  Private/Admin
// ─────────────────────────────────────────────────────────────────────────────
export const getScraperStatus = async (req, res) => {
  try {
    const [totalPipeline, sources] = await Promise.all([
      Program.countDocuments({ source: 'ai-pipeline' }),
      Program.aggregate([
        { $match: { source: 'ai-pipeline' } },
        { $group: { _id: '$pipelineSource', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ])

    const preview = await Program.find({ source: 'ai-pipeline' })
      .sort({ updatedAt: -1 })
      .limit(3)
      .select('name type state updatedAt')

    // Last scrape time from most recently updated pipeline record
    const lastScraped = preview[0]?.updatedAt ?? null

    res.json({
      success: true,
      data: {
        totalPipelinePrograms: totalPipeline,
        lastScraped,
        sources: sources.map((s) => ({ source: s._id, count: s.count })),
        preview: preview.map((p) => ({
          name: p.name,
          type: p.type,
          state: p.state,
        })),
      },
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy alias — keeps old POST /admin/programs/import working
// ─────────────────────────────────────────────────────────────────────────────
export const importPrograms = runScraperImport

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get admin dashboard stats
// @route   GET /api/v1/admin/stats
// @access  Private/Admin
// ─────────────────────────────────────────────────────────────────────────────
export const getAdminStats = async (req, res) => {
  try {
    const [
      totalPrograms,
      activePrograms,
      totalUsers,
      verifiedUsers,
      totalChecks,
      recentChecks,
    ] = await Promise.all([
      Program.countDocuments(),
      Program.countDocuments({ status: 'active' }),
      User.countDocuments(),
      User.countDocuments({ isEmailVerified: true }),
      EligibilityCheck.countDocuments(),
      EligibilityCheck.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
    ])

    res.json({
      success: true,
      data: {
        programs: {
          total: totalPrograms,
          active: activePrograms,
          inactive: totalPrograms - activePrograms,
        },
        users: {
          total: totalUsers,
          verified: verifiedUsers,
          unverified: totalUsers - verifiedUsers,
        },
        eligibilityChecks: {
          total: totalChecks,
          lastWeek: recentChecks,
        },
      },
    })
  } catch (err) {
    console.error('Get admin stats error:', err)
    res.status(500).json({ success: false, error: 'Failed to fetch admin stats' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get recent activity
// @route   GET /api/v1/admin/activity
// @access  Private/Admin
// ─────────────────────────────────────────────────────────────────────────────
export const getRecentActivity = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10

    const [recentPrograms, recentUsers, recentChecks] = await Promise.all([
      Program.find().sort({ createdAt: -1 }).limit(limit).select('name agency createdAt updatedAt'),
      User.find().sort({ createdAt: -1 }).limit(limit).select('firstName lastName email createdAt'),
      EligibilityCheck.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('user', 'firstName lastName email')
        .populate('program', 'name'),
    ])

    const activity = [
      ...recentPrograms.map((p) => ({
        type: 'program',
        action: p.createdAt.getTime() === p.updatedAt.getTime() ? 'created' : 'updated',
        item: p.name,
        timestamp: p.updatedAt,
      })),
      ...recentUsers.map((u) => ({
        type: 'user',
        action: 'registered',
        item: `${u.firstName} ${u.lastName}`,
        timestamp: u.createdAt,
      })),
      ...recentChecks.map((c) => ({
        type: 'eligibility',
        action: 'checked',
        item: `${c.user?.firstName ?? 'User'} checked ${c.program?.name ?? 'a program'}`,
        timestamp: c.createdAt,
      })),
    ]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)

    res.json({ success: true, data: activity })
  } catch (err) {
    console.error('Get recent activity error:', err)
    res.status(500).json({ success: false, error: 'Failed to fetch recent activity' })
  }
}

export default {
  runScraperImport,
  runScraperStream,
  getScraperStatus,
  importPrograms,
  getAdminStats,
  getRecentActivity,
}
