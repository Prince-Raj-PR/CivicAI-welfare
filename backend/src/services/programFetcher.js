import axios from 'axios'
import Program from '../models/Program.js'

/**
 * Program Fetcher Service
 * Fetches welfare programs from various government APIs and data sources
 */

// Government API endpoints
const API_SOURCES = {
  // Benefits.gov API (if available)
  BENEFITS_GOV: 'https://www.benefits.gov/api/programs',
  
  // USA.gov Federal Programs
  USA_GOV: 'https://api.usa.gov/benefits',
  
  // Data.gov datasets
  DATA_GOV: 'https://catalog.data.gov/api/3/action/package_search',
  
  // HHS (Health and Human Services)
  HHS: 'https://www.hhs.gov/api/programs',
  
  // USDA Food and Nutrition Service
  USDA_FNS: 'https://www.fns.usda.gov/api/programs',
}

/**
 * Fetch programs from Benefits.gov
 */
export const fetchFromBenefitsGov = async () => {
  try {
    console.log('🔍 Fetching programs from Benefits.gov...')
    
    // Note: Benefits.gov doesn't have a public API, so we'll use their data portal
    // Alternative: Use their XML feed or scrape their public data
    const response = await axios.get('https://www.benefits.gov/api/benefit-programs', {
      timeout: 30000,
      headers: {
        'User-Agent': 'CivicAI-Welfare-Platform/1.0'
      }
    })

    const programs = response.data.programs || []
    console.log(`✅ Found ${programs.length} programs from Benefits.gov`)
    
    return programs.map(program => ({
      name: program.title || program.name,
      description: program.description || program.summary,
      type: mapProgramType(program.category),
      agency: program.agency || program.sponsor,
      location: program.coverage || 'Nationwide',
      eligibilityCriteria: parseEligibility(program.eligibility),
      benefits: {
        type: program.benefitType || 'service',
        description: program.benefitDescription
      },
      applicationProcess: {
        url: program.applicationUrl || program.website,
        steps: program.howToApply ? [program.howToApply] : [],
        contactInfo: {
          phone: program.phone,
          email: program.email,
          website: program.website
        }
      },
      status: 'active',
      tags: program.keywords || [],
      source: 'benefits.gov'
    }))
  } catch (error) {
    console.error('❌ Error fetching from Benefits.gov:', error.message)
    return []
  }
}

/**
 * Fetch programs from Data.gov
 */
