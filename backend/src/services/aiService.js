import Groq from 'groq-sdk'

// Lazy initialization of Groq client
let groq = null

const getGroqClient = () => {
  if (!groq && process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your-groq-api-key-here') {
    groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    })
  }
  return groq
}

const MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant'

/**
 * AI-Enhanced Eligibility Analysis
 * Uses Groq AI to provide intelligent eligibility recommendations
 */
export const analyzeEligibilityWithAI = async (userProfile, program, basicResult) => {
  const client = getGroqClient()
  
  if (!client) {
    console.log('Groq AI not configured, skipping AI enhancement')
    return basicResult
  }
  
  try {
    const prompt = `You are an expert welfare program advisor. Analyze this eligibility check and provide helpful insights.

User Profile:
- Annual Income: $${userProfile.annualIncome}
- Household Size: ${userProfile.householdSize}
- Employment Status: ${userProfile.employmentStatus}
- Age: ${userProfile.age}

Program: ${program.name}
Type: ${program.type}
Agency: ${program.agency}

Eligibility Criteria:
${JSON.stringify(program.eligibilityCriteria, null, 2)}

Basic Eligibility Result:
- Eligible: ${basicResult.isEligible ? 'Yes' : 'No'}
- Score: ${basicResult.score}%
- Matched: ${basicResult.matchedCriteria.join(', ')}
- Unmatched: ${basicResult.unmatchedCriteria.join(', ')}

Please provide:
1. A clear explanation of why they are/aren't eligible (2-3 sentences)
2. Specific actionable advice (if not eligible, what can they do?)
3. Any tips for the application process (if eligible)
4. Suggest 2-3 similar programs they might qualify for

Format your response as JSON:
{
  "explanation": "...",
  "advice": "...",
  "applicationTips": "...",
  "similarPrograms": ["program1", "program2"]
}`

    const completion = await client.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a helpful welfare program advisor. Provide clear, empathetic, and actionable advice. Always respond in valid JSON format.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: MODEL,
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    })

    const aiResponse = JSON.parse(completion.choices[0].message.content)
    
    return {
      ...basicResult,
      aiInsights: {
        explanation: aiResponse.explanation,
        advice: aiResponse.advice,
        applicationTips: aiResponse.applicationTips,
        similarPrograms: aiResponse.similarPrograms,
        confidence: completion.choices[0].finish_reason === 'stop' ? 'high' : 'medium'
      }
    }
  } catch (error) {
    console.error('AI analysis error:', error)
    // Return basic result if AI fails
    return {
      ...basicResult,
      aiInsights: {
        explanation: 'AI analysis unavailable at this time.',
        advice: 'Please review the eligibility criteria carefully.',
        applicationTips: 'Contact the program agency for more information.',
        similarPrograms: [],
        confidence: 'low'
      }
    }
  }
}

/**
 * AI-Powered Program Recommendations
 * Suggests programs based on user profile
 */
export const getAIRecommendations = async (userProfile, allPrograms) => {
  const client = getGroqClient()
  
  if (!client) {
    return { recommendations: [] }
  }
  
  try {
    const programsList = allPrograms.map(p => ({
      name: p.name,
      type: p.type,
      maxIncome: p.eligibilityCriteria?.maxIncome,
      minAge: p.eligibilityCriteria?.minAge,
      maxAge: p.eligibilityCriteria?.maxAge
    }))

    const prompt = `Based on this user profile, recommend the top 3 most suitable welfare programs:

User Profile:
- Annual Income: $${userProfile.annualIncome}
- Household Size: ${userProfile.householdSize}
- Employment Status: ${userProfile.employmentStatus}
- Age: ${userProfile.age}

Available Programs:
${JSON.stringify(programsList, null, 2)}

Provide recommendations with reasoning. Format as JSON:
{
  "recommendations": [
    {
      "programName": "...",
      "matchScore": 85,
      "reason": "..."
    }
  ]
}`

    const completion = await client.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a welfare program recommendation expert. Analyze user profiles and suggest the most suitable programs.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: MODEL,
      temperature: 0.5,
      max_tokens: 800,
      response_format: { type: 'json_object' }
    })

    return JSON.parse(completion.choices[0].message.content)
  } catch (error) {
    console.error('AI recommendations error:', error)
    return { recommendations: [] }
  }
}

