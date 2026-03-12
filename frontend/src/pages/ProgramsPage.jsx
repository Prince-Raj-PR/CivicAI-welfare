import { useState, useEffect } from 'react'
import { Search, MapPin, DollarSign, Building2 } from 'lucide-react'
import { Button, Card, Badge, Input } from '../components/ui'
import { programsAPI } from '../lib/api'

export default function ProgramsPage() {
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchPrograms()
  }, [])

  const fetchPrograms = async () => {
    try {
      setLoading(true)
      const response = await programsAPI.getAll()
      setPrograms(response.data || [])
    } catch (err) {
      setError('Failed to load programs')
      console.error('Error fetching programs:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) {
      fetchPrograms()
      return
    }

    try {
      setLoading(true)
      const response = await programsAPI.search(searchQuery)
      setPrograms(response.data || [])
    } catch (err) {
      setError('Search failed')
      console.error('Error searching programs:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading programs...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <Button onClick={fetchPrograms} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Browse Programs</h1>
        <p className="text-gray-600 mt-2">
          Discover welfare programs you may be eligible for
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input 
            placeholder="Search programs..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button 
            type="submit" 
            className="absolute right-2 top-1/2 transform -translate-y-1/2"
            size="sm"
          >
            Search
          </Button>
        </div>
      </form>

      {/* Programs Grid */}
      {programs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No programs found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map((program) => (
            <Card key={program.id} hover>
              {/* Program Type Badge */}
              <div className="flex items-center justify-between mb-3">
                <Badge variant="primary">
                  {program.type}
                </Badge>
              </div>

              {/* Program Name */}
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {program.name}
              </h3>

              {/* Description */}
              <p className="text-sm text-gray-600 mb-4">
                {program.description}
              </p>

              {/* Program Details */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center text-gray-600">
                  <Building2 className="w-4 h-4 mr-2" />
                  <span>{program.agency}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>{program.location}</span>
                </div>
                {program.maxBenefit > 0 && (
                  <div className="flex items-center text-gray-600">
                    <DollarSign className="w-4 h-4 mr-2" />
                    <span>Up to ${program.maxBenefit}/month</span>
                  </div>
                )}
              </div>

              {/* CTA */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <Button className="w-full">
                  Check Eligibility
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}