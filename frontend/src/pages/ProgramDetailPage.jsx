import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  Building2, 
  MapPin, 
  DollarSign, 
  Users, 
  Calendar,
  CheckCircle,
  FileText,
  ExternalLink
} from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

const ProgramDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [program, setProgram] = useState(null)
  const [eligibility, setEligibility] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checkingEligibility, setCheckingEligibility] = useState(false)

  useEffect(() => {
    fetchProgram()
  }, [id])

  const fetchProgram = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/programs/${id}`)
      if (response.data.success) {
        setProgram(response.data.data)
        if (user) {
          checkEligibility()
        }
      }
    } catch (error) {
      console.error('Failed to fetch program:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkEligibility = async () => {
    try {
      setCheckingEligibility(true)
      const response = await api.post('/eligibility/check', {
        programId: id
      })
      if (response.data.success) {
        setEligibility(response.data.data)
      }
    } catch (error) {
      console.error('Failed to check eligibility:', error)
    } finally {
      setCheckingEligibility(false)
    }
  }

  const handleApply = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/programs/${id}` } })
      return
    }

    try {
      const response = await api.post('/applications', {
        programId: id,
        formData: {},
      })
      if (response.data.success) {
        navigate(`/applications/${response.data.data._id}`)
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create application')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!program) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Program Not Found</h2>
          <p className="text-gray-600 mb-6">The program you're looking for doesn't exist.</p>
          <Link to="/programs">
            <Button>Browse Programs</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Back
      </button>

      {/* Program Header */}
      <Card className="mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{program.name}</h1>
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="primary">{program.category}</Badge>
              <Badge variant="secondary">{program.benefitType}</Badge>
              {program.status === 'active' && <Badge variant="success">Active</Badge>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center text-gray-600">
            <Building2 className="w-5 h-5 mr-2" />
            <span>{program.agency}</span>
          </div>
          <div className="flex items-center text-gray-600">
            <MapPin className="w-5 h-5 mr-2" />
            <span>{program.state || 'All India'}</span>
          </div>
          {program.benefitAmount && (
            <div className="flex items-center text-gray-600">
              <DollarSign className="w-5 h-5 mr-2" />
              <span>₹{program.benefitAmount.toLocaleString()}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Eligibility Check Result */}
      {user && eligibility && (
        <Card className={`mb-6 ${
          eligibility.isEligible ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-start">
            <CheckCircle className={`w-6 h-6 mr-3 ${
              eligibility.isEligible ? 'text-green-600' : 'text-yellow-600'
            }`} />
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">
                {eligibility.isEligible ? 'You may be eligible!' : 'Eligibility Check'}
              </h3>
              <p className="text-gray-700 mb-3">{eligibility.explanation}</p>
              {eligibility.matchPercentage && (
                <div className="mb-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Match Score</span>
                    <span className="font-semibold">{eligibility.matchPercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        eligibility.matchPercentage >= 75 ? 'bg-green-600' :
                        eligibility.matchPercentage >= 50 ? 'bg-yellow-600' : 'bg-red-600'
                      }`}
                      style={{ width: `${eligibility.matchPercentage}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Description */}
      <Card className="mb-6">
        <h2 className="text-xl font-semibold mb-4">About This Program</h2>
        <p className="text-gray-700 whitespace-pre-line">{program.description}</p>
      </Card>

      {/* Eligibility Criteria */}
      {program.eligibilityCriteria && (
        <Card className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Eligibility Requirements</h2>
          <div className="space-y-3">
            {program.eligibilityCriteria.maxIncome && (
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
                <span>Annual income must be below ₹{program.eligibilityCriteria.maxIncome.toLocaleString()}</span>
              </div>
            )}
            {program.eligibilityCriteria.minAge && (
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
                <span>Minimum age: {program.eligibilityCriteria.minAge} years</span>
              </div>
            )}
            {program.eligibilityCriteria.maxAge && (
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
                <span>Maximum age: {program.eligibilityCriteria.maxAge} years</span>
              </div>
            )}
            {program.eligibilityCriteria.requiresCitizenship && (
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
                <span>Must be an Indian citizen</span>
              </div>
            )}
            {program.eligibilityCriteria.requiresResidency && (
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
                <span>Must be a resident of {program.state}</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Required Documents */}
      {program.requiredDocuments && program.requiredDocuments.length > 0 && (
        <Card className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Required Documents</h2>
          <ul className="space-y-2">
            {program.requiredDocuments.map((doc, index) => (
              <li key={index} className="flex items-start">
                <FileText className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                <span>{doc}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Application Deadline */}
      {program.applicationDeadline && (
        <Card className="mb-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-center">
            <Calendar className="w-5 h-5 text-yellow-600 mr-2" />
            <span className="font-semibold">Application Deadline:</span>
            <span className="ml-2">
              {new Date(program.applicationDeadline).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>
        </Card>
      )}

      {/* Contact Information */}
      {(program.contactPhone || program.contactEmail || program.website) && (
        <Card className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
          <div className="space-y-2">
            {program.contactPhone && (
              <p><strong>Phone:</strong> {program.contactPhone}</p>
            )}
            {program.contactEmail && (
              <p><strong>Email:</strong> {program.contactEmail}</p>
            )}
            {program.website && (
              <p>
                <strong>Website:</strong>{' '}
                <a
                  href={program.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:underline inline-flex items-center"
                >
                  Visit Website
                  <ExternalLink className="w-4 h-4 ml-1" />
                </a>
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          onClick={handleApply}
          size="lg"
          className="flex-1"
          disabled={!user || (eligibility && !eligibility.isEligible)}
        >
          {!user ? 'Login to Apply' : 'Start Application'}
        </Button>
        {program.website && (
          <Button
            variant="outline"
            size="lg"
            onClick={() => window.open(program.website, '_blank')}
            icon={<ExternalLink className="w-5 h-5" />}
          >
            Official Site
          </Button>
        )}
      </div>
    </div>
  )
}

export default ProgramDetailPage
