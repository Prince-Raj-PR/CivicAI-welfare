/**
 * PMAY scraper — pmay-urban.gov.in + pmayg.nic.in
 * Pradhan Mantri Awas Yojana (Urban & Gramin)
 */

import axios from 'axios'
import * as cheerio from 'cheerio'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  Accept: 'text/html,*/*;q=0.8',
  'Accept-Language': 'en-IN,en;q=0.9',
}

async function fetchHTML(url) {
  const res = await axios.get(url, { timeout: 20000, headers: HEADERS })
  return res.data
}

export async function scrape({ log = console.log } = {}) {
  log('[pmay] Scraping PMAY Urban & Gramin…')

  const programs = [
    // ── PMAY Urban 2.0 ───────────────────────────────────────────────────────
    {
      name: 'PMAY-U 2.0 – Pradhan Mantri Awas Yojana (Urban) 2.0',
      description:
        'PMAY-Urban 2.0 (2024-2029) aims to construct 1 crore new houses for eligible urban families. The scheme provides central assistance through four components: Beneficiary Led Construction (BLC), Affordable Housing in Partnership (AHP), In-Situ Slum Redevelopment (ISSR), and Interest Subsidy Scheme (ISS). Priority is given to EWS and LIG families.',
      type: 'Housing',
      agency: 'Ministry of Housing and Urban Affairs, Government of India',
      location: 'Nationwide (Urban Areas)',
      state: 'All India',
      eligibilityCriteria: {
        maxIncome: 900000, // ₹9 lakh/year for MIG
        allowedCategories: [
          'Economically Weaker Section (EWS)',
          'Below Poverty Line (BPL)',
          'Scheduled Caste (SC)',
          'Scheduled Tribe (ST)',
          'Other Backward Classes (OBC)',
          'Women',
          'Persons with Disability (PwD)',
          'Minority',
          'Senior Citizen (60+)',
        ],
        requiredDocuments: [
          'Aadhaar Card',
          'Income Certificate',
          'Address Proof',
          'Bank Passbook / Account Details',
          'Caste Certificate (if applicable)',
          'Domicile / Residence Certificate',
          'Passport-Size Photograph',
        ],
        studentRequired: false,
        disabilityRequired: false,
      },
      benefits: {
        type: 'monetary',
        description:
          'Up to ₹2.5 lakh central assistance for BLC; ₹1.5 lakh for AHP; interest subsidy on home loans. No beneficiary family should own a pucca house in any part of India.',
      },
      applicationProcess: {
        url: 'https://pmay-urban.gov.in/',
        steps: [
          'Check eligibility on pmay-urban.gov.in',
          'Apply through your State/UT Housing Board or Urban Local Body',
          'Submit Aadhaar-linked application with required documents',
          'Await beneficiary selection and allotment by State/UT',
          'Construction/purchase assistance disbursed in stages',
        ],
      },
      tags: ['pmay', 'housing', 'urban', 'affordable-housing', 'ews', 'lig'],
      status: 'active',
      source: 'ai-pipeline',
      pipelineSource: 'pmay-scraper',
    },

    // ── PMAY Gramin ─────────────────────────────────────────────────────────
    {
      name: 'PMAY-G – Pradhan Mantri Awas Yojana (Gramin)',
      description:
        'PMAY-Gramin aims to provide a pucca house with basic amenities to all rural households who are houseless or living in kutcha or dilapidated houses. The scheme targets families listed in SECC 2011 data, prioritising SC/ST, minorities, widows, and disabled persons.',
      type: 'Housing',
      agency: 'Ministry of Rural Development, Government of India',
      location: 'Nationwide (Rural Areas)',
      state: 'All India',
      eligibilityCriteria: {
        maxIncome: null,
        allowedCategories: [
          'Below Poverty Line (BPL)',
          'Scheduled Caste (SC)',
          'Scheduled Tribe (ST)',
          'Other Backward Classes (OBC)',
          'Minority',
          'Women',
          'Persons with Disability (PwD)',
          'Unorganised / Informal Worker',
          'Rural Poor',
        ],
        requiredDocuments: [
          'Aadhaar Card',
          'SECC 2011 Registration Proof',
          'MGNREGA Job Card',
          'Bank Passbook / Account Details',
          'Caste Certificate (if applicable)',
        ],
        studentRequired: false,
        disabilityRequired: false,
      },
      benefits: {
        type: 'monetary',
        description:
          '₹1.20 lakh in plains and ₹1.30 lakh in hilly/difficult areas per unit. Additional ₹12,000 for toilet construction under Swachh Bharat Mission. MGNREGA wages for 90 days unskilled labour.',
      },
      applicationProcess: {
        url: 'https://pmayg.nic.in/',
        steps: [
          'Eligibility is determined through SECC 2011 data — no separate application needed',
          'Wait list is prepared by Gram Panchayat and verified by district authorities',
          'Selected beneficiaries are notified and linked via Aadhaar',
          'Funds released in 3 installments directly to bank account',
          'Geo-tagged photographs of house construction submitted at each stage',
        ],
      },
      tags: ['pmay', 'housing', 'rural', 'gramin', 'secc', 'bpl'],
      status: 'active',
      source: 'ai-pipeline',
      pipelineSource: 'pmay-scraper',
    },
  ]

  // Try to fetch PMAY-Urban about page for enrichment
  try {
    const html = await fetchHTML('https://pmay-urban.gov.in/about')
    const $ = cheerio.load(html)

    let extraDesc = ''
    $('p').each((_, el) => {
      const text = $(el).text().trim()
      if (text.length > 100 && text.length < 400 && /house|beneficiar|crore/i.test(text)) {
        extraDesc = text
        return false
      }
    })

    if (extraDesc && !programs[0].description.includes(extraDesc.substring(0, 50))) {
      programs[0].description += ` ${extraDesc}`
    }

    log('[pmay] Enriched with live PMAY-Urban data')
  } catch (err) {
    log(`[pmay] PMAY-Urban fetch failed (${err.message}) — using static data`)
  }

  log(`[pmay] Done — ${programs.length} program(s)`)
  return programs
}
