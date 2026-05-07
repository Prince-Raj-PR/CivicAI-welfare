import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import mongoose from 'mongoose'
import Program from '../models/Program.js'
import { analyzeEligibilityWithAI } from '../services/aiService.js'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../../.env') })

const testEligibilityWithAI = async () => {
  try {
    console.log('🧪 Testing Eligibility Check with AI Enhancement\n')
    
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')
    
    // Get a program
    const program = await Program.findOne({ name: /SNAP/i })
    if (!program) {
      console.log('❌ No SNAP program found in database')
      process.exit(1)
    }
    
    console.log(`📋 Testing with program: ${program.name}\n`)
    
    // Test user profile
    const userProfile = {
      annualIncome: 35000,
      householdSize: 3,
      employmentStatus: 'employed',
      age: 35
    }
    
    console.log('👤 User Profile:')
    console.log(JSON.stringify(userProfile, null, 2))
    console.log()
    
    // Basic eligibility result
    const basicResult = {
      isEligible: true,
      score: 85,
      matchedCriteria: ['Income requirement met', 'Age requirement met'],
      unmatchedCriteria: [],
      recommendations: ['You appear to be eligible for this program']
    }
    
    console.log('🔍 Basic Eligibility Result:')
    console.log(JSON.stringify(basicResult, null, 2))
    console.log()
    
    // Call AI enhancement
    console.log('🤖 Calling AI Enhancement...\n')
    const enhancedResult = await analyzeEligibilityWithAI(userProfile, program, basicResult)
    
    console.log('✨ AI-Enhanced Result:')
    console.log(JSON.stringify(enhancedResult, null, 2))
    console.log()
    
    if (enhancedResult.aiInsights) {
      console.log('✅ AI Insights Generated Successfully!')
      console.log('\n📝 AI Insights:')
      console.log('━'.repeat(60))
      console.log(`\n💬 Explanation:\n${enhancedResult.aiInsights.explanation}`)
      console.log(`\n💡 Advice:\n${enhancedResult.aiInsights.advice}`)
      console.log(`\n📋 Application Tips:\n${enhancedResult.aiInsights.applicationTips}`)
      console.log(`\n🔍 Similar Programs:\n${enhancedResult.aiInsights.similarPrograms.join(', ')}`)
      console.log(`\n🎯 Confidence: ${enhancedResult.aiInsights.confidence}`)
      console.log('\n' + '━'.repeat(60))
    } else {
      console.log('⚠️  No AI insights in result')
    }
    
    await mongoose.connection.close()
    console.log('\n✅ Test completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    await mongoose.connection.close()
    process.exit(1)
  }
}

testEligibilityWithAI()
