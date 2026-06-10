import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, Button } from '../components/ui'
import { api } from '../lib/api'

// ── helpers ───────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

const getToken = () => localStorage.getItem('authToken')

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
}

// ── ScraperPanel component ────────────────────────────────────────────────────
function ScraperPanel({ onScrapeDone }) {
  const [status, setStatus] = useState(null)        // scraper/status data
  const [running, setRunning] = useState(false)
  const [logs, setLogs] = useState([])
  const [result, setResult] = useState(null)        // { total, imported, updated, failed }
  const [error, setError] = useState(null)
  const [options, setOptions] = useState({
    clear: false,
    useMySchemeAPI: true,
    pages: 400,
  })
  const logsEndRef = useRef(null)
  const esRef = useRef(null)

  // Fetch scraper status on mount
  useEffect(() => {
    fetchStatus()
  }, [])

  // Auto-scroll log window
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const fetchStatus = async () => {
    try {
      const res = await api.get('/admin/scraper/status')
      setStatus(res.data)
    } catch {
      setStatus(null)
    }
  }

  const addLog = useCallback((message) => {
    setLogs((prev) => [...prev, { id: Date.now() + Math.random(), message }])
  }, [])

  const runScraper = () => {
    if (running) return

    // Close any existing EventSource
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }

    setRunning(true)
    setLogs([])
    setResult(null)
    setError(null)

    const params = new URLSearchParams({
      clear: options.clear,
      useMySchemeAPI: options.useMySchemeAPI,
      pages: options.pages,
    })

    // SSE — EventSource doesn't support custom headers, so we pass
    // the token as a query param (backend reads from req.query.token)
    params.set('token', getToken() || '')

    const url = `${API_BASE}/admin/scraper/stream?${params}`
    const es = new EventSource(url)
    esRef.current = es

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)

        if (payload.type === 'start') {
          addLog(`▶ ${payload.message}`)
        } else if (payload.type === 'log') {
          addLog(payload.message)
        } else if (payload.type === 'done') {
          addLog(`✅ ${payload.message}`)
          setResult(payload.data)
          setRunning(false)
          es.close()
          fetchStatus()
          onScrapeDone?.()
        } else if (payload.type === 'error') {
          addLog(`❌ ${payload.message}`)
          setError(payload.message)
          setRunning(false)
          es.close()
        }
      } catch {
        addLog(event.data)
      }
    }

    es.onerror = () => {
      if (running) {
        setError('Connection to server lost. The scraper may still be running.')
      }
      setRunning(false)
      es.close()
    }
  }

  const cancelScraper = () => {
    esRef.current?.close()
    esRef.current = null
    setRunning(false)
    addLog('⚠️ Scraper stream cancelled by user.')
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      esRef.current?.close()
    }
  }, [])

  const logLineColor = (msg) => {
    if (/❌|error|failed/i.test(msg)) return 'text-red-400'
    if (/✅|done|complete|imported/i.test(msg)) return 'text-green-400'
    if (/⚠️|warn|skip/i.test(msg)) return 'text-yellow-400'
    if (/▶|🚀|start/i.test(msg)) return 'text-blue-400'
    return 'text-gray-300'
  }

  return (
    <Card className="p-6 border-l-4 border-blue-500">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            🌐 Government Scheme Scraper
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Fetches live data from myscheme.gov.in, NHA, PM-KISAN, PMAY, and more — directly into MongoDB.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {running ? (
            <Button
              onClick={cancelScraper}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2"
            >
              ⏹ Stop
            </Button>
          ) : (
            <Button
              onClick={runScraper}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
            >
              ▶ Run Scraper
            </Button>
          )}
        </div>
      </div>

      {/* Database status strip */}
      {status && (
        <div className="mb-5 flex flex-wrap gap-4 text-sm">
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
            <span className="text-blue-500 font-medium">Programs in DB</span>
            <span className="ml-2 text-2xl font-bold text-blue-700">
              {status.totalPipelinePrograms}
            </span>
          </div>
          {status.lastScraped && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 flex flex-col justify-center">
              <span className="text-gray-400 text-xs">Last scraped</span>
              <span className="text-gray-700 font-medium">
                {new Date(status.lastScraped).toLocaleString()}
              </span>
            </div>
          )}
          {status.sources?.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 flex flex-col justify-center">
              <span className="text-gray-400 text-xs">Sources</span>
              <span className="text-gray-700 font-medium">
                {status.sources.map((s) => `${s.source} (${s.count})`).join(' · ')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Options */}
      <div className="mb-5 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm font-medium text-gray-700 mb-3">Scraper Options</p>
        <div className="flex flex-wrap gap-6 text-sm">
          {/* myScheme API toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={options.useMySchemeAPI}
              onChange={(e) => setOptions((o) => ({ ...o, useMySchemeAPI: e.target.checked }))}
              disabled={running}
              className="w-4 h-4 accent-blue-600"
            />
            <span className="text-gray-700">
              Include myScheme.gov.in API
              <span className="ml-1 text-gray-400">(3,700+ central & state schemes)</span>
            </span>
          </label>

          {/* Pages */}
          {options.useMySchemeAPI && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span className="text-gray-700">Max pages:</span>
              <input
                type="number"
                min={1}
                max={400}
                value={options.pages}
                onChange={(e) => setOptions((o) => ({ ...o, pages: parseInt(e.target.value, 10) || 400 }))}
                disabled={running}
                className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
              />
              <span className="text-gray-400">pages (400 = all ~3,726 schemes)</span>
            </label>
          )}

          {/* Clear toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={options.clear}
              onChange={(e) => setOptions((o) => ({ ...o, clear: e.target.checked }))}
              disabled={running}
              className="w-4 h-4 accent-red-500"
            />
            <span className="text-gray-700">
              Clear existing records first
              <span className="ml-1 text-red-400">(re-seed from scratch)</span>
            </span>
          </label>
        </div>
      </div>

      {/* Live log window */}
      <AnimatePresence>
        {(running || logs.length > 0) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-5"
          >
            <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs leading-relaxed overflow-y-auto max-h-72 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-xs uppercase tracking-wide">Live Logs</span>
                {running && (
                  <span className="flex items-center gap-1.5 text-green-400">
                    <span className="animate-ping inline-block w-2 h-2 rounded-full bg-green-400 opacity-75" />
                    Running…
                  </span>
                )}
              </div>
              {logs.map((line) => (
                <div key={line.id} className={`${logLineColor(line.message)}`}>
                  {line.message}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result summary */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-green-50 border border-green-200 rounded-lg"
          >
            <h3 className="font-semibold text-green-900 mb-3">Scrape Complete</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              {[
                { label: 'Total scraped', value: result.total, color: 'text-gray-900' },
                { label: 'New records', value: result.imported, color: 'text-green-600' },
                { label: 'Updated', value: result.updated, color: 'text-blue-600' },
                { label: 'Failed', value: result.failed, color: 'text-red-500' },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <p className="text-gray-500">{label}</p>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error banner */}
      {error && !running && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}
    </Card>
  )
}

// ── Main AdminDashboard ───────────────────────────────────────────────────────
const AdminDashboard = () => {
  const [stats, setStats] = useState(null)
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError('')
      const [statsRes, activityRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/activity?limit=10'),
      ])
      setStats(statsRes.data)
      setActivity(activityRes.data)
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading dashboard…</p>
        </div>
      </div>
    )
  }

  // ── Access denied ──────────────────────────────────────────────────────────
  if (error && (error.includes('denied') || error.includes('Admin'))) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-left">
            <p className="text-sm text-yellow-800 font-medium mb-2">💡 Quick Fix:</p>
            <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
              <li>Logout from your account</li>
              <li>Login again with admin credentials</li>
              <li>Email: admin@civicai.com</li>
              <li>Password: Admin@123456</li>
            </ol>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        className="max-w-7xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage Indian welfare programs — fetch live data straight from government portals.</p>
        </motion.div>

        {/* Error banner */}
        {error && (
          <motion.div variants={itemVariants} className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </motion.div>
        )}

        {/* ── Scraper Panel ──────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="mb-8">
          <ScraperPanel onScrapeDone={fetchDashboardData} />
        </motion.div>

        {/* ── Stats Grid ────────────────────────────────────────────────── */}
        {stats && (
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Programs</h3>
              <div className="space-y-3">
                {[
                  { label: 'Total',    value: stats.programs.total,    color: 'text-gray-900' },
                  { label: 'Active',   value: stats.programs.active,   color: 'text-green-600' },
                  { label: 'Inactive', value: stats.programs.inactive, color: 'text-gray-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-gray-600">{label}</span>
                    <span className={`text-xl font-bold ${color}`}>{value}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">👥 Users</h3>
              <div className="space-y-3">
                {[
                  { label: 'Total',      value: stats.users.total,       color: 'text-gray-900' },
                  { label: 'Verified',   value: stats.users.verified,    color: 'text-green-600' },
                  { label: 'Unverified', value: stats.users.unverified,  color: 'text-orange-500' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-gray-600">{label}</span>
                    <span className={`text-xl font-bold ${color}`}>{value}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">✅ Eligibility Checks</h3>
              <div className="space-y-3">
                {[
                  { label: 'Total',       value: stats.eligibilityChecks.total,    color: 'text-gray-900' },
                  { label: 'Last 7 Days', value: stats.eligibilityChecks.lastWeek, color: 'text-blue-600' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-gray-600">{label}</span>
                    <span className={`text-xl font-bold ${color}`}>{value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Recent Activity ────────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Recent Activity</h2>
            {activity.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {activity.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        item.type === 'program'     ? 'bg-blue-500'   :
                        item.type === 'user'        ? 'bg-green-500'  :
                                                      'bg-purple-500'
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.item}</p>
                        <p className="text-xs text-gray-500 capitalize">{item.type} {item.action}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 shrink-0 ml-4">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default AdminDashboard
