import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LogIn, Mail } from 'lucide-react'
import { Button, Card } from '../components/ui'
import FormInput from '../components/ui/FormInput'
import { loginSchema } from '../lib/validations'
import { authAPI, setAuthToken } from '../lib/api'

export default function LoginPage() {
  const navigate = useNavigate()
  const [loginError, setLoginError] = useState('')
  const [showResendVerification, setShowResendVerification] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  
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
      
      const response = await authAPI.login(data)
      
      if (response.success) {
        setAuthToken(response.data.token)
        navigate('/programs')
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

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card>
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogIn className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
            <p className="text-gray-600 mt-2">Sign in to your CivicAI account</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {loginError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{loginError}</p>
                {showResendVerification && (
                  <Button
                    type="button"
                    onClick={handleResendVerification}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Resend Verification Email
                  </Button>
                )}
              </div>
            )}

            <FormInput
              {...register('email')}
              type="email"
              label="Email Address"
              placeholder="you@example.com"
              error={errors.email}
              required
            />

            <FormInput
              {...register('password')}
              type="password"
              label="Password"
              placeholder="••••••••"
              error={errors.password}
              required
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  {...register('remember')}
                  id="remember"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="remember" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>
              <a href="#" className="text-sm text-primary-600 hover:text-primary-700">
                Forgot password?
              </a>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
                Sign up for free
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}