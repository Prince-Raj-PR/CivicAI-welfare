import { useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { Mail, RefreshCw, CheckCircle } from 'lucide-react'
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

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card>
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h2>
            
            <p className="text-gray-600 mb-4">
              We've sent a verification link to:
            </p>
            
            {email && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                <p className="text-sm font-medium text-blue-800">{email}</p>
              </div>
            )}
            
            <div className="text-left bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Next Steps:</h3>
              <ol className="text-sm text-gray-600 space-y-1">
                <li>1. Check your email inbox</li>
                <li>2. Look for an email from CivicAI</li>
                <li>3. Click the verification link</li>
                <li>4. You'll be automatically logged in</li>
              </ol>
            </div>

            <div className="text-sm text-gray-500 mb-6">
              <p>Didn't receive the email? Check your spam folder or click below to resend.</p>
            </div>

            {resendMessage && (
              <div className={`mb-4 p-3 rounded-lg ${
                resendSuccess 
                  ? 'bg-green-50 border border-green-200 text-green-800' 
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                <div className="flex items-center">
                  {resendSuccess && <CheckCircle className="w-4 h-4 mr-2" />}
                  <p className="text-sm">{resendMessage}</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Button 
                onClick={handleResendVerification}
                disabled={isResending || !email}
                className="w-full"
                variant="outline"
              >
                {isResending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Resend Verification Email
                  </>
                )}
              </Button>

              <div className="flex space-x-3">
                <Link to="/login" className="flex-1">
                  <Button variant="secondary" className="w-full">
                    Back to Login
                  </Button>
                </Link>
                
                <Link to="/register" className="flex-1">
                  <Button variant="ghost" className="w-full">
                    Register Again
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}