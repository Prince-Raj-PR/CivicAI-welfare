import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, Button } from '../components/ui'
import { api } from '../lib/api'

const AdminDashboard = () => {
  const [stats, setStats] = useState(null)
  const [activity, setActivity] = useState([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError('')
      
      console.log('Fetching dashboard data...')
      
      const [statsRes, activityRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/activity?limit=10')
      ])

      console.log('Stats response:', statsRes)
      console.log('Activity response:', activityRes)

      // API returns { success: true, data: {...} }, so we need .data
      setStats(statsRes.data)
      setActivity(activityRes.data)
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      console.error('Error details:', {
        message: err.message,
        response: err.response,
        status: err.response?.status
      })
      
      const errorMsg = err.response?.data?.error || err.message || 'Failed to load dashboard data'
      setError(errorMsg)
      
      // Set empty data to prevent crashes
      setStats(null)
      setActivity([])
    } finally {
      setLoading(false)
    }
  }

  const handleImportPrograms = async () => {
    if (!confirm('This will import/update programs from government sources. Continue?')) {
      return
    }

    try {
      setImporting(true)
      setImportResult(null)
      setError('')

      const response = await api.post('/admin/programs/import')
      
      console.log('Import response:', response)
      setImportResult(response.data)
      
      // Refresh stats after import
      await fetchDashboardData()
      
      alert('Programs imported successfully!')
    } catch (err) {
      console.error('Error importing programs:', err)
      console.error('Error details:', {
        message: err.message,
        response: err.response,
        status: err.response?.status,
        data: err.response?.data
      })
      const errorMsg = err.response?.data?.error || err.message || 'Failed to import programs'
      setError(errorMsg)
      alert(`Failed to import programs: ${errorMsg}`)
    } finally {
      setImporting(false)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Show error if not authorized
  if (error && error.includes('denied')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            You need admin privileges to access this page. Please contact an administrator.
          </p>
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
          <p className="text-gray-600">Manage programs and monitor system activity</p>
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div
            variants={itemVariants}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg"
          >
            <p className="text-red-600">{error}</p>
          </motion.div>
        )}

        {/* Import Programs Section */}
        <motion.div variants={itemVariants} className="mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Import Government Programs
                </h2>
                <p className="text-gray-600">
                  Fetch and import welfare programs from government sources
                </p>
              </div>
              <Button
                onClick={handleImportPrograms}
                disabled={importing}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3"
              >
                {importing ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Importing...
                  </>
                ) : (
                  '📥 Import Programs'
                )}
              </Button>
            </div>

            {/* Import Result */}
            {importResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg"
              >
                <h3 className="font-semibold text-green-900 mb-2">Import Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Total</p>
                    <p className="text-2xl font-bold text-gray-900">{importResult.total}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Imported</p>
                    <p className="text-2xl font-bold text-green-600">{importResult.imported}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Updated</p>
                    <p className="text-2xl font-bold text-blue-600">{importResult.updated}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Skipped</p>
                    <p className="text-2xl font-bold text-gray-600">{importResult.skipped}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </Card>
        </motion.div>

        {/* Statistics Grid */}
        {stats && (
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Programs Stats */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Programs</h3>
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
                  <span className="text-xl font-semibold text-gray-500">{stats.programs.inactive}</span>
                </div>
              </div>
            </Card>

            {/* Users Stats */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Users</h3>
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

            {/* Eligibility Checks Stats */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Eligibility Checks</h3>
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

        {/* Recent Activity */}
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
                        item.type === 'program' ? 'bg-blue-500' :
                        item.type === 'user' ? 'bg-green-500' :
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
