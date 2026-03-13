import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { CheckCircle, XCircle, Loader, Mail } from 'lucide-react'
import { Button, Card } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { authAPI, setAuthToken } from '../lib/api'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { updateUser, checkAuthStatus } = useAuth()
  const [status, setStatus] = useState('verifying') // verifying, success, error
  const [message, setMessage] = useState('')
  const [user, setUser] = useState(null)

  useEffect(() => {
    const token = searchParams.get('token')
    
    if (!token) {
      setStatus('error')
      setMessage('Invalid verification link. No token provided.')
      return
    }

    verifyEmail(token)
  }, [searchParams])

  const verifyEmail = async (token) => {
    try {
      setStatus('verifying')
      const response = await authAPI.verifyEmail({ token })
      
      if (response.success) {
        setStatus('success')
        setMessage(response.message)
        setUser(response.data.user)
        
        // Save auth token and update auth context
        if (response.data.token) {
          setAuthToken(response.data.token)
          updateUser(response.data.user)
          await checkAuthStatus()
          
          setTimeout(() => {
            navigate('/dashboard')
          }, 3000)
        }
      }
    } catch (error) {
      setStatus('error')
      setMessage(error.message || 'Email verification failed')
    }
  }

  const handleResendVerification = async () => {
    if (!user?.email) {
      setMessage('Unable to resend verification email')
      return
    }

    try {
      await authAPI.resendVerification({ email: user.email })
      setMessage('Verification email sent! Please check your inbox.')
    } catch (error) {
      setMessage('Failed to resend verification email')
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card>
          <div className="text-center">
            {status === 'verifying' && (
              <>
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Loader className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying Email</h2>
                <p className="text-gray-600">Please wait while we verify your email address...</p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h2>
                <p className="text-gray-600 mb-4">{message}</p>
                {user && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-green-800">
                      Welcome, {user.firstName}! You're being redirected to explore programs...
                    </p>
                  </div>
                )}
                <Button 
                  onClick={() => navigate('/dashboard')}
                  className="w-full"
                >
                  Continue to Dashboard
                </Button>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h2>
                <p className="text-red-600 mb-6">{message}</p>
                
                <div className="space-y-3">
                  <Button 
                    onClick={handleResendVerification}
                    variant="outline"
                    className="w-full"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Resend Verification Email
                  </Button>
                  
                  <Link to="/register" className="block">
                    <Button variant="secondary" className="w-full">
                      Back to Registration
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}