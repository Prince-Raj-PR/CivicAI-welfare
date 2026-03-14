import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle, Sparkles, Users, Shield, Zap } from 'lucide-react'
import { motion } from 'framer-motion'

export default function HomePage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  }

  const floatingVariants = {
    animate: {
      y: [-10, 10, -10],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  }

  const benefits = [
    'Find programs in minutes, not hours',
    'Get personalized eligibility assessments',
    'Track all applications in one place',
    'Receive real-time status updates',
    'Access expert AI guidance 24/7',
    'Free to use, always',
  ]

  const features = [
    {
      icon: Sparkles,
      title: 'AI-Powered Matching',
      description: 'Our advanced AI analyzes your profile to find the best programs for you'
    },
    {
      icon: Users,
      title: 'Trusted by Thousands',
      description: 'Join thousands of users who have successfully found assistance programs'
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your personal information is protected with enterprise-grade security'
    }
  ]

  return (
    <div className="bg-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 text-white overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <motion.div
            className="absolute top-20 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl"
            variants={floatingVariants}
            animate="animate"
          />
          <motion.div
            className="absolute top-40 right-20 w-24 h-24 bg-purple-300/20 rounded-full blur-xl"
            variants={floatingVariants}
            animate="animate"
            transition={{ delay: 1 }}
          />
          <motion.div
            className="absolute bottom-20 left-1/3 w-40 h-40 bg-blue-300/10 rounded-full blur-xl"
            variants={floatingVariants}
            animate="animate"
            transition={{ delay: 2 }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <motion.div 
            className="text-center"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div
              variants={itemVariants}
              className="mb-6"
            >
              <motion.div
                className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium mb-6"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                AI-Powered Welfare Assistant
              </motion.div>
            </motion.div>

            <motion.h1 
              className="text-4xl md:text-6xl font-bold mb-6"
              variants={itemVariants}
            >
              Discover Welfare Programs
              <br />
              <motion.span 
                className="text-blue-200"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
              >
                You Qualify For
              </motion.span>
            </motion.h1>

            <motion.p 
              className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto"
              variants={itemVariants}
            >
              AI-powered platform that simplifies access to government assistance programs.
              Get personalized recommendations in minutes.
            </motion.p>

            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center"
              variants={itemVariants}
            >
              <Link to="/register">
                <motion.button
                  className="btn bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 text-lg font-semibold rounded-lg shadow-lg"
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: "0 10px 25px rgba(0,0,0,0.2)"
                  }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  Get Started Free
                  <motion.div
                    className="inline-block ml-2"
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ArrowRight className="w-5 h-5" />
                  </motion.div>
                </motion.button>
              </Link>
              
              <Link to="/programs">
                <motion.button
                  className="btn border-2 border-white text-white hover:bg-white/10 px-8 py-3 text-lg font-semibold rounded-lg backdrop-blur-sm"
                  whileHover={{ 
                    scale: 1.05,
                    backgroundColor: "rgba(255,255,255,0.1)"
                  }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  Browse Programs
                </motion.button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose CivicAI?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our AI-powered platform makes it easy to find and apply for welfare programs
            </p>
          </motion.div>

          <motion.div 
            className="grid md:grid-cols-3 gap-8 mb-16"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="text-center p-6 rounded-xl bg-white shadow-lg hover:shadow-xl transition-shadow"
                variants={itemVariants}
                whileHover={{ 
                  y: -10,
                  transition: { type: "spring", stiffness: 300 }
                }}
              >
                <motion.div
                  className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <feature.icon className="w-8 h-8 text-white" />
                </motion.div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div 
            className="grid md:grid-cols-2 gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {benefits.map((benefit, index) => (
              <motion.div 
                key={index} 
                className="flex items-start group"
                variants={itemVariants}
                whileHover={{ x: 10 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <motion.div
                  whileHover={{ scale: 1.2, rotate: 360 }}
                  transition={{ duration: 0.3 }}
                >
                  <CheckCircle className="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                </motion.div>
                <span className="text-lg text-gray-700 group-hover:text-gray-900 transition-colors">
                  {benefit}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              className="mb-6"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Zap className="w-16 h-16 mx-auto text-yellow-300" />
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl mb-8 text-blue-100">
              Join thousands of people who have found the assistance they need
            </p>
            <Link to="/register">
              <motion.button
                className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg shadow-lg"
                whileHover={{ 
                  scale: 1.05,
                  boxShadow: "0 15px 30px rgba(0,0,0,0.2)"
                }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                Start Your Journey Today
                <ArrowRight className="inline ml-2 w-5 h-5" />
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}