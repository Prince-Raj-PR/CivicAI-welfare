/**
 * Other major Indian government schemes
 * MGNREGA, PMGKAY, APY, PMJJBY, PMSBY, PM SVANidhi, PMKVY, NSP
 */

export async function scrape({ log = console.log } = {}) {
  log('[other_schemes] Loading additional schemes…')

  const programs = [
    // ── MGNREGA ──────────────────────────────────────────────────────────────
    {
      name: 'MGNREGA – Mahatma Gandhi National Rural Employment Guarantee Act',
      description:
        'MGNREGA guarantees 100 days of unskilled wage employment per year to every rural household whose adult members volunteer to do unskilled manual work. Wages are paid directly to the worker\'s bank account. If employment is not provided within 15 days, the applicant is entitled to unemployment allowance.',
      type: 'Employment',
      agency: 'Ministry of Rural Development, Government of India',
      location: 'Nationwide (Rural)',
      state: 'All India',
      eligibilityCriteria: {
        maxIncome: null,
        allowedCategories: ['Rural Poor', 'Unorganised / Informal Worker', 'Below Poverty Line (BPL)'],
        requiredDocuments: [
          'MGNREGA Job Card',
          'Aadhaar Card',
          'Bank Passbook / Account Details',
        ],
        studentRequired: false,
        disabilityRequired: false,
      },
      benefits: {
        type: 'monetary',
        description: '100 days guaranteed wage employment per year. Wage rates vary by state (₹220–₹357/day). Unemployment allowance if work not provided in 15 days.',
      },
      applicationProcess: {
        url: 'https://nregarep1.nic.in/',
        steps: [
          'Apply for Job Card at local Gram Panchayat',
          'Submit application with household member details and Aadhaar',
          'Job Card issued within 15 days',
          'Submit written demand for work to Gram Panchayat',
          'Employment must be provided within 15 days of demand',
        ],
      },
      tags: ['mgnrega', 'employment', 'rural', 'wage', 'job-card', '100-days'],
      status: 'active',
      source: 'ai-pipeline',
      pipelineSource: 'other-schemes',
    },

    // ── PMGKAY ───────────────────────────────────────────────────────────────
    {
      name: 'PMGKAY – Pradhan Mantri Garib Kalyan Anna Yojana',
      description:
        'PMGKAY provides free food grains (5 kg per person per month) to approximately 81.35 crore beneficiaries covered under the National Food Security Act. Extended for 5 years from January 2024, the scheme ensures no household goes hungry. Rice, wheat, and coarse grains are provided free of cost through the PDS network.',
      type: 'Food Assistance',
      agency: 'Ministry of Consumer Affairs, Food and Public Distribution',
      location: 'Nationwide',
      state: 'All India',
      eligibilityCriteria: {
        maxIncome: null,
        allowedCategories: [
          'Below Poverty Line (BPL)',
          'Rural Poor',
          'Urban Poor',
          'Antyodaya Anna Yojana (AAY) families',
        ],
        requiredDocuments: [
          'Ration Card',
          'Aadhaar Card',
        ],
        studentRequired: false,
        disabilityRequired: false,
      },
      benefits: {
        type: 'service',
        description: '5 kg free food grain (rice/wheat/coarse grain) per person per month via Fair Price Shops under PDS. Covers ~81 crore beneficiaries.',
      },
      applicationProcess: {
        url: 'https://nfsa.gov.in/',
        steps: [
          'Eligibility based on existing NFSA/Ration Card status',
          'Visit local Fair Price Shop (Ration Shop) with Aadhaar-linked ration card',
          'Authenticate via biometric/OTP',
          'Collect free grain allocation (no payment required)',
        ],
      },
      tags: ['pmgkay', 'food', 'ration', 'free-grain', 'pds', 'nfsa'],
      status: 'active',
      source: 'ai-pipeline',
      pipelineSource: 'other-schemes',
    },

    // ── Atal Pension Yojana ──────────────────────────────────────────────────
    {
      name: 'APY – Atal Pension Yojana',
      description:
        'APY is a government-backed pension scheme focused on workers in the unorganised sector. Subscribers receive a guaranteed minimum pension of ₹1,000 to ₹5,000 per month after age 60, depending on contribution amount and age of joining. The Government of India co-contributes 50% of the total contribution (up to ₹1,000/year) for eligible subscribers for 5 years.',
      type: 'Seniors',
      agency: 'Pension Fund Regulatory and Development Authority (PFRDA), Ministry of Finance',
      location: 'Nationwide',
      state: 'All India',
      eligibilityCriteria: {
        minAge: 18,
        maxAge: 40,
        maxIncome: null,
        allowedCategories: ['Unorganised / Informal Worker'],
        requiredDocuments: [
          'Aadhaar Card',
          'Bank Passbook / Account Details',
          'Mobile Number',
        ],
        studentRequired: false,
        disabilityRequired: false,
      },
      benefits: {
        type: 'monetary',
        description: 'Guaranteed pension of ₹1,000–₹5,000/month after age 60. On subscriber\'s death, spouse receives same pension. After both deaths, accumulated corpus returned to nominee.',
      },
      applicationProcess: {
        url: 'https://www.npscra.nsdl.co.in/scheme-details.php',
        steps: [
          'Open APY account at any bank branch or post office',
          'Fill APY registration form and link with Aadhaar',
          'Choose desired pension amount (₹1k–₹5k/month)',
          'Set up auto-debit for monthly contributions from bank account',
          'Government co-contribution credited automatically (if eligible)',
        ],
      },
      tags: ['apy', 'pension', 'retirement', 'pfrda', 'unorganised-worker'],
      status: 'active',
      source: 'ai-pipeline',
      pipelineSource: 'other-schemes',
    },

    // ── PMJJBY ───────────────────────────────────────────────────────────────
    {
      name: 'PMJJBY – Pradhan Mantri Jeevan Jyoti Bima Yojana',
      description:
        'PMJJBY offers renewable one-year life insurance cover of ₹2 lakh at a premium of only ₹436 per year (₹1.20/day). The scheme covers death due to any reason. It is open to all savings bank account holders aged 18–50 years.',
      type: 'Financial Aid',
      agency: 'Department of Financial Services, Ministry of Finance',
      location: 'Nationwide',
      state: 'All India',
      eligibilityCriteria: {
        minAge: 18,
        maxAge: 50,
        maxIncome: null,
        allowedCategories: [],
        requiredDocuments: [
          'Bank Passbook / Account Details',
          'Aadhaar Card',
          'Mobile Number',
        ],
        studentRequired: false,
        disabilityRequired: false,
      },
      benefits: {
        type: 'monetary',
        amount: 200000,
        description: '₹2 lakh life insurance cover at ₹436/year premium. Auto-debited from bank account every June 1. Renewable annually.',
      },
      applicationProcess: {
        url: 'https://jansuraksha.gov.in/PMJJBY.aspx',
        steps: [
          'Visit your bank branch or enroll online via net banking',
          'Submit PMJJBY enrollment form with Aadhaar details',
          '₹436 premium auto-debited from account on June 1 each year',
          'Nominee receives ₹2 lakh on account holder\'s death',
        ],
      },
      tags: ['pmjjby', 'life-insurance', 'insurance', 'jan-suraksha'],
      status: 'active',
      source: 'ai-pipeline',
      pipelineSource: 'other-schemes',
    },

    // ── PMSBY ────────────────────────────────────────────────────────────────
    {
      name: 'PMSBY – Pradhan Mantri Suraksha Bima Yojana',
      description:
        'PMSBY offers annual accidental death and disability insurance cover of ₹2 lakh at a premium of just ₹20 per year (less than ₹2/month). It covers accidental death and permanent/partial disability. Available to bank account holders aged 18–70 years.',
      type: 'Financial Aid',
      agency: 'Department of Financial Services, Ministry of Finance',
      location: 'Nationwide',
      state: 'All India',
      eligibilityCriteria: {
        minAge: 18,
        maxAge: 70,
        maxIncome: null,
        allowedCategories: [],
        requiredDocuments: [
          'Bank Passbook / Account Details',
          'Aadhaar Card',
        ],
        studentRequired: false,
        disabilityRequired: false,
      },
      benefits: {
        type: 'monetary',
        amount: 200000,
        description: '₹2 lakh for accidental death or permanent total disability; ₹1 lakh for permanent partial disability. Premium: ₹20/year.',
      },
      applicationProcess: {
        url: 'https://jansuraksha.gov.in/PMSBY.aspx',
        steps: [
          'Enroll at your bank or via net banking/mobile banking',
          'Fill PMSBY form with nominee details',
          '₹20 premium auto-debited annually from bank account',
          'Claim filed by nominee at insuring bank on accidental death/disability',
        ],
      },
      tags: ['pmsby', 'accident-insurance', 'insurance', 'jan-suraksha'],
      status: 'active',
      source: 'ai-pipeline',
      pipelineSource: 'other-schemes',
    },

    // ── PM SVANidhi ──────────────────────────────────────────────────────────
    {
      name: 'PM SVANidhi – PM Street Vendor\'s AtmaNirbhar Nidhi',
      description:
        'PM SVANidhi provides affordable working capital loans to street vendors to help them resume livelihoods affected by COVID-19 and beyond. Vendors can get initial loan of ₹10,000 which on timely repayment is upgraded to ₹20,000 and then ₹50,000.',
      type: 'Financial Aid',
      agency: 'Ministry of Housing and Urban Affairs',
      location: 'Nationwide (Urban)',
      state: 'All India',
      eligibilityCriteria: {
        maxIncome: null,
        allowedCategories: ['Urban Poor', 'Unorganised / Informal Worker'],
        requiredDocuments: [
          'Aadhaar Card',
          'Voter ID Card',
          'Certificate of Vending / Identity Card issued by ULB',
          'Bank Passbook / Account Details',
        ],
        studentRequired: false,
        disabilityRequired: false,
      },
      benefits: {
        type: 'monetary',
        description: 'Working capital loan: ₹10,000 (first), ₹20,000 (second), ₹50,000 (third tranche) on timely repayment. 7% interest subsidy. Cashback on digital transactions.',
      },
      applicationProcess: {
        url: 'https://pmsvanidhi.mohua.gov.in/',
        steps: [
          'Apply online at pmsvanidhi.mohua.gov.in or via lending institution',
          'Submit vendor certificate/identity proof from Urban Local Body',
          'Loan approved and disbursed by lending institution (MFI/SFB/NBFC)',
          'Repay in monthly installments',
          'On timely repayment, enhanced loan automatically available',
        ],
      },
      tags: ['svanidhi', 'street-vendor', 'microloan', 'urban', 'self-employment'],
      status: 'active',
      source: 'ai-pipeline',
      pipelineSource: 'other-schemes',
    },

    // ── PMKVY ────────────────────────────────────────────────────────────────
    {
      name: 'PMKVY 4.0 – Pradhan Mantri Kaushal Vikas Yojana',
      description:
        'PMKVY 4.0 (2022-2026) aims to skill 40 lakh youth through short-duration skill training and Recognition of Prior Learning (RPL). Training is free of cost for candidates and linked to industry-recognized certification. Industry 4.0 skills, digital literacy, and green skills are priority areas.',
      type: 'Education',
      agency: 'National Skill Development Corporation (NSDC), Ministry of Skill Development and Entrepreneurship',
      location: 'Nationwide',
      state: 'All India',
      eligibilityCriteria: {
        minAge: 15,
        maxAge: 45,
        maxIncome: null,
        allowedCategories: ['Student', 'Unorganised / Informal Worker'],
        requiredDocuments: [
          'Aadhaar Card',
          'Bank Passbook / Account Details',
          'Educational Certificates',
        ],
        studentRequired: false,
        disabilityRequired: false,
      },
      benefits: {
        type: 'service',
        description: 'Free skill training (150–300 hours) in 700+ job roles. Industry certification upon completion. Post-training placement assistance. Monetary reward on certification.',
      },
      applicationProcess: {
        url: 'https://www.pmkvyofficial.org/',
        steps: [
          'Visit pmkvyofficial.org or nearest PMKVY Training Centre',
          'Select desired skill/trade and enroll with Aadhaar',
          'Attend free training (residential/non-residential)',
          'Appear for assessment by Sector Skill Council',
          'Receive certificate and placement support',
        ],
      },
      tags: ['pmkvy', 'skill', 'training', 'employment', 'youth', 'certification'],
      status: 'active',
      source: 'ai-pipeline',
      pipelineSource: 'other-schemes',
    },

    // ── NSP Scholarships ─────────────────────────────────────────────────────
    {
      name: 'NSP – National Scholarship Portal (Central Scholarships)',
      description:
        'The National Scholarship Portal is a one-stop portal for all government scholarship schemes. It hosts 50+ scholarships from various central ministries covering pre-matric, post-matric, and merit-cum-means scholarships for SC, ST, OBC, minority, and EWS students.',
      type: 'Education',
      agency: 'Ministry of Electronics and Information Technology (MeitY)',
      location: 'Nationwide',
      state: 'All India',
      eligibilityCriteria: {
        maxIncome: 250000, // Typical NSP income threshold
        allowedCategories: [
          'Scheduled Caste (SC)',
          'Scheduled Tribe (ST)',
          'Other Backward Classes (OBC)',
          'Minority',
          'Economically Weaker Section (EWS)',
          'Student',
        ],
        requiredDocuments: [
          'Aadhaar Card',
          'Income Certificate',
          'Caste Certificate',
          'Bank Passbook / Account Details',
          'Educational Certificates',
          'Passport-Size Photograph',
        ],
        studentRequired: true,
        disabilityRequired: false,
      },
      benefits: {
        type: 'monetary',
        description: 'Various scholarship amounts depending on scheme and level: Pre-matric (₹100–₹500/month), Post-matric (₹1,200–₹3,000/month). Direct benefit transfer to student bank account.',
      },
      applicationProcess: {
        url: 'https://scholarships.gov.in/',
        steps: [
          'Register on scholarships.gov.in with Aadhaar',
          'Select applicable scholarship scheme',
          'Fill application and upload required documents',
          'Submit before deadline (usually September–October)',
          'Scholarship disbursed directly to bank account on approval',
        ],
      },
      tags: ['nsp', 'scholarship', 'education', 'sc', 'st', 'obc', 'minority'],
      status: 'active',
      source: 'ai-pipeline',
      pipelineSource: 'other-schemes',
    },

    // ── PMJDY ────────────────────────────────────────────────────────────────
    {
      name: 'PMJDY – Pradhan Mantri Jan Dhan Yojana',
      description:
        'PMJDY is the world\'s largest financial inclusion initiative. It provides universal access to banking services — a basic savings bank account, RuPay debit card, ₹2 lakh accidental insurance, ₹30,000 life cover, overdraft facility up to ₹10,000, and access to pension and insurance products. Over 54 crore accounts opened.',
      type: 'Financial Aid',
      agency: 'Department of Financial Services, Ministry of Finance',
      location: 'Nationwide',
      state: 'All India',
      eligibilityCriteria: {
        minAge: 10,
        maxIncome: null,
        allowedCategories: [],
        requiredDocuments: [
          'Aadhaar Card',
          'Passport-Size Photograph',
          'Address Proof (any one)',
        ],
        studentRequired: false,
        disabilityRequired: false,
      },
      benefits: {
        type: 'service',
        description: 'Zero-balance savings account, RuPay debit card with ₹2 lakh accident insurance, ₹30,000 life cover, overdraft up to ₹10,000, mobile banking access.',
      },
      applicationProcess: {
        url: 'https://pmjdy.gov.in/',
        steps: [
          'Visit any bank branch or Business Correspondent (BC) outlet',
          'Fill account opening form with Aadhaar/any KYC document',
          'Account opened on the spot with zero balance',
          'RuPay debit card issued',
          'Overdraft facility available after 6 months of satisfactory operation',
        ],
      },
      tags: ['pmjdy', 'jan-dhan', 'banking', 'financial-inclusion', 'rupay'],
      status: 'active',
      source: 'ai-pipeline',
      pipelineSource: 'other-schemes',
    },

    // ── Sukanya Samriddhi Yojana ─────────────────────────────────────────────
    {
      name: 'SSY – Sukanya Samriddhi Yojana',
      description:
        'Sukanya Samriddhi Yojana is a small savings scheme for the girl child under the "Beti Bachao, Beti Padhao" initiative. It offers one of the highest interest rates among small savings schemes (currently 8.2% p.a.) with full tax exemption under Section 80C.',
      type: 'Financial Aid',
      agency: 'Department of Posts, Ministry of Communications / Ministry of Finance',
      location: 'Nationwide',
      state: 'All India',
      eligibilityCriteria: {
        maxAge: 10, // girl child must be below 10 years at account opening
        maxIncome: null,
        allowedCategories: ['Women'],
        requiredDocuments: [
          'Birth Certificate (girl child)',
          'Aadhaar Card (parent/guardian)',
          'Address Proof',
          'Passport-Size Photograph',
        ],
        studentRequired: false,
        disabilityRequired: false,
      },
      benefits: {
        type: 'monetary',
        description: '8.2% p.a. interest (compounded annually). Minimum ₹250, maximum ₹1.5 lakh/year. Tax-free maturity amount. Partial withdrawal at 18 for education. Full withdrawal at 21.',
      },
      applicationProcess: {
        url: 'https://www.indiapost.gov.in/',
        steps: [
          'Visit nearest Post Office or authorized bank branch',
          'Submit girl child\'s birth certificate and guardian\'s KYC',
          'Deposit minimum ₹250 to open the account',
          'Account matures 21 years from opening or at girl\'s marriage (after 18)',
        ],
      },
      tags: ['ssy', 'girl-child', 'beti-bachao', 'savings', 'education', 'women'],
      status: 'active',
      source: 'ai-pipeline',
      pipelineSource: 'other-schemes',
    },
  ]

  log(`[other_schemes] Done — ${programs.length} program(s)`)
  return programs
}
