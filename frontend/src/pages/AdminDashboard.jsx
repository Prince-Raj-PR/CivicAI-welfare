import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, Button } from '../components/ui'
import { api } from '../lib/api'

const AdminDashboard = () => {
  const [stats, setStats] = useState(null)
  const [activity, setActivity] = useState([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [pipelineStatus, setPipelineStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError('')

      const [statsRes, activityRes, pipelineRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/activity?limit=10'),
        api.get('/admin/pipeline/status').catch(() => ({ data: null })),
      ])

      setStats(statsRes.data)
      setActivity(activityRes.data)
      setPipelineStatus(pipelineRes?.data ?? null)
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to load dashboard data'
      setError(errorMsg)
      setStats(null)
      setActivity([])
    } finally {
      setLoading(false)
    }
  }

  const handleImportPrograms = async () => {
    if (!confirm('This will import/update programs from the AI pipeline (schemes.json). Continue?')) {
      return
    }
    try {
      setImporting(true)
      setImportResult(null)
      setError('')
      const response = await api.post('/admin/programs/import')
      setImportResult(response.data)
      await fetchDashboardData()
      alert(`✅ Import complete! ${response.data.imported} imported, ${response.data.updated} updated.`)
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to import programs'
      setError(errorMsg)
      alert(`Failed to import programs: ${errorMsg}`)
    } finally {
      setImporting(false)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  }
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
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
          <p className="text-sm text-gray-500">
            Logout and login again to refresh your access token with admin role.
          </p>
        </div>
      </div>
    )
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────
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
          <p className="text-gray-600">Manage Indian welfare programs powered by the AI ingestion pipeline</p>
        </motion.div>

        {/* Error banner */}
        {error && (
          <motion.div variants={itemVariants} className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </motion.div>
        )}

        {/* ── AI Pipeline Status ─────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="mb-8">
          <Card className="p-6 border-l-4 border-purple-500">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                  🤖 AI Pipeline Status
                </h2>
                {pipelineStatus ? (
                  pipelineStatus.available ? (
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>
                        <span className="font-medium text-green-700">✅ schemes.json ready</span>
                        {' — '}
                        <span className="font-semibold text-gray-900">{pipelineStatus.totalSchemes}</span> scheme(s) available
                      </p>
                      <p>Last pipeline run: <span className="font-mono text-xs bg-gray-100 px-1 rounded">{pipelineStatus.lastRun || '—'}</span></p>
                      {pipelineStatus.preview?.length > 0 && (
                        <p className="text-xs text-gray-500">
                          Preview: {pipelineStatus.preview.map(s => s.name).join(' · ')}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded p-3 mt-2">
                      <p className="font-medium">⚠️ schemes.json not found</p>
                      <p className="mt-1 font-mono text-xs">Run: <code>python3 backend/data/pipeline.py</code></p>
                    </div>
                  )
                ) : (
                  <p className="text-sm text-gray-400">Checking pipeline status…</p>
                )}
              </div>

              {/* Import button */}
              <Button
                onClick={handleImportPrograms}
                disabled={importing || !pipelineStatus?.available}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-6 py-3 whitespace-nowrap"
              >
                {importing ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span> Importing…
                  </span>
                ) : (
                  '📥 Import from Pipeline'
                )}
              </Button>
            </div>

            {/* Import result */}
            {importResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-5 p-4 bg-green-50 border border-green-200 rounded-lg"
              >
                <h3 className="font-semibold text-green-900 mb-3">Import Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {[
                    { label: 'Total',    value: importResult.total,    color: 'text-gray-900' },
                    { label: 'Imported', value: importResult.imported, color: 'text-green-600' },
                    { label: 'Updated',  value: importResult.updated,  color: 'text-blue-600' },
                    { label: 'Skipped',  value: importResult.skipped,  color: 'text-gray-500' },
                  ].map(({ label, value, color }) => (
                    <div key={label}>
                      <p className="text-gray-500">{label}</p>
                      <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </Card>
        </motion.div>

        {/* ── Statistics Grid ────────────────────────────────────────────── */}
        {stats && (
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Programs</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total</span>
                  <span className="text-2xl font-bold text-gray-900">{stats.programs.total}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Active</span>
                  <span className="text-xl font-semibold text-green-600">{stats.programs.active}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Inactive</span>
                  <span className="text-xl font-semibold text-gray-400">{stats.programs.inactive}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">👥 Users</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total</span>
                  <span className="text-2xl font-bold text-gray-900">{stats.users.total}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Verified</span>
                  <span className="text-xl font-semibold text-green-600">{stats.users.verified}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Unverified</span>
                  <span className="text-xl font-semibold text-orange-500">{stats.users.unverified}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">✅ Eligibility Checks</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total</span>
                  <span className="text-2xl font-bold text-gray-900">{stats.eligibilityChecks.total}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Last 7 Days</span>
                  <span className="text-xl font-semibold text-blue-600">{stats.eligibilityChecks.lastWeek}</span>
                </div>
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
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        item.type === 'program'     ? 'bg-blue-500'   :
                        item.type === 'user'        ? 'bg-green-500'  :
                                                      'bg-purple-500'
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.item}</p>
                        <p className="text-xs text-gray-500 capitalize">{item.type} {item.action}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">
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
