import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Clock, CheckCircle, XCircle, Eye, Trash2 } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import api from '../lib/api'

const ApplicationsPage = () => {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchApplications()
  }, [filter])

  const fetchApplications = async () => {
    try {
      setLoading(true)
      const params = filter !== 'all' ? { status: filter } : {}
      const response = await api.get('/applications', { params })
      if (response.data.success) {
        setApplications(response.data.data)
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this application?')) return

    try {
      const response = await api.delete(`/applications/${id}`)
      if (response.data.success) {
        setApplications(applications.filter(app => app._id !== id))
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete application')
    }
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { variant: 'secondary', icon: FileText },
      submitted: { variant: 'info', icon: Clock },
      under_review: { variant: 'warning', icon: Clock },
      approved: { variant: 'success', icon: CheckCircle },
      denied: { variant: 'danger', icon: XCircle },
      withdrawn: { variant: 'secondary', icon: XCircle },
    }

    const config = statusConfig[status] || statusConfig.draft
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    )
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Applications</h1>
        <p className="text-gray-600 mt-2">
          Track and manage your program applications
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {['all', 'draft', 'submitted', 'under_review', 'approved', 'denied'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === status
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status.replace('_', ' ').toUpperCase()}
          </button>
        ))}
      </div>

      {/* Applications List */}
      {applications.length === 0 ? (
        <Card className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No applications found
          </h3>
          <p className="text-gray-600 mb-6">
            {filter === 'all' 
              ? "You haven't started any applications yet."
              : `You don't have any ${filter.replace('_', ' ')} applications.`
            }
          </p>
          <Link to="/programs">
            <Button>Browse Programs</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {applications.map((application) => (
            <Card key={application._id} className="hover:shadow-lg transition-shadow">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {application.program?.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {application.program?.agency} • {application.program?.category}
                      </p>
                    </div>
                    {getStatusBadge(application.status)}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                    <div>
                      <p className="text-gray-500">Created</p>
                      <p className="font-medium">{formatDate(application.createdAt)}</p>
                    </div>
                    {application.submissionDate && (
                      <div>
                        <p className="text-gray-500">Submitted</p>
                        <p className="font-medium">{formatDate(application.submissionDate)}</p>
                      </div>
                    )}
                    {application.decisionDate && (
                      <div>
                        <p className="text-gray-500">Decision</p>
                        <p className="font-medium">{formatDate(application.decisionDate)}</p>
                      </div>
                    )}
                    {application.eligibilityScore && (
                      <div>
                        <p className="text-gray-500">Match Score</p>
                        <p className="font-medium">{application.eligibilityScore}%</p>
                      </div>
                    )}
                  </div>

                  {application.denialReason && (
                    <div className="mt-4 p-3 bg-red-50 rounded-lg">
                      <p className="text-sm text-red-800">
                        <strong>Reason:</strong> {application.denialReason}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4 md:mt-0 md:ml-4">
                  <Link to={`/applications/${application._id}`}>
                    <Button variant="outline" size="sm" icon={<Eye className="w-4 h-4" />}>
                      View
                    </Button>
                  </Link>
                  {['draft', 'withdrawn'].includes(application.status) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(application._id)}
                      icon={<Trash2 className="w-4 h-4" />}
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default ApplicationsPage
