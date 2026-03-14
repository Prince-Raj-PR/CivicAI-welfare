import { useState, useEffect } from 'react'
import { Search, MapPin, DollarSign, Building2, Filter, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button, Card, Badge, Input } from '../components/ui'
import { programsAPI } from '../lib/api'

export default function ProgramsPage() {
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

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
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
                        Check Eligibility
                      </Button>
                    </motion.div>
                  </motion.div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}