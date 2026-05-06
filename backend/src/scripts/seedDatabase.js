import dotenv from 'dotenv'
import connectDB from '../config/database.js'
import { User, Program, EligibilityCheck } from '../models/index.js'

// Load environment variables
dotenv.config()

// Sample programs data
const programs = [
  {
    name: 'Supplemental Nutrition Assistance Program (SNAP)',
    description: 'SNAP provides nutrition benefits to supplement the food budget of needy families so they can purchase healthy food and move towards self-sufficiency.',
    type: 'Food Assistance',
    agency: 'U.S. Department of Agriculture',
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
    tags: ['food', 'nutrition', 'assistance', 'federal'],
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
    tags: ['housing', 'rental', 'assistance', 'federal'],
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
    tags: ['financial', 'cash', 'assistance', 'families', 'federal'],
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
    tags: ['food', 'nutrition', 'women', 'children', 'infants', 'federal'],
  },
]

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...')

    // Connect to database
    await connectDB()

    // Clear existing data
    console.log('🗑️  Clearing existing data...')
    await User.deleteMany({})
    await Program.deleteMany({})
    await EligibilityCheck.deleteMany({})

    // Insert programs
    console.log('📝 Inserting programs...')
    const insertedPrograms = await Program.insertMany(programs)
    console.log(`✅ Inserted ${insertedPrograms.length} programs`)

    // Create a test admin user
    console.log('👤 Creating test admin user...')
    const adminUser = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@civicai.com',
      password: 'Admin123!',
      isEmailVerified: true,
      role: 'admin',
    })
    console.log(`✅ Created admin user: ${adminUser.email}`)

    // Create a test regular user
    console.log('👤 Creating test regular user...')
    const testUser = await User.create({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'Test123!',
      isEmailVerified: true,
      role: 'user',
      profile: {
        householdSize: 3,
        annualIncome: 32000,
        employmentStatus: 'employed',
      },
    })
    console.log(`✅ Created test user: ${testUser.email}`)

    console.log('\n🎉 Database seeding completed successfully!')
    console.log('\n📊 Summary:')
    console.log(`   - Programs: ${insertedPrograms.length}`)
    console.log(`   - Users: 2 (1 admin, 1 regular)`)
    console.log('\n🔐 Test Credentials:')
    console.log('   Admin: admin@civicai.com / Admin123!')
    console.log('   User: john.doe@example.com / Test123!')

    process.exit(0)
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    process.exit(1)
  }
}

// Run seeder
seedDatabase()
