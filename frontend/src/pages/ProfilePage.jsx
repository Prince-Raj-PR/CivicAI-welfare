import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { User, Mail, Phone, MapPin, DollarSign, Users, Briefcase, Save } from 'lucide-react'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Button from '../components/ui/Button'
import api from '../lib/api'

const ProfilePage = () => {
  const { user, updateUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    householdSize: '',
    annualIncome: '',
    employmentStatus: '',
    hasDisability: false,
    isVeteran: false,
    isStudent: false,
    numChildren: '',
  })

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        dateOfBirth: user.dateOfBirth || '',
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        zipCode: user.zipCode || '',
        householdSize: user.householdSize || '',
        annualIncome: user.annualIncome || '',
        employmentStatus: user.employmentStatus || '',
        hasDisability: user.hasDisability || false,
        isVeteran: user.isVeteran || false,
        isStudent: user.isStudent || false,
        numChildren: user.numChildren || '',
      })
    }
  }, [user])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const response = await api.put('/users/profile', formData)
      if (response.data.success) {
        updateUser(response.data.data)
        setMessage({ type: 'success', text: 'Profile updated successfully!' })
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to update profile' 
      })
    } finally {
      setLoading(false)
    }
  }

  const stateOptions = [
    { value: 'AL', label: 'Alabama' },
    { value: 'AK', label: 'Alaska' },
    { value: 'AZ', label: 'Arizona' },
    { value: 'AR', label: 'Arkansas' },
    { value: 'CA', label: 'California' },
    { value: 'CO', label: 'Colorado' },
    { value: 'CT', label: 'Connecticut' },
    { value: 'DE', label: 'Delaware' },
    { value: 'FL', label: 'Florida' },
    { value: 'GA', label: 'Georgia' },
    // Add more states as needed
  ]

  const employmentOptions = [
    { value: 'employed', label: 'Employed' },
    { value: 'unemployed', label: 'Unemployed' },
    { value: 'self_employed', label: 'Self-Employed' },
    { value: 'retired', label: 'Retired' },
    { value: 'student', label: 'Student' },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600 mt-2">
          Update your personal information to get accurate program recommendations
        </p>
      </div>

      {message.text && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Personal Information */}
        <Card className="mb-6">
          <div className="flex items-center mb-4">
            <User className="w-5 h-5 text-primary-600 mr-2" />
            <h2 className="text-xl font-semibold">Personal Information</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="First Name"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
            />
            <Input
              label="Last Name"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              disabled
              icon={<Mail className="w-5 h-5" />}
            />
            <Input
              label="Phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              icon={<Phone className="w-5 h-5" />}
            />
            <Input
              label="Date of Birth"
              name="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={handleChange}
            />
          </div>
        </Card>

        {/* Address Information */}
        <Card className="mb-6">
          <div className="flex items-center mb-4">
            <MapPin className="w-5 h-5 text-primary-600 mr-2" />
            <h2 className="text-xl font-semibold">Address</h2>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <Input
              label="Street Address"
              name="address"
              value={formData.address}
              onChange={handleChange}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="City"
                name="city"
                value={formData.city}
                onChange={handleChange}
              />
              <Select
                label="State"
                name="state"
                value={formData.state}
                onChange={handleChange}
                options={stateOptions}
              />
              <Input
                label="ZIP Code"
                name="zipCode"
                value={formData.zipCode}
                onChange={handleChange}
              />
            </div>
          </div>
        </Card>

        {/* Household & Financial Information */}
        <Card className="mb-6">
          <div className="flex items-center mb-4">
            <DollarSign className="w-5 h-5 text-primary-600 mr-2" />
            <h2 className="text-xl font-semibold">Household & Financial Information</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Household Size"
              name="householdSize"
              type="number"
              value={formData.householdSize}
              onChange={handleChange}
              icon={<Users className="w-5 h-5" />}
            />
            <Input
              label="Number of Children"
              name="numChildren"
              type="number"
              value={formData.numChildren}
              onChange={handleChange}
            />
            <Input
              label="Annual Income"
              name="annualIncome"
              type="number"
              value={formData.annualIncome}
              onChange={handleChange}
              icon={<DollarSign className="w-5 h-5" />}
            />
            <Select
              label="Employment Status"
              name="employmentStatus"
              value={formData.employmentStatus}
              onChange={handleChange}
              options={employmentOptions}
              icon={<Briefcase className="w-5 h-5" />}
            />
          </div>
        </Card>

        {/* Special Status */}
        <Card className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Special Status</h2>
          
          <div className="space-y-3">
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
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={loading}
            icon={<Save className="w-5 h-5" />}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default ProfilePage
