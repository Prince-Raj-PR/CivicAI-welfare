import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, Phone, MapPin, Clock } from 'lucide-react'
import { Button, Card } from '../components/ui'
import FormInput from '../components/ui/FormInput'
import { contactSchema } from '../lib/validations'

export default function ContactPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(contactSchema),
  })

  const onSubmit = async (data) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      console.log('Contact data:', data)
      // TODO: Implement actual contact form submission
      reset() // Clear form after successful submission
      alert('Message sent successfully!')
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Contact Us</h1>
        <p className="text-xl text-gray-600">
          We're here to help you navigate welfare programs
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Contact Information */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Get in Touch</h2>
          
          <div className="space-y-6">
            <div className="flex items-start">
              <Mail className="w-6 h-6 text-primary-600 mr-4 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-900">Email</h3>
                <p className="text-gray-600">support@civicai.com</p>
                <p className="text-sm text-gray-500">We'll respond within 24 hours</p>
              </div>
            </div>

            <div className="flex items-start">
              <Phone className="w-6 h-6 text-primary-600 mr-4 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-900">Phone</h3>
                <p className="text-gray-600">1-800-CIVIC-AI (1-800-248-4224)</p>
                <p className="text-sm text-gray-500">Available 24/7</p>
              </div>
            </div>

            <div className="flex items-start">
              <MapPin className="w-6 h-6 text-primary-600 mr-4 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-900">Address</h3>
                <p className="text-gray-600">
                  123 Innovation Drive<br />
                  Tech City, TC 12345
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <Clock className="w-6 h-6 text-primary-600 mr-4 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-900">Support Hours</h3>
                <p className="text-gray-600">24/7 Online Support</p>
                <p className="text-gray-600">Phone: Monday - Friday, 9 AM - 6 PM EST</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <Card>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Send us a Message</h2>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              label="Email"
              placeholder="you@example.com"
              error={errors.email}
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject <span className="text-red-500">*</span>
              </label>
              <select 
                {...register('subject')}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors ${
                  errors.subject ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Select a subject</option>
                <option value="General Inquiry">General Inquiry</option>
                <option value="Technical Support">Technical Support</option>
                <option value="Program Question">Program Question</option>
                <option value="Account Issue">Account Issue</option>
              </select>
              {errors.subject && (
                <p className="mt-1 text-sm text-red-600">{errors.subject.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea 
                {...register('message')}
                rows={4} 
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors resize-none ${
                  errors.message ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="How can we help you?"
              />
              {errors.message && (
                <p className="mt-1 text-sm text-red-600">{errors.message.message}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full"
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}