import { useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { Mail, RefreshCw, CheckCircle, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button, Card } from '../components/ui'
import { authAPI } from '../lib/api'

export default function EmailVerificationPendingPage() {
  const location = useLocation()
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const [resendSuccess, setResendSuccess] = useState(false)
  
  // Get email from location state (passed from registration)
  const email = location.state?.email || ''

  const handleResendVerification = async () => {
    if (!email) {
      setResendMessage('Email address not found. Please register again.')
      return
    }

    try {
      setIsResending(true)
      setResendMessage('')
      
      await authAPI.resendVerification({ email })
      
      setResendSuccess(true)
      setResendMessage('Verification email sent successfully! Please check your inbox.')
    } catch (error) {
      setResendSuccess(false)
      setResendMessage(error.message || 'Failed to resend verification email')
    } finally {
      setIsResending(false)
    }
  }

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

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div 
        className="max-w-md w-full"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <Card className="backdrop-blur-sm bg-white/80 shadow-xl border-0">
            <motion.div className="text-center" variants={itemVariants}>
              <motion.div 
                className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "reverse"
                }}
              >
                <Mail className="w-8 h-8 text-white" />
              </motion.div>
              
              <motion.h2 
                className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-2"
                variants={itemVariants}
              >
                Check Your Email
              </motion.h2>
              
              <motion.p 
                className="text-gray-600 mb-4"
                variants={itemVariants}
              >
                We've sent a verification link to:
              </motion.p>
              
              {email && (
                <motion.div 
                  className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-3 mb-6"
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                >
                  <p className="text-sm font-medium text-green-800">{email}</p>
                </motion.div>
              )}
              
              <motion.div 
                className="text-left bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 mb-6"
                variants={itemVariants}
              >
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-blue-600" />
                  Next Steps:
                </h3>
                <motion.ol className="text-sm text-gray-600 space-y-1">
                  {[
                    "Check your email inbox",
                    "Look for an email from CivicAI", 
                    "Click the verification link",
                    "You'll be automatically logged in"
                  ].map((step, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className="flex items-center"
                    >
                      <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs flex items-center justify-center mr-2 font-semibold">
                        {index + 1}
                      </span>
                      {step}
                    </motion.li>
                  ))}
                </motion.ol>
              </motion.div>

              <motion.div 
                className="text-sm text-gray-500 mb-6"
                variants={itemVariants}
              >
                <p>Didn't receive the email? Check your spam folder or click below to resend.</p>
              </motion.div>

              <AnimatePresence mode="wait">
                {resendMessage && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: -10 }}
                    className={`mb-4 p-3 rounded-lg ${
                      resendSuccess 
                        ? 'bg-green-50 border border-green-200 text-green-800' 
                        : 'bg-red-50 border border-red-200 text-red-800'
                    }`}
                  >
                    <div className="flex items-center">
                      {resendSuccess && <CheckCircle className="w-4 h-4 mr-2" />}
                      <p className="text-sm">{resendMessage}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div 
                className="space-y-3"
                variants={itemVariants}
              >
                <Button 
                  onClick={handleResendVerification}
                  disabled={isResending || !email}
                  className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 transform transition-all duration-200 hover:scale-[1.02] shadow-lg"
                  variant="outline"
                >
                  {isResending ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="flex items-center"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sending...
                    </motion.div>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Resend Verification Email
                    </>
                  )}
                </Button>

                <div className="flex space-x-3">
                  <Link to="/login" className="flex-1">
                    <Button variant="secondary" className="w-full hover:scale-[1.02] transition-transform">
                      Back to Login
                    </Button>
                  </Link>
                  
                  <Link to="/register" className="flex-1">
                    <Button variant="ghost" className="w-full hover:scale-[1.02] transition-transform">
                      Register Again
                    </Button>
                  </Link>
                </div>
              </motion.div>
            </motion.div>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}