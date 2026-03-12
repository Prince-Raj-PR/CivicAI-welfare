import { Mail, Phone, MapPin, Clock } from 'lucide-react'

export default function ContactPage() {
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
        <div className="card">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Send us a Message</h2>
          
          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input type="text" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input type="text" className="input" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input type="email" className="input" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <select className="input">
                <option>General Inquiry</option>
                <option>Technical Support</option>
                <option>Program Question</option>
                <option>Account Issue</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <textarea 
                rows={4} 
                className="input resize-none"
                placeholder="How can we help you?"
              ></textarea>
            </div>

            <button type="submit" className="btn btn-primary w-full">
              Send Message
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}