export const fetchFromDataGov = async () => {
  try {
    console.log('🔍 Fetching programs from Data.gov...')
    
    const queries = [
      'welfare programs',
      'food assistance',
      'medicaid',
      'housing assistance',
      'snap benefits'
    ]

    let allPrograms = []

    for (const query of queries) {
      try {
        const response = await axios.get(API_SOURCES.DATA_GOV, {
          params: {
            q: query,
            rows: 20,
            fq: 'organization:("Department of Health and Human Services" OR "Department of Agriculture" OR "Department of Housing and Urban Development")'
          },
          timeout: 30000
        })

        const datasets = response.data.result?.results || []
        console.log(`✅ Found ${datasets.length} datasets for "${query}"`)
        
        // Process datasets
        for (const dataset of datasets) {
          if (dataset.resources && dataset.resources.length > 0) {
            // Fetch actual program data from dataset resources
            const programData = await fetchDatasetResource(dataset.resources[0].url)
            if (programData) {
              allPrograms.push(...programData)
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching "${query}":`, error.message)
      }
    }

    console.log(`✅ Total programs from Data.gov: ${allPrograms.length}`)
    return allPrograms
  } catch (error) {
    console.error('❌ Error fetching from Data.gov:', error.message)
    return []
  }
}

/**
 * Fetch dataset resource
 */
const fetchDatasetResource = async (url) => {
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'Accept': 'application/json'
      }
    })

    // Parse the data based on format
    if (Array.isArray(response.data)) {
      return response.data.map(item => normalizeProgram(item))
    } else if (response.data.programs) {
      return response.data.programs.map(item => normalizeProgram(item))
    }
    
    return []
  } catch (error) {
    console.error('Error fetching dataset resource:', error.message)
    return []
  }
}

/**
 * Fetch programs from mock government data (fallback)
 */
export const fetchMockGovernmentPrograms = async () => {
  console.log('📦 Using curated government program data...')
  
  return [
    {
      name: 'Supplemental Nutrition Assistance Program (SNAP)',
      description: 'SNAP provides nutrition benefits to supplement the food budget of needy families so they can purchase healthy food and move towards self-sufficiency.',
      type: 'Food Assistance',
      agency: 'U.S. Department of Agriculture - Food and Nutrition Service',
      location: 'Nationwide',
      eligibilityCriteria: {
        maxIncome: 35000,
        minHouseholdSize: 1,
        employmentStatus: ['employed', 'unemployed', 'self-employed'],
        requiredDocuments: ['Proof of income', 'Proof of residence', 'Social Security Number'],
      },
      benefits: {
        type: 'monetary',
        amount: 250,
        frequency: 'monthly',
        description: 'Monthly food assistance benefits loaded on an EBT card',
      },
      maxBenefit: 250,
      applicationProcess: {
        url: 'https://www.fns.usda.gov/snap/apply',
        steps: [
          'Complete online application',
          'Submit required documents',
          'Attend interview (if required)',
          'Receive decision within 30 days',
        ],
        estimatedTime: '30 days',
        contactInfo: {
          phone: '1-800-221-5689',
          email: 'snap@usda.gov',
          website: 'https://www.fns.usda.gov/snap',
        },
      },
      status: 'active',
      tags: ['food', 'nutrition', 'assistance', 'federal', 'ebt'],
      source: 'usda.gov'
    },
    {
      name: 'Medicaid',
      description: 'Medicaid provides health coverage to millions of Americans, including eligible low-income adults, children, pregnant women, elderly adults and people with disabilities.',
      type: 'Healthcare',
      agency: 'Centers for Medicare & Medicaid Services',
      location: 'Nationwide',
      eligibilityCriteria: {
        maxIncome: 40000,
        minHouseholdSize: 1,
        employmentStatus: ['employed', 'unemployed', 'self-employed', 'retired'],
        requiredDocuments: ['Proof of income', 'Proof of citizenship', 'Social Security Number'],
      },
      benefits: {
        type: 'service',
        description: 'Comprehensive health coverage including doctor visits, hospital stays, prescriptions, and preventive care',
      },
      maxBenefit: 0,
      applicationProcess: {
        url: 'https://www.healthcare.gov',
        steps: [
          'Create account on Healthcare.gov',
          'Complete application',
          'Submit required documents',
          'Receive eligibility determination',
        ],
        estimatedTime: '45 days',
        contactInfo: {
          phone: '1-800-318-2596',
          website: 'https://www.medicaid.gov',
        },
      },
      status: 'active',
      tags: ['healthcare', 'medical', 'insurance', 'federal'],
      source: 'cms.gov'
    },
    {
      name: 'Section 8 Housing Choice Voucher Program',
      description: 'The Housing Choice Voucher Program provides rental assistance to very low-income families, the elderly, and the disabled to afford decent, safe, and sanitary housing.',
      type: 'Housing',
      agency: 'U.S. Department of Housing and Urban Development',
      location: 'Nationwide',
      eligibilityCriteria: {
        maxIncome: 30000,
        minHouseholdSize: 1,
        employmentStatus: ['employed', 'unemployed', 'retired', 'student'],
        requiredDocuments: ['Proof of income', 'Proof of citizenship', 'Rental history'],
      },
      benefits: {
        type: 'voucher',
        description: 'Rental assistance vouchers that cover a portion of monthly rent',
      },
      maxBenefit: 1200,
      applicationProcess: {
        url: 'https://www.hud.gov/program_offices/public_indian_housing/programs/hcv',
        steps: [
          'Contact local Public Housing Agency',
          'Submit application',
          'Join waiting list',
          'Attend briefing when selected',
          'Find eligible housing',
        ],
        estimatedTime: 'Varies (often 6-12 months)',
        contactInfo: {
          phone: '1-800-955-2232',
          website: 'https://www.hud.gov',
        },
      },
      status: 'active',
      tags: ['housing', 'rental', 'assistance', 'federal', 'voucher'],
      source: 'hud.gov'
    },
    {
      name: 'Temporary Assistance for Needy Families (TANF)',
      description: 'TANF provides temporary financial assistance while helping recipients find employment and become self-sufficient.',
      type: 'Financial Aid',
      agency: 'U.S. Department of Health and Human Services',
      location: 'Nationwide',
      eligibilityCriteria: {
        maxIncome: 25000,
        minHouseholdSize: 1,
        employmentStatus: ['unemployed', 'employed'],
        requiredDocuments: ['Proof of income', 'Proof of residence', 'Birth certificates'],
        additionalRequirements: ['Must have dependent children', 'Must participate in work activities'],
      },
      benefits: {
        type: 'monetary',
        amount: 500,
        frequency: 'monthly',
        description: 'Monthly cash assistance for basic needs',
      },
      maxBenefit: 500,
      applicationProcess: {
        url: 'https://www.acf.hhs.gov/ofa/programs/tanf',
        steps: [
          'Contact local TANF office',
          'Complete application',
          'Submit required documents',
          'Attend orientation',
          'Develop employment plan',
        ],
        estimatedTime: '30-45 days',
        contactInfo: {
          phone: '1-800-221-5689',
          website: 'https://www.acf.hhs.gov/ofa',
        },
      },
      status: 'active',
      tags: ['financial', 'cash', 'assistance', 'families', 'federal', 'tanf'],
      source: 'hhs.gov'
    },
    {
      name: 'Women, Infants, and Children (WIC)',
      description: 'WIC provides federal grants to states for supplemental foods, health care referrals, and nutrition education for low-income pregnant, breastfeeding, and non-breastfeeding postpartum women, and to infants and children up to age five.',
      type: 'Food Assistance',
      agency: 'U.S. Department of Agriculture',
      location: 'Nationwide',
      eligibilityCriteria: {
        maxIncome: 45000,
        minHouseholdSize: 1,
        employmentStatus: ['employed', 'unemployed', 'self-employed'],
        requiredDocuments: ['Proof of income', 'Proof of residence', 'Immunization records'],
        additionalRequirements: ['Must be pregnant, postpartum, or have children under 5'],
      },
      benefits: {
        type: 'voucher',
        description: 'Vouchers for nutritious foods, nutrition education, and healthcare referrals',
      },
      maxBenefit: 150,
      applicationProcess: {
        url: 'https://www.fns.usda.gov/wic',
        steps: [
          'Find local WIC clinic',
          'Schedule appointment',
          'Attend nutrition assessment',
          'Receive benefits if eligible',
        ],
        estimatedTime: '1-2 weeks',
        contactInfo: {
          phone: '1-800-522-5006',
          website: 'https://www.fns.usda.gov/wic',
        },
      },
      status: 'active',
      tags: ['food', 'nutrition', 'women', 'children', 'infants', 'federal', 'wic'],
      source: 'usda.gov'
    },
    {
      name: 'Low Income Home Energy Assistance Program (LIHEAP)',
      description: 'LIHEAP helps keep families safe and healthy through initiatives that assist families with energy costs.',
      type: 'Financial Aid',
      agency: 'U.S. Department of Health and Human Services',
      location: 'Nationwide',
      eligibilityCriteria: {
        maxIncome: 35000,
        minHouseholdSize: 1,
        employmentStatus: ['employed', 'unemployed', 'retired'],
        requiredDocuments: ['Proof of income', 'Utility bills', 'Proof of residence'],
      },
      benefits: {
        type: 'monetary',
        amount: 600,
        frequency: 'annually',
        description: 'Assistance with heating and cooling costs',
      },
      maxBenefit: 600,
      applicationProcess: {
        url: 'https://www.acf.hhs.gov/ocs/liheap',
        steps: [
          'Contact local LIHEAP office',
          'Complete application',
          'Submit utility bills and income proof',
          'Receive assistance',
        ],
        estimatedTime: '2-4 weeks',
        contactInfo: {
          phone: '1-866-674-6327',
          website: 'https://www.acf.hhs.gov/ocs/liheap',
        },
      },
      status: 'active',
      tags: ['energy', 'utilities', 'heating', 'cooling', 'federal', 'liheap'],
      source: 'hhs.gov'
    },
    {
      name: 'Supplemental Security Income (SSI)',
      description: 'SSI provides monthly payments to people with limited income and resources who are disabled, blind, or age 65 or older.',
      type: 'Financial Aid',
      agency: 'Social Security Administration',
      location: 'Nationwide',
      eligibilityCriteria: {
        maxIncome: 20000,
        minAge: 65,
        employmentStatus: ['retired', 'unemployed'],
        requiredDocuments: ['Social Security Number', 'Birth certificate', 'Medical records'],
        additionalRequirements: ['Must be 65+, blind, or disabled'],
      },
      benefits: {
        type: 'monetary',
        amount: 914,
        frequency: 'monthly',
        description: 'Monthly cash payments for basic needs',
      },
      maxBenefit: 914,
      applicationProcess: {
        url: 'https://www.ssa.gov/ssi',
        steps: [
          'Call Social Security or apply online',
          'Complete application',
          'Submit required documents',
          'Attend interview if needed',
          'Receive decision',
        ],
        estimatedTime: '3-5 months',
        contactInfo: {
          phone: '1-800-772-1213',
          website: 'https://www.ssa.gov/ssi',
        },
      },
      status: 'active',
      tags: ['disability', 'seniors', 'income', 'federal', 'ssi', 'social security'],
      source: 'ssa.gov'
    },
    {
      name: 'Child Care and Development Fund (CCDF)',
      description: 'CCDF provides funding to states to help low-income families access child care so they can work or attend training/education.',
      type: 'Childcare',
      agency: 'U.S. Department of Health and Human Services',
      location: 'Nationwide',
      eligibilityCriteria: {
        maxIncome: 40000,
        minHouseholdSize: 2,
        employmentStatus: ['employed', 'student'],
        requiredDocuments: ['Proof of income', 'Employment verification', 'Child information'],
        additionalRequirements: ['Must be working or in school/training'],
      },
      benefits: {
        type: 'service',
        description: 'Subsidized child care services',
      },
      maxBenefit: 800,
      applicationProcess: {
        url: 'https://www.acf.hhs.gov/occ/ccdf',
        steps: [
          'Contact local child care agency',
          'Complete application',
          'Submit employment/school verification',
          'Select approved child care provider',
        ],
        estimatedTime: '2-6 weeks',
        contactInfo: {
          phone: '1-800-424-2246',
          website: 'https://www.acf.hhs.gov/occ',
        },
      },
      status: 'active',
      tags: ['childcare', 'children', 'working families', 'federal', 'ccdf'],
      source: 'hhs.gov'
    }
  ]
}

/**
 * Normalize program data from various sources
 */
const normalizeProgram = (data) => {
  return {
    name: data.name || data.title || data.program_name,
    description: data.description || data.summary || '',
    type: mapProgramType(data.type || data.category),
    agency: data.agency || data.organization || 'Federal Government',
    location: data.location || data.coverage || 'Nationwide',
    eligibilityCriteria: parseEligibility(data.eligibility || data.requirements),
    benefits: {
      type: data.benefit_type || 'service',
      description: data.benefit_description || data.benefits
    },
    applicationProcess: {
      url: data.application_url || data.website || data.url,
      contactInfo: {
        phone: data.phone || data.contact_phone,
        email: data.email || data.contact_email,
        website: data.website || data.url
      }
    },
    status: 'active',
    tags: data.tags || data.keywords || [],
    source: data.source || 'government'
  }
}

/**
 * Map program categories to our types
 */
const mapProgramType = (category) => {
  const typeMap = {
    'food': 'Food Assistance',
    'nutrition': 'Food Assistance',
    'health': 'Healthcare',
    'medical': 'Healthcare',
    'housing': 'Housing',
    'shelter': 'Housing',
    'education': 'Education',
    'employment': 'Employment',
    'financial': 'Financial Aid',
    'cash': 'Financial Aid',
    'childcare': 'Childcare',
    'disability': 'Disability',
    'veterans': 'Veterans',
    'seniors': 'Seniors',
  }

  const lowerCategory = (category || '').toLowerCase()
  for (const [key, value] of Object.entries(typeMap)) {
    if (lowerCategory.includes(key)) {
      return value
    }
  }

  return 'Other'
}

/**
 * Parse eligibility criteria
 */
const parseEligibility = (eligibility) => {
  if (!eligibility) return {}
  
  if (typeof eligibility === 'string') {
    // Try to extract income limits, age requirements, etc.
    return {
      additionalRequirements: [eligibility]
    }
  }

  return eligibility
}

/**
 * Main function to fetch and import programs
 */
export const fetchAndImportPrograms = async () => {
  try {
    console.log('🚀 Starting program import from government sources...')
    
    let allPrograms = []

    // Try fetching from various sources
    // const benefitsGovPrograms = await fetchFromBenefitsGov()
    // const dataGovPrograms = await fetchFromDataGov()
    
    // For now, use curated government data
    const governmentPrograms = await fetchMockGovernmentPrograms()
    
    allPrograms = [...governmentPrograms]

    console.log(`📊 Total programs fetched: ${allPrograms.length}`)

    // Import into database
    let imported = 0
    let updated = 0
    let skipped = 0

    for (const programData of allPrograms) {
      try {
        // Check if program already exists
        const existing = await Program.findOne({ 
          name: programData.name,
          agency: programData.agency 
        })

        if (existing) {
          // Update existing program
          await Program.findByIdAndUpdate(existing._id, programData)
          updated++
          console.log(`✏️  Updated: ${programData.name}`)
        } else {
          // Create new program
          await Program.create(programData)
          imported++
          console.log(`✅ Imported: ${programData.name}`)
        }
      } catch (error) {
        console.error(`❌ Error importing ${programData.name}:`, error.message)
        skipped++
      }
    }

    console.log('\n📈 Import Summary:')
    console.log(`   ✅ Imported: ${imported}`)
    console.log(`   ✏️  Updated: ${updated}`)
    console.log(`   ❌ Skipped: ${skipped}`)
    console.log(`   📊 Total: ${allPrograms.length}`)

    return {
      success: true,
      imported,
      updated,
      skipped,
      total: allPrograms.length
    }
  } catch (error) {
    console.error('❌ Error in fetchAndImportPrograms:', error)
    throw error
  }
}

export default {
  fetchAndImportPrograms,
  fetchFromBenefitsGov,
  fetchFromDataGov,
  fetchMockGovernmentPrograms
}
