import { useState, useEffect } from 'react'
import { Search, MapPin, DollarSign, Building2, Filter, Sparkles, X, CheckCircle, XCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button, Card, Badge, Input, Modal } from '../components/ui'
import { programsAPI, eligibilityAPI } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function ProgramsPage() {
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProgram, setSelectedProgram] = useState(null)
  const [showEligibilityModal, setShowEligibilityModal] = useState(false)
  const [eligibilityResult, setEligibilityResult] = useState(null)
  const [checkingEligibility, setCheckingEligibility] = useState(false)
  
  const { isLoggedIn } = useAuth()
  const navigate = useNavigate()

  // Form state for eligibility check
  const [eligibilityForm, setEligibilityForm] = useState({
    annualIncome: '',
    householdSize: '',
    employmentStatus: 'employed',
    age: ''
  })

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  }

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    },
    hover: {
      y: -8,
      scale: 1.02,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20
      }
    }
  }

  const loadingVariants = {
    animate: {
      rotate: 360,
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: "linear"
      }
    }
  }

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

  const handleCheckEligibility = (program) => {
    if (!isLoggedIn) {
      alert('Please login to check eligibility')
      navigate('/login')
      return
    }
    
    setSelectedProgram(program)
    setShowEligibilityModal(true)
    setEligibilityResult(null)
  }

  const handleEligibilitySubmit = async (e) => {
    e.preventDefault()
    
    try {
      setCheckingEligibility(true)
      
      const personalInfo = {
        annualIncome: parseInt(eligibilityForm.annualIncome),
        householdSize: parseInt(eligibilityForm.householdSize),
        employmentStatus: eligibilityForm.employmentStatus,
        age: parseInt(eligibilityForm.age)
      }
      
      console.log('Checking eligibility with:', personalInfo)
      console.log('Program ID:', selectedProgram._id)
      
      const response = await eligibilityAPI.check(personalInfo, [selectedProgram._id])
      
      console.log('Eligibility response:', response)
      
      // Backend returns { success: true, data: { summary, results } }
      if (response.success && response.data && response.data.results && response.data.results.length > 0) {
        console.log('Setting result:', response.data.results[0])
        const result = response.data.results[0]
        
        // Transform to match expected format and include AI insights
        setEligibilityResult({
          program: selectedProgram,
          isEligible: result.isEligible,
          matchScore: result.score,
          reasons: [
            ...result.matchedCriteria,
            ...result.unmatchedCriteria,
            ...result.recommendations
          ],
          // Include AI insights if available
          aiInsights: result.aiInsights || null
        })
      } else {
        console.error('No eligibility data in response:', response)
        alert('No eligibility data received. Please try again.')
      }
    } catch (err) {
      console.error('Error checking eligibility:', err)
      console.error('Error details:', err.response)
      alert('Failed to check eligibility: ' + (err.response?.data?.error || err.message))
    } finally {
      setCheckingEligibility(false)
    }
  }

  const closeModal = () => {
    setShowEligibilityModal(false)
    setSelectedProgram(null)
    setEligibilityResult(null)
    setEligibilityForm({
      annualIncome: '',
      householdSize: '',
      employmentStatus: 'employed',
      age: ''
    })
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full mx-auto mb-4"
            variants={loadingVariants}
            animate="animate"
          />
          <motion.p 
            className="text-gray-600 text-lg"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Loading programs...
          </motion.p>
        </motion.div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span className="text-red-600 text-2xl">⚠️</span>
          </motion.div>
          <p className="text-red-600 mb-4 text-lg">{error}</p>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button onClick={fetchPrograms}>
              Try Again
            </Button>
          </motion.div>
        </motion.div>
      </div>
    )
  }

  return (
    <motion.div 
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* Header */}
      <motion.div 
        className="mb-8 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <motion.div
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full text-sm font-medium mb-4"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Sparkles className="w-4 h-4 mr-2 text-blue-600" />
          <span className="text-blue-800">Discover Your Benefits</span>
        </motion.div>
        
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Browse Programs</h1>
        <motion.p 
          className="text-gray-600 text-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          Discover welfare programs you may be eligible for
        </motion.p>
      </motion.div>

      {/* Search */}
      <motion.form 
        onSubmit={handleSearch} 
        className="mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <motion.div 
          className="relative max-w-2xl mx-auto"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input 
            placeholder="Search programs by name, type, or keyword..."
            className="pl-12 pr-24 py-4 text-lg border-2 border-gray-200 focus:border-blue-500 rounded-xl shadow-lg focus:shadow-xl transition-all duration-300"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <motion.div
            className="absolute right-2 top-1/2 transform -translate-y-1/2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button 
              type="submit" 
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              size="sm"
            >
              Search
            </Button>
          </motion.div>
        </motion.div>
      </motion.form>

      {/* Programs Grid */}
      <AnimatePresence mode="wait">
        {programs.length === 0 ? (
          <motion.div 
            className="text-center py-16"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Filter className="w-12 h-12 text-gray-400" />
            </motion.div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No programs found</h3>
            <p className="text-gray-500">Try adjusting your search criteria</p>
          </motion.div>
        ) : (
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {programs.map((program, index) => (
              <motion.div
                key={program.id}
                variants={cardVariants}
                whileHover="hover"
                layout
              >
                <Card className="h-full hover:shadow-xl transition-shadow duration-300 border-0 shadow-lg bg-gradient-to-br from-white to-gray-50">
                  {/* Program Type Badge */}
                  <motion.div 
                    className="flex items-center justify-between mb-4"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <Badge 
                        variant="primary"
                        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1"
                      >
                        {program.type}
                      </Badge>
                    </motion.div>
                  </motion.div>

                  {/* Program Name */}
                  <motion.h3 
                    className="text-xl font-bold text-gray-900 mb-3 line-clamp-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.1 + 0.1 }}
                  >
                    {program.name}
                  </motion.h3>

                  {/* Description */}
                  <motion.p 
                    className="text-sm text-gray-600 mb-6 line-clamp-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.1 + 0.2 }}
                  >
                    {program.description}
                  </motion.p>

                  {/* Program Details */}
                  <motion.div 
                    className="space-y-3 text-sm mb-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 + 0.3 }}
                  >
                    <motion.div 
                      className="flex items-center text-gray-600 group"
                      whileHover={{ x: 5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <Building2 className="w-4 h-4 mr-3 text-blue-500 group-hover:text-blue-600 transition-colors" />
                      <span className="group-hover:text-gray-800 transition-colors">{program.agency}</span>
                    </motion.div>
                    <motion.div 
                      className="flex items-center text-gray-600 group"
                      whileHover={{ x: 5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <MapPin className="w-4 h-4 mr-3 text-green-500 group-hover:text-green-600 transition-colors" />
                      <span className="group-hover:text-gray-800 transition-colors">{program.location}</span>
                    </motion.div>
                    {program.maxBenefit > 0 && (
                      <motion.div 
                        className="flex items-center text-gray-600 group"
                        whileHover={{ x: 5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <DollarSign className="w-4 h-4 mr-3 text-emerald-500 group-hover:text-emerald-600 transition-colors" />
                        <span className="group-hover:text-gray-800 transition-colors font-medium">
                          Up to ${program.maxBenefit}/month
                        </span>
                      </motion.div>
                    )}
                  </motion.div>

                  {/* CTA */}
                  <motion.div 
                    className="mt-auto pt-4 border-t border-gray-100"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.1 + 0.4 }}
                  >
                    <button
                      onClick={() => handleCheckEligibility(program)}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
                    >
                      Check Eligibility
                    </button>
                  </motion.div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Eligibility Check Modal */}
      <Modal isOpen={showEligibilityModal} onClose={closeModal}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {eligibilityResult ? 'Eligibility Result' : 'Check Eligibility'}
            </h2>
            <button
              onClick={closeModal}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {selectedProgram && !eligibilityResult && (
            <>
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-1">{selectedProgram.name}</h3>
                <p className="text-sm text-blue-700">{selectedProgram.agency}</p>
              </div>

              <form onSubmit={handleEligibilitySubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Annual Income ($)
                  </label>
                  <Input
                    type="number"
                    required
                    value={eligibilityForm.annualIncome}
                    onChange={(e) => setEligibilityForm({ ...eligibilityForm, annualIncome: e.target.value })}
                    placeholder="e.g., 35000"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Household Size
                  </label>
                  <Input
                    type="number"
                    required
                    min="1"
                    value={eligibilityForm.householdSize}
                    onChange={(e) => setEligibilityForm({ ...eligibilityForm, householdSize: e.target.value })}
                    placeholder="e.g., 3"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employment Status
                  </label>
                  <select
                    required
                    value={eligibilityForm.employmentStatus}
                    onChange={(e) => setEligibilityForm({ ...eligibilityForm, employmentStatus: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="employed">Employed</option>
                    <option value="unemployed">Unemployed</option>
                    <option value="self-employed">Self-Employed</option>
                    <option value="retired">Retired</option>
                    <option value="student">Student</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age
                  </label>
                  <Input
                    type="number"
                    required
                    min="1"
                    max="120"
                    value={eligibilityForm.age}
                    onChange={(e) => setEligibilityForm({ ...eligibilityForm, age: e.target.value })}
                    placeholder="e.g., 35"
                    className="w-full"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    onClick={closeModal}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={checkingEligibility}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {checkingEligibility ? 'Checking...' : 'Check Eligibility'}
                  </Button>
                </div>
              </form>
            </>
          )}

          {eligibilityResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
                  eligibilityResult.isEligible 
                    ? 'bg-green-100' 
                    : 'bg-red-100'
                }`}
              >
                {eligibilityResult.isEligible ? (
                  <CheckCircle className="w-12 h-12 text-green-600" />
                ) : (
                  <XCircle className="w-12 h-12 text-red-600" />
                )}
              </motion.div>

              <h3 className={`text-2xl font-bold mb-2 ${
                eligibilityResult.isEligible ? 'text-green-900' : 'text-red-900'
              }`}>
                {eligibilityResult.isEligible ? 'You are Eligible!' : 'Not Eligible'}
              </h3>

              <p className="text-gray-600 mb-4">
                {eligibilityResult.isEligible 
                  ? `Congratulations! You meet the requirements for ${selectedProgram.name}.`
                  : `Unfortunately, you don't meet the current requirements for ${selectedProgram.name}.`
                }
              </p>

              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <h4 className="font-semibold text-gray-900 mb-3">Match Score</h4>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${eligibilityResult.matchScore}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className={`h-full ${
                        eligibilityResult.matchScore >= 70 
                          ? 'bg-green-500' 
                          : eligibilityResult.matchScore >= 40 
                          ? 'bg-yellow-500' 
                          : 'bg-red-500'
                      }`}
                    />
                  </div>
                  <span className="font-bold text-gray-900">{eligibilityResult.matchScore}%</span>
                </div>

                {eligibilityResult.reasons && eligibilityResult.reasons.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Details</h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      {eligibilityResult.reasons.map((reason, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-blue-500 mt-1">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* AI Insights */}
                {eligibilityResult.aiInsights && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-5 h-5 text-blue-600" />
                      <h4 className="font-semibold text-blue-900">AI Insights</h4>
                    </div>
                    
                    {eligibilityResult.aiInsights.explanation && (
                      <div className="mb-3">
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {eligibilityResult.aiInsights.explanation}
                        </p>
                      </div>
                    )}

                    {eligibilityResult.aiInsights.advice && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-800 mb-1">💡 Advice:</p>
                        <p className="text-sm text-gray-700">
                          {eligibilityResult.aiInsights.advice}
                        </p>
                      </div>
                    )}

                    {eligibilityResult.aiInsights.applicationTips && eligibilityResult.isEligible && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-800 mb-1">📝 Application Tips:</p>
                        <p className="text-sm text-gray-700">
                          {eligibilityResult.aiInsights.applicationTips}
                        </p>
                      </div>
                    )}

                    {eligibilityResult.aiInsights.similarPrograms && eligibilityResult.aiInsights.similarPrograms.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-800 mb-1">🔍 Similar Programs:</p>
                        <p className="text-sm text-gray-700">
                          {eligibilityResult.aiInsights.similarPrograms.join(', ')}
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={closeModal}
                  variant="outline"
                  className="flex-1"
                >
                  Close
                </Button>
                {eligibilityResult.isEligible && (
                  <Button
                    onClick={() => {
                      window.open(selectedProgram.applicationProcess?.url, '_blank')
                    }}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    Apply Now
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </Modal>
    </motion.div>
  )
}