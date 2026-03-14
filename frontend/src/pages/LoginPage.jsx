import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LogIn, Mail, Eye, EyeOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button, Card } from '../components/ui'
import FormInput from '../components/ui/FormInput'
import { loginSchema } from '../lib/validations'
import { useAuth } from '../contexts/AuthContext'
import { authAPI } from '../lib/api'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [loginError, setLoginError] = useState('')
  const [showResendVerification, setShowResendVerification] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data) => {
    try {
      setLoginError('')
      setShowResendVerification(false)
      
      const result = await login(data)
      
      if (result.success) {
        navigate('/dashboard')
      }
    } catch (error) {
      console.error('Login failed:', error)
      
      if (error.message.includes('EMAIL_NOT_VERIFIED') || error.message.includes('verify your email')) {
        setShowResendVerification(true)
        setUserEmail(data.email)
        setLoginError('Please verify your email address before logging in.')
      } else {
        setLoginError(error.message || 'Login failed. Please check your credentials.')
      }
    }
  }

  const handleResendVerification = async () => {
    try {
      await authAPI.resendVerification({ email: userEmail })
      navigate('/email-verification-pending', {
        state: { email: userEmail }
      })
    } catch (error) {
      setLoginError('Failed to resend verification email. Please try again.')
    }
  }

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

  const errorVariants = {
    hidden: { opacity: 0, scale: 0.8, y: -10 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { duration: 0.3, ease: "easeOut" }
    },
    exit: { 
      opacity: 0, 
      scale: 0.8, 
      y: -10,
      transition: { duration: 0.2 }
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
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
                className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <LogIn className="w-8 h-8 text-white" />
              </motion.div>
              <motion.h2 
                className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent"
                variants={itemVariants}
              >
                Welcome Back
              </motion.h2>
              <motion.p 
                className="text-gray-600 mt-2"
                variants={itemVariants}
              >
                Sign in to your CivicAI account
              </motion.p>
            </motion.div>

            <motion.form 
              onSubmit={handleSubmit(onSubmit)} 
              className="space-y-6"
              variants={itemVariants}
            >
              <AnimatePresence mode="wait">
                {loginError && (
                  <motion.div
                    variants={errorVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="bg-red-50 border border-red-200 rounded-lg p-4"
                  >
                    <p className="text-sm text-red-800">{loginError}</p>
                    {showResendVerification && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ delay: 0.2 }}
                      >
                        <Button
                          type="button"
                          onClick={handleResendVerification}
                          variant="outline"
                          size="sm"
                          className="mt-2 border-red-300 text-red-700 hover:bg-red-50"
                        >
                          <Mail className="w-4 h-4 mr-2" />
                          Resend Verification Email
                        </Button>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div variants={itemVariants}>
                <FormInput
                  {...register('email')}
                  type="email"
                  label="Email Address"
                  placeholder="you@example.com"
                  error={errors.email}
                  required
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
              </motion.div>

              <motion.div 
                className="flex items-center justify-between"
                variants={itemVariants}
              >
                <div className="flex items-center">
                  <motion.input
                    {...register('remember')}
                    id="remember"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-all duration-200"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  />
                  <label htmlFor="remember" className="ml-2 block text-sm text-gray-700">
                    Remember me
                  </label>
                </div>
                <motion.a 
                  href="#" 
                  className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
                  whileHover={{ scale: 1.05 }}
                >
                  Forgot password?
                </motion.a>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transform transition-all duration-200 hover:scale-[1.02] shadow-lg" 
                  loading={isSubmitting}
                  disabled={isSubmitting}
                >
                  <motion.span
                    initial={false}
                    animate={isSubmitting ? { opacity: 0 } : { opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {isSubmitting ? 'Signing In...' : 'Sign In'}
                  </motion.span>
                </Button>
              </motion.div>
            </motion.form>

            <motion.div 
              className="mt-6 text-center"
              variants={itemVariants}
            >
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link 
                  to="/register" 
                  className="text-blue-600 hover:text-blue-700 font-medium transition-colors hover:underline"
                >
                  Sign up for free
                </Link>
              </p>
            </motion.div>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}