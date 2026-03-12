import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Discover Welfare Programs
              <br />
              <span className="text-primary-200">You Qualify For</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-primary-100 max-w-3xl mx-auto">
              AI-powered platform that simplifies access to government assistance programs.
              Get personalized recommendations in minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="btn bg-white text-primary-600 hover:bg-gray-100 px-8 py-3 text-lg">
                Get Started Free
                <ArrowRight className="inline ml-2 w-5 h-5" />
              </Link>
              <Link to="/programs" className="btn border-2 border-white text-white hover:bg-white/10 px-8 py-3 text-lg">
                Browse Programs
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose CivicAI?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our AI-powered platform makes it easy to find and apply for welfare programs
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              'Find programs in minutes, not hours',
              'Get personalized eligibility assessments',
              'Track all applications in one place',
              'Receive real-time status updates',
              'Access expert AI guidance 24/7',
              'Free to use, always',
            ].map((benefit, index) => (
              <div key={index} className="flex items-start">
                <CheckCircle className="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-lg text-gray-700">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}