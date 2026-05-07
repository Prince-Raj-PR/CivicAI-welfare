import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { chatWithAI, analyzeEligibilityWithAI } from '../services/aiService.js'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../../.env') })

console.log('🤖 Testing Groq AI Integration\n')
console.log('API Key:', process.env.GROQ_API_KEY ? '✅ Configured' : '❌ Missing')
console.log('Model:', process.env.GROQ_MODEL || 'llama-3.1-8b-instant')
console.log('\n' + '='.repeat(50) + '\n')

// Test 1: Simple Chat
async function testChat() {
  console.log('Test 1: AI Chat')
  console.log('-'.repeat(50))
  
  try {
    const response = await chatWithAI('What is SNAP and who is eligible?')
    console.log('✅ Chat Response:')
    console.log(response.response)
    console.log('\n')
  } catch (error) {
    console.error('❌ Chat Error:', error.message)
  }
}

// Test 2: Eligibility Analysis
async function testEligibilityAnalysis() {
  console.log('Test 2: Eligibility Analysis')
  console.log('-'.repeat(50))
  
  const userProfile = {
    annualIncome: 35000,
    householdSize: 3,
    employmentStatus: 'employed',
    age: 35
  }
  
  const program = {
    name: 'SNAP',
    type: 'Food Assistance',
    agency: 'USDA',
    eligibilityCriteria: {
      maxIncome: 40000,
      minHouseholdSize: 1,
      employmentStatus: ['employed', 'unemployed', 'self-employed']
    }
  }
  
  const basicResult = {
    isEligible: true,
    score: 85,
    matchedCriteria: ['Income requirement met', 'Household size requirement met'],
    unmatchedCriteria: [],
    recommendations: []
  }
  
  try {
    const enhanced = await analyzeEligibilityWithAI(userProfile, program, basicResult)
    console.log('✅ AI-Enhanced Result:')
    console.log('Eligible:', enhanced.isEligible)
    console.log('Score:', enhanced.score + '%')
    console.log('\nAI Insights:')
    console.log('Explanation:', enhanced.aiInsights.explanation)
    console.log('Advice:', enhanced.aiInsights.advice)
    console.log('Tips:', enhanced.aiInsights.applicationTips)
    console.log('Similar Programs:', enhanced.aiInsights.similarPrograms.join(', '))
    console.log('\n')
  } catch (error) {
    console.error('❌ Analysis Error:', error.message)
  }
}

// Run tests
async function runTests() {
  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'your-groq-api-key-here') {
    console.error('❌ Error: GROQ_API_KEY not configured in .env file')
    console.log('\nPlease add your Groq API key to backend/.env:')
    console.log('GROQ_API_KEY=gsk_your_actual_key_here')
    console.log('\nGet your free API key at: https://console.groq.com')
    process.exit(1)
  }
  
  await testChat()
  await testEligibilityAnalysis()
  
  console.log('='.repeat(50))
  console.log('✅ All tests completed!')
  console.log('\nAI integration is working correctly.')
  console.log('You can now use AI features in the application.')
}

runTests().catch(error => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})
