/**
 * CivicAI – AI Service
 * Uses Groq (free tier) with llama-3.3-70b-versatile
 * All prompts are India-specific (Indian welfare schemes, ₹ currency, etc.)
 */

import Groq from 'groq-sdk'

// Lazy init — only creates client when key is present
let groq = null
const getGroq = () => {
  if (!groq && process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your-groq-api-key-here') {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  }
  return groq
}

// Best free model on Groq as of 2026
const MODEL = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b'

// ─────────────────────────────────────────────────────────────────────────────
// Eligibility Analysis
// ─────────────────────────────────────────────────────────────────────────────
export const analyzeEligibilityWithAI = async (userProfile, program, basicResult) => {
  const client = getGroq()
  if (!client) return basicResult

  try {
    const prompt = `You are an expert advisor on Indian government welfare schemes. Analyze this eligibility check and provide clear, helpful guidance in simple English.

User Profile:
- Annual Income: ₹${(userProfile.annualIncome || 0).toLocaleString('en-IN')}
- Age: ${userProfile.age || 'Not provided'}
- Employment: ${userProfile.employmentStatus || 'Not provided'}
- Category: ${userProfile.category || 'Not provided'}
- Household Size: ${userProfile.householdSize || 'Not provided'}

Scheme: ${program.name}
Type: ${program.type}
Nodal Agency: ${program.agency}
State: ${program.state || 'All India'}
Benefits: ${program.benefits?.description || 'As per scheme guidelines'}

Eligibility Criteria:
${JSON.stringify(program.eligibilityCriteria, null, 2)}

Eligibility Result:
- Eligible: ${basicResult.isEligible ? 'YES' : 'NO'}
- Score: ${basicResult.score}%
- Matched criteria: ${basicResult.matchedCriteria.join('; ') || 'None'}
- Unmatched criteria: ${basicResult.unmatchedCriteria.join('; ') || 'None'}

Respond ONLY with valid JSON (no markdown, no extra text):
{
  "explanation": "2-3 sentence explanation of why eligible/not eligible, mention specific criteria",
  "advice": "Practical next step — what they should do now",
  "applicationTips": "Specific tip for applying to this Indian government scheme (documents, portal, office to visit)",
  "similarPrograms": ["Name of similar Indian scheme 1", "Name of similar Indian scheme 2"]
}`

    const completion = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.4,
      max_tokens: 600,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are CivicAI, an expert on Indian government welfare schemes (PM-JAY, PM-KISAN, PMAY, MGNREGA, NSP, APY, etc.). Always respond with valid JSON only. Use Indian context — ₹ currency, Indian states, Aadhaar, CSC centres, etc.',
        },
        { role: 'user', content: prompt },
      ],
    })

    const ai = JSON.parse(completion.choices[0].message.content)
    return {
      ...basicResult,
      aiInsights: {
        explanation:     ai.explanation     || '',
        advice:          ai.advice          || '',
        applicationTips: ai.applicationTips || '',
        similarPrograms: ai.similarPrograms || [],
        confidence:      completion.choices[0].finish_reason === 'stop' ? 'high' : 'medium',
      },
    }
  } catch (err) {
    console.error('AI eligibility analysis error:', err.message)
    return {
      ...basicResult,
      aiInsights: {
        explanation:     'AI analysis is temporarily unavailable.',
        advice:          'Please review the eligibility criteria shown above.',
        applicationTips: 'Visit the official scheme portal or your nearest Common Service Centre (CSC) for assistance.',
        similarPrograms: [],
        confidence:      'low',
      },
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Program Recommendations
// ─────────────────────────────────────────────────────────────────────────────
export const getAIRecommendations = async (userProfile, allPrograms) => {
  const client = getGroq()
  if (!client) return { recommendations: [] }

  try {
    // Only send top 50 programs to stay within token limits
    const programsList = allPrograms.slice(0, 50).map(p => ({
      name:      p.name,
      type:      p.type,
      state:     p.state,
      maxIncome: p.eligibilityCriteria?.maxIncome,
      minAge:    p.eligibilityCriteria?.minAge,
      maxAge:    p.eligibilityCriteria?.maxAge,
      categories: p.eligibilityCriteria?.allowedCategories?.slice(0, 3),
    }))

    const prompt = `Based on this Indian citizen's profile, recommend the 3 most suitable government welfare schemes.

User Profile:
- Annual Income: ₹${(userProfile.annualIncome || 0).toLocaleString('en-IN')}
- Age: ${userProfile.age}
- Employment: ${userProfile.employmentStatus}
- Category: ${userProfile.category || 'General'}
- Household Size: ${userProfile.householdSize}
- State: ${userProfile.state || 'Not specified'}

Available Schemes (sample):
${JSON.stringify(programsList, null, 2)}

Respond ONLY with valid JSON:
{
  "recommendations": [
    { "programName": "exact name from list", "matchScore": 90, "reason": "one sentence why" },
    { "programName": "exact name from list", "matchScore": 80, "reason": "one sentence why" },
    { "programName": "exact name from list", "matchScore": 70, "reason": "one sentence why" }
  ]
}`

    const completion = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are an expert on Indian government welfare schemes. Respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
    })

    return JSON.parse(completion.choices[0].message.content)
  } catch (err) {
    console.error('AI recommendations error:', err.message)
    return { recommendations: [] }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat Assistant
// ─────────────────────────────────────────────────────────────────────────────
export const chatWithAI = async (userMessage, context = {}) => {
  const client = getGroq()
  if (!client) {
    return {
      response: 'AI assistant is not configured. Please contact support.',
      error: true,
    }
  }

  try {
    const systemPrompt = `You are CivicAI Assistant — a helpful, friendly AI that helps Indian citizens understand government welfare schemes and check their eligibility.

You have deep knowledge of Indian government schemes including:
PM-JAY (Ayushman Bharat), PM-KISAN, PMAY (Urban & Gramin), MGNREGA, PMGKAY, APY (Atal Pension Yojana), PMJJBY, PMSBY, PM SVANidhi, PMKVY, NSP Scholarships, PMJDY (Jan Dhan), Sukanya Samriddhi Yojana, and 3000+ state and central schemes.

Guidelines:
- Always respond in simple, clear English
- Use ₹ for Indian rupees
- Mention Aadhaar, CSC centres, official portals when relevant
- Be empathetic and helpful
- If unsure, direct to the official myscheme.gov.in portal or 14555 helpline
${context.userProfile ? `\nUser context: Income ₹${(context.userProfile.annualIncome || 0).toLocaleString('en-IN')}, Age ${context.userProfile.age}, ${context.userProfile.employmentStatus}` : ''}`

    const completion = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.6,
      max_tokens: 600,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage },
      ],
    })

    return {
      response: completion.choices[0].message.content,
      model: MODEL,
    }
  } catch (err) {
    console.error('AI chat error:', err.message)
    return {
      response: "I'm having trouble right now. Please try again or visit myscheme.gov.in for scheme information.",
      error: true,
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Simplify Description
// ─────────────────────────────────────────────────────────────────────────────
export const simplifyDescription = async (programDescription) => {
  const client = getGroq()
  if (!client) return programDescription

  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.4,
      max_tokens: 200,
      messages: [
        {
          role: 'system',
          content: 'Simplify Indian government scheme descriptions into plain English under 80 words. No jargon.',
        },
        {
          role: 'user',
          content: `Simplify this in simple English (max 80 words):\n"${programDescription}"`,
        },
      ],
    })
    return completion.choices[0].message.content
  } catch (err) {
    console.error('Simplify error:', err.message)
    return programDescription
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Application Tips
// ─────────────────────────────────────────────────────────────────────────────
export const generateApplicationTips = async (program, userProfile) => {
  const defaultTips = [
    'Keep your Aadhaar card and bank passbook ready',
    'Visit your nearest Common Service Centre (CSC) for free application assistance',
    'Double-check all details before submitting',
    'Take a printout or screenshot of the acknowledgement',
    'Follow up at the scheme portal or helpline after 15 days',
  ]

  const client = getGroq()
  if (!client) return defaultTips

  try {
    const prompt = `Give 5 practical tips for applying to this Indian government scheme.

Scheme: ${program.name}
Type: ${program.type}
Required Documents: ${program.eligibilityCriteria?.requiredDocuments?.join(', ') || 'Standard KYC documents'}
Apply at: ${program.applicationProcess?.url || 'Official portal'}

User: Income ₹${(userProfile.annualIncome || 0).toLocaleString('en-IN')}, Age ${userProfile.age}, ${userProfile.employmentStatus}

Respond ONLY with valid JSON: { "tips": ["tip1", "tip2", "tip3", "tip4", "tip5"] }`

    const completion = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.5,
      max_tokens: 400,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are an expert on Indian government scheme applications. Respond with JSON only.' },
        { role: 'user', content: prompt },
      ],
    })

    const result = JSON.parse(completion.choices[0].message.content)
    return result.tips?.length ? result.tips : defaultTips
  } catch (err) {
    console.error('Generate tips error:', err.message)
    return defaultTips
  }
}

export default {
  analyzeEligibilityWithAI,
  getAIRecommendations,
  chatWithAI,
  simplifyDescription,
  generateApplicationTips,
}
