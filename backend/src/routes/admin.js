import express from 'express'
import {
  runScraperImport,
  runScraperStream,
  getScraperStatus,
  importPrograms,
  getAdminStats,
  getRecentActivity,
} from '../controllers/admin.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()

// Admin-only middleware
const adminOnly = (req, res, next) => {
  if (req.user?.role === 'admin') return next()
  res.status(403).json({ success: false, error: 'Access denied. Admin privileges required.' })
}

// All admin routes require auth + admin role
router.use(protect)
router.use(adminOnly)

// ── Scraper ──────────────────────────────────────────────────────────────────
// POST  /api/v1/admin/scraper/run     — run scraper (non-streaming)
// GET   /api/v1/admin/scraper/stream  — run scraper with SSE live logs
// GET   /api/v1/admin/scraper/status  — scraper / DB status
router.post('/scraper/run', runScraperImport)
router.get('/scraper/stream', runScraperStream)
router.get('/scraper/status', getScraperStatus)

// ── Legacy alias (keeps old code working) ────────────────────────────────────
router.post('/programs/import', importPrograms)

// ── Dashboard ────────────────────────────────────────────────────────────────
router.get('/stats', getAdminStats)
router.get('/activity', getRecentActivity)

export default router
