import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import ProgressBar from '../components/ui/ProgressBar'
import api from '../lib/api'

const EligibilityCheckPage = () => {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    age: '',
    state: '',
    city: '',
    
    // Step 2: Financial
    annualIncome: '',
    householdSize: '',
    employmentStatus: '',
    
    // Step 3: Special Status
    hasDisability: false,
    isVeteran: false,
    isStudent: false,
    numChildren: '',
  })

  const totalSteps = 3

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    } else {
      handleSubmit()
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const response = await api.post('/eligibility/check', formData)
      if (response.data.success) {
        setResults(response.data.data)
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to check eligibility')
    } finally {
      setLoading(false)
    }
  }

  const stateOptions = [
    { value: 'AL', label: 'Alabama' },
    { value: 'AK', label: 'Alaska' },
    { value: 'CA', label: 'California' },
    { value: 'TX', label: 'Texas' },
    { value: 'NY', label: 'New York' },
    // Add more states
  ]

  const employmentOptions = [
    { value: 'employed', label: 'Employed' },
    { value: 'unemployed', label: 'Unemployed' },
    { value: 'self_employed', label: 'Self-Employed' },
    { value: 'retired', label: 'Retired' },
    { value: 'student', label: 'Student' },
  ]

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Basic Information</h2>
            <Input
              label="Age"
              name="age"
              type="number"
              value={formData.age}
              onChange={handleChange}
              required
              placeholder="Enter your age"
            />
            <Select
              label="State"
              name="state"
              value={formData.state}
              onChange={handleChange}
              options={stateOptions}
              required
            />
            <Input
              label="City"
              name="city"
              value={formData.city}
              onChange={handleChange}
              required
              placeholder="Enter your city"
            />
          </div>
        )
      
      case 2:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Financial Information</h2>
            <Input
              label="Annual Household Income"
              name="annualIncome"
              type="number"
              value={formData.annualIncome}
              onChange={handleChange}
              required
              placeholder="Enter annual income"
            />
            <Input
              label="Household Size"
              name="householdSize"
              type="number"
              value={formData.householdSize}
              onChange={handleChange}
              required
              placeholder="Number of people in household"
            />
            <Select
              label="Employment Status"
              name="employmentStatus"
              value={formData.employmentStatus}
              onChange={handleChange}
              options={employmentOptions}
              required
            />
          </div>
        )
      
      case 3:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Additional Information</h2>
            <Input
              label="Number of Children"
              name="numChildren"
              type="number"
              value={formData.numChildren}
              onChange={handleChange}
              placeholder="0"
            />
            <div className="space-y-3 pt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="hasDisability"
                  checked={formData.hasDisability}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="ml-2 text-gray-700">I have a disability</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="isVeteran"
                  checked={formData.isVeteran}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="ml-2 text-gray-700">I am a veteran</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="isStudent"
                  checked={formData.isStudent}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="ml-2 text-gray-700">I am a student</span>
              </label>
            </div>
          </div>
        )
      
      default:
        return null
    }
  }

  if (results) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="mb-6">
          <div className="text-center mb-8">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Eligibility Check Complete!
            </h1>
            <p className="text-gray-600">
              We found {results.eligiblePrograms?.length || 0} programs you may be eligible for
            </p>
          </div>

          {results.eligiblePrograms && results.eligiblePrograms.length > 0 ? (
            <div className="space-y-4">
              {results.eligiblePrograms.map((program) => (
                <Card key={program._id} className="hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {program.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {program.agency} • {program.category}
                      </p>
                      {program.matchPercentage && (
                        <div className="mb-2">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Match Score</span>
                            <span className="font-semibold">{program.matchPercentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                program.matchPercentage >= 75 ? 'bg-green-600' :
                                program.matchPercentage >= 50 ? 'bg-yellow-600' : 'bg-red-600'
                              }`}
                              style={{ width: `${program.matchPercentage}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/programs/${program._id}`)}
                    >
                      View Details
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">
                We couldn't find any programs matching your current criteria.
              </p>
              <Button onClick={() => setResults(null)}>
                Try Again
              </Button>
            </div>
          )}

          <div className="mt-8 flex gap-4">
            <Button
              variant="outline"
              onClick={() => setResults(null)}
              className="flex-1"
            >
              Check Again
            </Button>
            <Button
              onClick={() => navigate('/programs')}
              className="flex-1"
            >
              Browse All Programs
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Check Your Eligibility
        </h1>
        <p className="text-gray-600">
          Answer a few questions to find programs you may qualify for
        </p>
      </div>

      <Card>
        <ProgressBar current={currentStep} total={totalSteps} className="mb-8" />
        
        <form onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
          {renderStep()}

          <div className="flex gap-4 mt-8">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                icon={<ArrowLeft className="w-5 h-5" />}
              >
                Back
              </Button>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
              icon={currentStep === totalSteps ? <CheckCircle className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
            >
              {loading ? 'Checking...' : currentStep === totalSteps ? 'Check Eligibility' : 'Next'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

export default EligibilityCheckPage
