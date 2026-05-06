import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { CheckCircle, XCircle, Mail, ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button, Card } from '../components/ui'
import OTPInput from '../components/ui/OTPInput'
import { useAuth } from '../contexts/AuthContext'
import { authAPI, setAuthToken } from '../lib/api'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { updateUser, checkAuthStatus } = useAuth()
  
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [otp, setOtp] = useState('')
  const [status, setStatus] = useState('input') // input, verifying, success, error
  const [message, setMessage] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const verifyEmail = async () => {
    if (otp.length !== 6) {
      setMessage('Please enter the complete 6-digit code')
      return
    }

    if (!email) {
      setMessage('Email address is required')
      return
    }

    try {
      setStatus('verifying')
      setMessage('')
      
      const response = await authAPI.verifyEmail({ email, otp })
      
      if (response.success) {
        setStatus('success')
        setMessage(response.message)
        
        // Save auth token and update auth context
        if (response.data.token) {
          setAuthToken(response.data.token)
          updateUser(response.data.user)
          await checkAuthStatus()
          
          setTimeout(() => {
            navigate('/dashboard')
          }, 2000)
        }
      }
    } catch (error) {
      setStatus('error')
      setMessage(error.message || 'Invalid or expired OTP')
      setOtp('') // Clear OTP on error
    }
  }

  const handleResendOTP = async () => {
    if (!email) {
      setMessage('Email address is required')
      return
    }

    try {
      setMessage('')
      await authAPI.resendVerification({ email })
      setMessage('New verification code sent to your email!')
      setResendCooldown(60) // 60 seconds cooldown
      setOtp('') // Clear current OTP
    } catch (error) {
      setMessage('Failed to resend verification code')
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div 
        className="max-w-md w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="shadow-2xl">
          <div className="text-center">
            {status === 'success' ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3">Email Verified!</h2>
                <p className="text-gray-600 mb-6">{message}</p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-green-800">
                    Redirecting to your dashboard...
                  </p>
                </div>
              </motion.div>
            ) : (
              <>
                <motion.div
                  className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Mail className="w-10 h-10 text-blue-600" />
                </motion.div>

                <h2 className="text-3xl font-bold text-gray-900 mb-3">Verify Your Email</h2>
                <p className="text-gray-600 mb-8">
                  We've sent a 6-digit verification code to<br />
                  <span className="font-semibold text-gray-900">{email || 'your email'}</span>
                </p>

                {!email && (
                  <div className="mb-6">
                    <input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div className="mb-6">
                  <OTPInput
                    length={6}
                    value={otp}
                    onChange={setOtp}
                    error={status === 'error' ? message : ''}
                  />
                </div>

                {message && status !== 'error' && (
                  <motion.div
                    className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <p className="text-sm text-blue-800">{message}</p>
                  </motion.div>
                )}

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={verifyEmail}
                    disabled={otp.length !== 6 || status === 'verifying'}
                    className="w-full mb-4 py-3 text-lg"
                  >
                    {status === 'verifying' ? 'Verifying...' : 'Verify Email'}
                  </Button>
                </motion.div>

                <div className="space-y-3">
                  <button
                    onClick={handleResendOTP}
                    disabled={resendCooldown > 0}
                    className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    {resendCooldown > 0
                      ? `Resend code in ${resendCooldown}s`
                      : "Didn't receive the code? Resend"}
                  </button>

                  <div className="pt-4 border-t border-gray-200">
                    <Link to="/register" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Registration
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>

        <motion.div
          className="mt-6 text-center text-sm text-gray-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <p>💡 Tip: Check your spam folder if you don't see the email</p>
        </motion.div>
      </motion.div>
    </div>
  )
}
