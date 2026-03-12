import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlus } from 'lucide-react'
import { Button, Card } from '../components/ui'
import FormInput from '../components/ui/FormInput'
import { registerSchema } from '../lib/validations'

export default function RegisterPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      console.log('Register data:', data)
      // TODO: Implement actual registration logic
    } catch (error) {
      console.error('Registration failed:', error)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card>
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
            <p className="text-gray-600 mt-2">Start discovering programs you qualify for</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                {...register('firstName')}
                type="text"
                label="First Name"
                placeholder="John"
                error={errors.firstName}
                required
              />
              <FormInput
                {...register('lastName')}
                type="text"
                label="Last Name"
                placeholder="Doe"
                error={errors.lastName}
                required
              />
            </div>

            <FormInput
              {...register('email')}
              type="email"
              label="Email Address"
              placeholder="you@example.com"
              error={errors.email}
              required
            />

            <FormInput
              {...register('phone')}
              type="tel"
              label="Phone Number"
              placeholder="(555) 123-4567"
              error={errors.phone}
              helperText="Optional"
            />

            <FormInput
              {...register('password')}
              type="password"
              label="Password"
              placeholder="••••••••"
              error={errors.password}
              required
            />

            <FormInput
              {...register('confirmPassword')}
              type="password"
              label="Confirm Password"
              placeholder="••••••••"
              error={errors.confirmPassword}
              required
            />

            <div className="flex items-start">
              <input
                {...register('agreeToTerms')}
                id="agreeToTerms"
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mt-1"
              />
              <label htmlFor="agreeToTerms" className="ml-2 block text-sm text-gray-700">
                I agree to the{' '}
                <a href="#" className="text-primary-600 hover:text-primary-700">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-primary-600 hover:text-primary-700">
                  Privacy Policy
                </a>
              </label>
            </div>
            {errors.agreeToTerms && (
              <p className="text-sm text-red-600">{errors.agreeToTerms.message}</p>
            )}

            <Button 
              type="submit" 
              className="w-full"
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}