/**
 * AI Chat Assistant
 * Answer questions about programs and eligibility
 */
export const chatWithAI = async (userMessage, context = {}) => {
  const client = getGroqClient()
  
  if (!client) {
    return {
      response: 'AI assistant is not configured. Please contact support.',
      error: true
    }
  }
  
  try {
    const systemPrompt = `You are CivicAI Assistant, a helpful AI that helps people understand welfare programs and eligibility requirements. 
    
You have access to information about these programs: SNAP, Medicaid, Section 8, TANF, WIC, LIHEAP, SSI, and CCDF.

Provide clear, accurate, and empathetic responses. If you don't know something, say so and suggest contacting the program agency.

${context.userProfile ? `User Profile: Income: $${context.userProfile.annualIncome}, Household: ${context.userProfile.householdSize}, Age: ${context.userProfile.age}` : ''}`

    const completion = await client.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userMessage
        }
      ],
      model: MODEL,
      temperature: 0.7,
      max_tokens: 500
    })

    return {
      response: completion.choices[0].message.content,
      model: MODEL
    }
  } catch (error) {
    console.error('AI chat error:', error)
    return {
      response: 'I apologize, but I\'m having trouble processing your request right now. Please try again or contact support.',
      error: true
    }
  }
}

/**
 * Simplify Program Description
 * Make complex program descriptions easier to understand
 */
export const simplifyDescription = async (programDescription) => {
  const client = getGroqClient()
  
  if (!client) {
    return programDescription
  }
  
  try {
    const prompt = `Simplify this welfare program description for easy understanding. Keep it under 100 words and use simple language:

"${programDescription}"

Provide a clear, simple explanation that anyone can understand.`

    const completion = await client.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an expert at explaining complex government programs in simple terms.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: MODEL,
      temperature: 0.5,
      max_tokens: 200
    })

    return completion.choices[0].message.content
  } catch (error) {
    console.error('Simplify description error:', error)
    return programDescription
  }
}

/**
 * Generate Application Tips
 * Provide personalized tips for applying to a program
 */
export const generateApplicationTips = async (program, userProfile) => {
  const client = getGroqClient()
  
  if (!client) {
    return [
      'Gather all required documents before starting',
      'Double-check all information for accuracy',
      'Keep copies of everything you submit',
      'Follow up on your application status',
      'Contact the agency if you have questions'
    ]
  }
  
  try {
    const prompt = `Generate 5 specific, actionable tips for applying to this welfare program:

Program: ${program.name}
Type: ${program.type}
Required Documents: ${program.eligibilityCriteria?.requiredDocuments?.join(', ') || 'Not specified'}

User Profile:
- Income: $${userProfile.annualIncome}
- Household Size: ${userProfile.householdSize}
- Employment: ${userProfile.employmentStatus}

Provide practical tips that will help them succeed. Format as JSON array:
{
  "tips": ["tip1", "tip2", "tip3", "tip4", "tip5"]
}`

    const completion = await client.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an expert at helping people successfully apply for welfare programs.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: MODEL,
      temperature: 0.6,
      max_tokens: 400,
      response_format: { type: 'json_object' }
    })

    const result = JSON.parse(completion.choices[0].message.content)
    return result.tips || []
  } catch (error) {
    console.error('Generate tips error:', error)
    return [
      'Gather all required documents before starting',
      'Double-check all information for accuracy',
      'Keep copies of everything you submit',
      'Follow up on your application status',
      'Contact the agency if you have questions'
    ]
  }
}

export default {
  analyzeEligibilityWithAI,
  getAIRecommendations,
  chatWithAI,
  simplifyDescription,
  generateApplicationTips
}
