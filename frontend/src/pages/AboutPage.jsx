import { motion } from 'framer-motion'
import { Heart, Target, Users, Award, Lightbulb, Shield } from 'lucide-react'

export default function AboutPage() {
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

  const values = [
    {
      icon: Heart,
      title: 'Compassion',
      description: 'We believe everyone deserves access to the support they need, regardless of their background or circumstances.'
    },
    {
      icon: Target,
      title: 'Precision',
      description: 'Our AI technology ensures accurate matching between individuals and the programs that best serve their needs.'
    },
    {
      icon: Users,
      title: 'Community',
      description: 'We build bridges between people and resources, creating stronger, more connected communities.'
    },
    {
      icon: Shield,
      title: 'Trust',
      description: 'Your privacy and security are paramount. We protect your information with the highest standards.'
    }
  ]

  const stats = [
    { number: '50K+', label: 'Users Helped' },
    { number: '500+', label: 'Programs Available' },
    { number: '95%', label: 'Success Rate' },
    { number: '24/7', label: 'Support Available' }
  ]

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 text-white py-20 overflow-hidden relative">
        {/* Animated background elements */}
        <motion.div
          className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl"
          animate={{
            y: [-20, 20, -20],
            x: [-10, 10, -10],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-10 right-10 w-24 h-24 bg-purple-300/20 rounded-full blur-xl"
          animate={{
            y: [20, -20, 20],
            x: [10, -10, 10],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
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
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                Our Story
              </motion.div>
            </motion.div>

            <motion.h1 
              className="text-4xl md:text-5xl font-bold mb-6"
              variants={itemVariants}
            >
              About CivicAI
            </motion.h1>
            
            <motion.p 
              className="text-xl md:text-2xl text-purple-100 mb-8"
              variants={itemVariants}
            >
              Democratizing access to government assistance programs through AI
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Our Mission</h2>
            <div className="prose prose-lg mx-auto text-gray-600">
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, duration: 0.8 }}
              >
                CivicAI is an AI-powered platform designed to simplify and democratize access to 
                government assistance programs. Our mission is to help eligible citizens discover 
                and apply for welfare programs they qualify for.
              </motion.p>

              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4, duration: 0.8 }}
              >
                We believe that everyone deserves access to the support they need. By leveraging 
                artificial intelligence, we're breaking down barriers and making it easier for 
                people to find the help they're entitled to.
              </motion.p>

              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6, duration: 0.8 }}
              >
                Our platform uses advanced AI algorithms to match your personal circumstances 
                with available programs, providing personalized recommendations and guidance 
                throughout the application process.
              </motion.p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Our Values</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {values.map((value, index) => (
              <motion.div
                key={index}
                className="text-center p-6 rounded-xl bg-white shadow-lg hover:shadow-xl transition-all duration-300"
                variants={itemVariants}
                whileHover={{ 
                  y: -10,
                  scale: 1.02,
                  transition: { type: "spring", stiffness: 300 }
                }}
              >
                <motion.div
                  className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <value.icon className="w-8 h-8 text-white" />
                </motion.div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{value.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{value.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Impact</h2>
            <p className="text-xl text-purple-100">
              Making a difference in communities across the nation
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                className="text-center"
                variants={itemVariants}
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <motion.div
                  className="text-4xl md:text-5xl font-bold mb-2"
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ 
                    delay: index * 0.1,
                    type: "spring",
                    stiffness: 200
                  }}
                >
                  {stat.number}
                </motion.div>
                <div className="text-purple-100 font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">How It Works</h2>
            <div className="prose prose-lg mx-auto text-gray-600">
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, duration: 0.8 }}
              >
                Our platform uses advanced AI algorithms to match your personal circumstances 
                with available programs, providing personalized recommendations and guidance 
                throughout the application process.
              </motion.p>
            </div>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-3 gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {[
              {
                step: '01',
                title: 'Share Your Information',
                description: 'Provide basic details about your situation and needs in a secure, private environment.'
              },
              {
                step: '02',
                title: 'AI Analysis',
                description: 'Our AI analyzes thousands of programs to find the ones that match your specific circumstances.'
              },
              {
                step: '03',
                title: 'Get Matched',
                description: 'Receive personalized recommendations with step-by-step guidance for applications.'
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                className="text-center"
                variants={itemVariants}
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <motion.div
                  className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl"
                  whileHover={{ scale: 1.1, rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  {item.step}
                </motion.div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  )
}