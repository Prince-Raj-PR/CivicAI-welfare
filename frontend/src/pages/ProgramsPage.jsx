import { useState, useEffect, useCallback } from 'react'
import {
  Search, MapPin, Building2, Filter, Sparkles, X,
  CheckCircle, XCircle, ChevronLeft, ChevronRight, SlidersHorizontal,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button, Card, Badge, Input, Modal } from '../components/ui'
import { programsAPI, eligibilityAPI } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

const PROGRAM_TYPES = [
  'All', 'Healthcare', 'Food Assistance', 'Housing', 'Education',
  'Employment', 'Financial Aid', 'Childcare', 'Disability', 'Seniors', 'Other',
]

const PAGE_LIMIT = 20

export default function ProgramsPage() {
  const [programs,   setPrograms]   = useState([])
  const [total,      setTotal]      = useState(0)
  const [pagination, setPagination] = useState({ page: 1, pages: 1, hasMore: false })
  const [loading,    setLoading]    = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error,      setError]      = useState(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [activeType,  setActiveType]  = useState('All')
  const [showFilters, setShowFilters] = useState(false)

  // Eligibility modal
  const [selectedProgram,      setSelectedProgram]      = useState(null)
  const [showEligibilityModal, setShowEligibilityModal] = useState(false)
  const [eligibilityResult,    setEligibilityResult]    = useState(null)
  const [checkingEligibility,  setCheckingEligibility]  = useState(false)
  const [eligibilityForm, setEligibilityForm] = useState({
    annualIncome: '', householdSize: '', employmentStatus: 'employed', age: '',
  })

  const { isLoggedIn } = useAuth()
  const navigate = useNavigate()

  // ── Data fetching ────────────────────────────────────────────────────────
  const fetchPrograms = useCallback(async (page = 1, append = false) => {
    try {
      append ? setLoadingMore(true) : setLoading(true)
      setError(null)

      const params = { page, limit: PAGE_LIMIT }
      if (activeType !== 'All') params.type  = activeType
      if (searchQuery.trim())   params.search = searchQuery.trim()

      const res = await programsAPI.getAll(params)

      setPrograms(prev => append ? [...prev, ...(res.data || [])] : (res.data || []))
      setTotal(res.total || 0)
      setPagination(res.pagination || { page, pages: 1, hasMore: false })
    } catch (err) {
      setError('Failed to load programs')
      console.error(err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [activeType, searchQuery])

  // Re-fetch on filter change (reset to page 1)
  useEffect(() => {
    fetchPrograms(1, false)
  }, [activeType]) // eslint-disable-line

  const handleSearch = (e) => {
    e.preventDefault()
    fetchPrograms(1, false)
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    setActiveType('All')
    // useEffect won't fire since activeType didn't change; call directly
    programsAPI.getAll({ page: 1, limit: PAGE_LIMIT })
      .then(res => {
        setPrograms(res.data || [])
        setTotal(res.total || 0)
        setPagination(res.pagination || { page: 1, pages: 1, hasMore: false })
      })
      .catch(() => {})
  }

  const handleLoadMore = () => {
    if (pagination.hasMore && !loadingMore) {
      fetchPrograms(pagination.page + 1, true)
    }
  }

  const handlePageChange = (newPage) => {
    fetchPrograms(newPage, false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Eligibility ──────────────────────────────────────────────────────────
  const handleCheckEligibility = (program) => {
    if (!isLoggedIn) {
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
        annualIncome:     parseInt(eligibilityForm.annualIncome),
        householdSize:    parseInt(eligibilityForm.householdSize),
        employmentStatus: eligibilityForm.employmentStatus,
        age:              parseInt(eligibilityForm.age),
      }
      const response = await eligibilityAPI.check(personalInfo, [selectedProgram._id])
      if (response.success && response.data?.results?.length > 0) {
        const result = response.data.results[0]
        setEligibilityResult({
          program: selectedProgram,
          isEligible: result.isEligible,
          matchScore: result.score,
          reasons: [...(result.matchedCriteria || []), ...(result.unmatchedCriteria || []), ...(result.recommendations || [])],
          aiInsights: result.aiInsights || null,
        })
      }
    } catch (err) {
      alert('Failed to check eligibility: ' + (err.response?.data?.error || err.message))
    } finally {
      setCheckingEligibility(false)
    }
  }

  const closeModal = () => {
    setShowEligibilityModal(false)
    setSelectedProgram(null)
    setEligibilityResult(null)
    setEligibilityForm({ annualIncome: '', householdSize: '', employmentStatus: 'employed', age: '' })
  }

  // ── Render helpers ───────────────────────────────────────────────────────
  const typeColor = (type) => {
    const colors = {
      Healthcare: 'bg-red-100 text-red-700',
      Housing: 'bg-yellow-100 text-yellow-700',
      Education: 'bg-blue-100 text-blue-700',
      Employment: 'bg-green-100 text-green-700',
      'Financial Aid': 'bg-purple-100 text-purple-700',
      'Food Assistance': 'bg-orange-100 text-orange-700',
      Seniors: 'bg-teal-100 text-teal-700',
      Disability: 'bg-pink-100 text-pink-700',
    }
    return colors[type] || 'bg-gray-100 text-gray-700'
  }

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-500">Loading programs…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={() => fetchPrograms(1)}>Try Again</Button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* ── Header ── */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center px-4 py-2 bg-blue-50 rounded-full text-sm font-medium mb-4">
          <Sparkles className="w-4 h-4 mr-2 text-blue-600" />
          <span className="text-blue-800">Discover Your Benefits</span>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Browse Programs</h1>
        <p className="text-gray-500">
          {total > 0
            ? `${total.toLocaleString()} government welfare programs`
            : 'Discover welfare programs you may be eligible for'}
        </p>
      </div>

      {/* ── Search bar ── */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative max-w-2xl mx-auto flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search programs by name or keyword…"
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-gray-900"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6">
            Search
          </Button>
          <button
            type="button"
            onClick={() => setShowFilters(f => !f)}
            className={`p-3 rounded-xl border-2 transition-colors ${showFilters ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
            title="Filters"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>
      </form>

      {/* ── Type filter pills ── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div className="flex flex-wrap gap-2 justify-center pb-2">
              {PROGRAM_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveType(t)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    activeType === t
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Results count + active filters ── */}
      <div className="flex items-center justify-between mb-6 text-sm text-gray-500">
        <span>
          {total === 0
            ? 'No programs found'
            : `Showing ${programs.length} of ${total.toLocaleString()} programs`}
          {activeType !== 'All' && (
            <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">
              {activeType}
              <button onClick={() => setActiveType('All')}><X className="w-3 h-3" /></button>
            </span>
          )}
        </span>
        {total > 0 && (
          <span>Page {pagination.page} of {pagination.pages}</span>
        )}
      </div>

      {/* ── Programs grid ── */}
      {programs.length === 0 ? (
        <div className="text-center py-16">
          <Filter className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-1">No programs found</h3>
          <p className="text-gray-400 text-sm">Try different search terms or clear your filters</p>
          <button onClick={handleClearSearch} className="mt-4 text-blue-600 text-sm hover:underline">
            Clear all filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {programs.map((program) => (
              <motion.div
                key={program._id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="h-full flex flex-col hover:shadow-lg transition-shadow duration-200 border border-gray-100">
                  {/* Type badge + state */}
                  <div className="flex items-start justify-between mb-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${typeColor(program.type)}`}>
                      {program.type}
                    </span>
                    {program.state && program.state !== 'All India' && (
                      <span className="flex items-center text-xs text-gray-400 gap-1">
                        <MapPin className="w-3 h-3" />{program.state}
                      </span>
                    )}
                    {program.state === 'All India' && (
                      <span className="text-xs text-green-600 font-medium">🇮🇳 Nationwide</span>
                    )}
                  </div>

                  {/* Name */}
                  <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 leading-snug">
                    {program.name}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-gray-500 line-clamp-3 mb-4 flex-1">
                    {program.description || 'No description available.'}
                  </p>

                  {/* Agency */}
                  <div className="flex items-center text-xs text-gray-400 mb-4 gap-1.5">
                    <Building2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="line-clamp-1">{program.agency}</span>
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => handleCheckEligibility(program)}
                    className="mt-auto w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
                  >
                    Check Eligibility
                  </button>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* ── Pagination ── */}
          <div className="mt-10 flex flex-col items-center gap-4">
            {/* Load more button */}
            {pagination.hasMore && (
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-8 py-3 rounded-xl border-2 border-blue-600 text-blue-600 bg-white hover:bg-blue-50 font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingMore
                  ? <span className="flex items-center gap-2"><span className="animate-spin inline-block">⏳</span> Loading…</span>
                  : `Load more programs (${total - programs.length} remaining)`
                }
              </button>
            )}

            {/* Page number navigation */}
            {pagination.pages > 1 && (
              <div className="flex items-center gap-2 text-sm">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Page number pills */}
                {Array.from({ length: Math.min(7, pagination.pages) }, (_, i) => {
                  // Show pages around current page
                  const total_pages = pagination.pages
                  const current = pagination.page
                  let page
                  if (total_pages <= 7) {
                    page = i + 1
                  } else if (current <= 4) {
                    page = i + 1
                    if (i === 6) page = total_pages
                  } else if (current >= total_pages - 3) {
                    page = i === 0 ? 1 : total_pages - 6 + i
                  } else {
                    const offsets = [1, current - 2, current - 1, current, current + 1, current + 2, total_pages]
                    page = offsets[i]
                  }
                  const isEllipsisBefore = i === 1 && page > 2
                  const isEllipsisAfter  = i === 5 && page < total_pages - 1
                  if (isEllipsisBefore || isEllipsisAfter) {
                    return <span key={i} className="px-1 text-gray-400">…</span>
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => handlePageChange(page)}
                      className={`w-9 h-9 rounded-lg border font-medium transition-colors ${
                        page === current
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  )
                })}

                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.hasMore}
                  className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {!pagination.hasMore && programs.length > 0 && (
              <p className="text-sm text-gray-400">
                All {total.toLocaleString()} programs loaded
              </p>
            )}
          </div>
        </>
      )}

      {/* ── Eligibility Modal ── */}
      <Modal isOpen={showEligibilityModal} onClose={closeModal}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {eligibilityResult ? 'Eligibility Result' : 'Check Eligibility'}
            </h2>
            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          {selectedProgram && !eligibilityResult && (
            <>
              <div className="mb-5 p-4 bg-blue-50 rounded-lg">
                <p className="font-semibold text-blue-900 text-sm line-clamp-2">{selectedProgram.name}</p>
                <p className="text-xs text-blue-600 mt-1">{selectedProgram.agency}</p>
              </div>

              <form onSubmit={handleEligibilitySubmit} className="space-y-4">
                {[
                  { label: 'Annual Income (₹)', key: 'annualIncome', type: 'number', placeholder: 'e.g. 250000' },
                  { label: 'Household Size',     key: 'householdSize', type: 'number', placeholder: 'e.g. 4' },
                  { label: 'Age',                key: 'age',          type: 'number', placeholder: 'e.g. 35' },
                ].map(({ label, key, type, placeholder }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <Input
                      type={type}
                      required
                      value={eligibilityForm[key]}
                      onChange={(e) => setEligibilityForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full"
                    />
                  </div>
                ))}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employment Status</label>
                  <select
                    value={eligibilityForm.employmentStatus}
                    onChange={(e) => setEligibilityForm(f => ({ ...f, employmentStatus: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  >
                    <option value="employed">Employed</option>
                    <option value="unemployed">Unemployed</option>
                    <option value="self-employed">Self-Employed</option>
                    <option value="retired">Retired</option>
                    <option value="student">Student</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="button" onClick={closeModal} variant="outline" className="flex-1">Cancel</Button>
                  <Button
                    type="submit"
                    disabled={checkingEligibility}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {checkingEligibility ? 'Checking…' : 'Check Eligibility'}
                  </Button>
                </div>
              </form>
            </>
          )}

          {eligibilityResult && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${eligibilityResult.isEligible ? 'bg-green-100' : 'bg-red-100'}`}>
                {eligibilityResult.isEligible
                  ? <CheckCircle className="w-10 h-10 text-green-600" />
                  : <XCircle className="w-10 h-10 text-red-600" />
                }
              </div>

              <h3 className={`text-xl font-bold mb-2 ${eligibilityResult.isEligible ? 'text-green-800' : 'text-red-800'}`}>
                {eligibilityResult.isEligible ? 'You are Eligible!' : 'Not Eligible'}
              </h3>
              <p className="text-gray-500 text-sm mb-5">
                {eligibilityResult.isEligible
                  ? `You meet the requirements for ${selectedProgram.name}.`
                  : `You don't meet the current requirements for ${selectedProgram.name}.`}
              </p>

              {/* Match score */}
              <div className="bg-gray-50 rounded-lg p-4 mb-5 text-left">
                <p className="text-sm font-medium text-gray-700 mb-2">Match score</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${eligibilityResult.matchScore}%` }}
                      transition={{ duration: 0.8 }}
                      className={`h-full rounded-full ${
                        eligibilityResult.matchScore >= 70 ? 'bg-green-500' :
                        eligibilityResult.matchScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                    />
                  </div>
                  <span className="font-bold text-gray-900 text-sm">{eligibilityResult.matchScore}%</span>
                </div>

                {eligibilityResult.reasons?.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm text-gray-600">
                    {eligibilityResult.reasons.map((r, i) => (
                      <li key={i} className="flex gap-2"><span className="text-blue-400 mt-0.5">•</span>{r}</li>
                    ))}
                  </ul>
                )}
              </div>

              {eligibilityResult.aiInsights && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-5 text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-900">AI Insights</span>
                  </div>
                  {eligibilityResult.aiInsights.explanation && (
                    <p className="text-sm text-gray-700">{eligibilityResult.aiInsights.explanation}</p>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={closeModal} variant="outline" className="flex-1">Close</Button>
                {eligibilityResult.isEligible && selectedProgram.applicationProcess?.url && (
                  <Button
                    onClick={() => window.open(selectedProgram.applicationProcess.url, '_blank')}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Apply Now
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </Modal>
    </div>
  )
}
