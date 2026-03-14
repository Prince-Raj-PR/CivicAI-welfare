import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlus, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button, Card } from '../components/ui'
import FormInput from '../components/ui/FormInput'
import { registerSchema } from '../lib/validations'
import { useAuth } from '../contexts/AuthContext'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register: registerUser } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [registrationError, setRegistrationError] = useState('')
  const [currentStep, setCurrentStep] = useState(1)
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
  })

  const watchedPassword = watch('password', '')
  const watchedEmail = watch('email', '')

  const onSubmit = async (data) => {
    try {
      setRegistrationError('')
      const response = await registerUser(data)
      
      if (response.success) {
        navigate('/email-verification-pending', {
          state: { email: data.email }
        })
      }
    } catch (error) {
      console.error('Registration failed:', error)
      setRegistrationError(error.message || 'Registration failed. Please try again.')
    }
  }

  // Password strength checker
  const getPasswordStrength = (password) => {
    if (!password) return { score: 0, text: '', color: 'gray' }
    
    let score = 0
    if (password.length >= 8) score++
    if (/[A-Z]/.test(password)) score++
    if (/[a-z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++

    const levels = [
      { score: 0, text: '', color: 'gray' },
      { score: 1, text: 'Very Weak', color: 'red' },
      { score: 2, text: 'Weak', color: 'orange' },
      { score: 3, text: 'Fair', color: 'yellow' },
      { score: 4, text: 'Good', color: 'blue' },
      { score: 5, text: 'Strong', color: 'green' }
    ]

    return levels[score] || levels[0]
  }

  const passwordStrength = getPasswordStrength(watchedPassword)

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.6,
        ease: "easeOut",
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" }
    }
  }

  const stepVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.4, ease: "easeOut" }
    },
    exit: { 
      opacity: 0, 
      x: -50,
      transition: { duration: 0.3 }
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div 
        className="max-w-md w-full"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <Card className="backdrop-blur-sm bg-white/80 shadow-xl border-0">
            <motion.div 
              className="text-center mb-8"
              variants={itemVariants}
            >
              <motion.div 
                className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
                whileHover={{ scale: 1.05, rotate: -5 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <UserPlus className="w-8 h-8 text-white" />
              </motion.div>
              <motion.h2 
                className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent"
                variants={itemVariants}
              >
                Create Account
              </motion.h2>
              <motion.p 
                className="text-gray-600 mt-2"
                variants={itemVariants}
              >
                Start discovering programs you qualify for
              </motion.p>
            </motion.div>

            {/* Progress Indicator */}
            <motion.div 
              className="mb-6"
              variants={itemVariants}
            >
              <div className="flex items-center justify-center space-x-2">
                {[1, 2, 3].map((step) => (
                  <motion.div
                    key={step}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      step <= currentStep ? 'bg-gradient-to-r from-purple-600 to-blue-600' : 'bg-gray-200'
                    }`}
                    animate={{ scale: step === currentStep ? 1.2 : 1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  />
                ))}
              </div>
            </motion.div>

            <motion.form 
              onSubmit={handleSubmit(onSubmit)} 
              className="space-y-6"
              variants={itemVariants}
            >
              <AnimatePresence mode="wait">
                {registrationError && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: -10 }}
                    className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start"
                  >
                    <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">{registrationError}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                variants={itemVariants}
              >
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <FormInput
                    {...register('firstName')}
                    type="text"
                    label="First Name"
                    placeholder="John"
                    error={errors.firstName}
                    required
                    className="transition-all duration-200"
                  />
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <FormInput
                    {...register('lastName')}
                    type="text"
                    label="Last Name"
                    placeholder="Doe"
                    error={errors.lastName}
                    required
                    className="transition-all duration-200"
                  />
                </motion.div>
              </motion.div>

              <motion.div variants={itemVariants}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <FormInput
                    {...register('email')}
                    type="email"
                    label="Email Address"
                    placeholder="you@example.com"
                    error={errors.email}
                    required
                    className="transition-all duration-200"
                  />
                </motion.div>
                {watchedEmail && !errors.email && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 flex items-center text-green-600"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    <span className="text-sm">Valid email format</span>
                  </motion.div>
                )}
              </motion.div>

              <motion.div variants={itemVariants}>
                <FormInput
                  {...register('phone')}
                  type="tel"
                  label="Phone Number"
                  placeholder="(555) 123-4567"
                  error={errors.phone}
                  helperText="Optional"
                  className="transition-all duration-200 focus:scale-[1.02]"
                />
              </motion.div>

              <motion.div variants={itemVariants} className="relative">
                <FormInput
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  label="Password"
                  placeholder="••••••••"
                  error={errors.password}
                  required
                  className="transition-all duration-200 focus:scale-[1.02] pr-12"
                />
                <motion.button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-gray-400 hover:text-gray-600 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </motion.button>
                
                {/* Password Strength Indicator */}
                {watchedPassword && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <motion.div
                          className={`h-2 rounded-full bg-${passwordStrength.color}-500`}
                          initial={{ width: 0 }}
                          animate={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <span className={`text-sm text-${passwordStrength.color}-600`}>
                        {passwordStrength.text}
                      </span>
                    </div>
                  </motion.div>
                )}
              </motion.div>

              <motion.div variants={itemVariants} className="relative">
                <FormInput
                  {...register('confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  label="Confirm Password"
                  placeholder="••••••••"
                  error={errors.confirmPassword}
                  required
                  className="transition-all duration-200 focus:scale-[1.02] pr-12"
                />
                <motion.button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-9 text-gray-400 hover:text-gray-600 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </motion.button>
              </motion.div>

              <motion.div 
                className="flex items-start"
                variants={itemVariants}
              >
                <motion.input
                  {...register('agreeToTerms')}
                  id="agreeToTerms"
                  type="checkbox"
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded mt-1 transition-all duration-200"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                />
                <label htmlFor="agreeToTerms" className="ml-2 block text-sm text-gray-700">
                  I agree to the{' '}
                  <motion.a 
                    href="#" 
                    className="text-purple-600 hover:text-purple-700 transition-colors"
                    whileHover={{ scale: 1.05 }}
                  >
                    Terms of Service
                  </motion.a>{' '}
                  and{' '}
                  <motion.a 
                    href="#" 
                    className="text-purple-600 hover:text-purple-700 transition-colors"
                    whileHover={{ scale: 1.05 }}
                  >
                    Privacy Policy
                  </motion.a>
                </label>
              </motion.div>
              
              <AnimatePresence>
                {errors.agreeToTerms && (
                  <motion.p 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-sm text-red-600 flex items-center"
                  >
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.agreeToTerms.message}
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.div variants={itemVariants}>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transform transition-all duration-200 hover:scale-[1.02] shadow-lg"
                  loading={isSubmitting}
                  disabled={isSubmitting}
                >
                  <motion.span
                    initial={false}
                    animate={isSubmitting ? { opacity: 0 } : { opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {isSubmitting ? 'Creating Account...' : 'Create Account'}
                  </motion.span>
                </Button>
              </motion.div>
            </motion.form>

            <motion.div 
              className="mt-6 text-center"
              variants={itemVariants}
            >
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link 
                  to="/login" 
                  className="text-purple-600 hover:text-purple-700 font-medium transition-colors hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </motion.div>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}