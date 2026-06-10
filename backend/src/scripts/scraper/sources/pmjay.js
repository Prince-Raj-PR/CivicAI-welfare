/**
 * PM-JAY / Ayushman Bharat scraper — nha.gov.in
 * Pradhan Mantri Jan Arogya Yojana
 * Health coverage up to ₹5 lakh/family/year
 */

import axios from 'axios'
import * as cheerio from 'cheerio'

const URLS = {
  overview: 'https://nha.gov.in/PM-JAY',
  pib: 'https://pib.gov.in/PressReleseDetailm.aspx?PRID=2123250',
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
  'Accept-Language': 'en-IN,en;q=0.9',
}

async function fetchHTML(url) {
  const res = await axios.get(url, { timeout: 20000, headers: HEADERS })
  return res.data
}

export async function scrape({ log = console.log } = {}) {
  log('[pmjay] Scraping PM-JAY / Ayushman Bharat…')

  const programs = [
    {
      name: 'PM-JAY – Ayushman Bharat (Pradhan Mantri Jan Arogya Yojana)',
      description:
        'PM-JAY is the world\'s largest health assurance scheme providing health coverage of up to ₹5 lakh per family per year for secondary and tertiary care hospitalisation. It covers over 12 crore poor and vulnerable families (approximately 55 crore beneficiaries) in the bottom two income deciles of the Indian population as defined by SECC 2011 data.',
      type: 'Healthcare',
      agency: 'National Health Authority, Ministry of Health & Family Welfare',
      location: 'Nationwide',
      state: 'All India',
      eligibilityCriteria: {
        maxIncome: 250000,
        allowedCategories: [
          'Below Poverty Line (BPL)',
          'Scheduled Caste (SC)',
          'Scheduled Tribe (ST)',
          'Other Backward Classes (OBC)',
          'Economically Weaker Section (EWS)',
        ],
        requiredDocuments: [
          'Aadhaar Card',
          'Ration Card',
          'SECC 2011 Registration Proof',
          'Ayushman Card (issued at empanelled hospital)',
        ],
        studentRequired: false,
        disabilityRequired: false,
      },
      benefits: {
        type: 'service',
        amount: 500000,
        frequency: 'annually',
        description:
          'Cashless and paperless treatment up to ₹5 lakh per family per year at empanelled government and private hospitals. Covers pre-hospitalisation (3 days) and post-hospitalisation (15 days) expenses. Over 1,900 procedures covered.',
      },
      applicationProcess: {
        url: 'https://pmjay.gov.in/',
        steps: [
          'Check eligibility at pmjay.gov.in or call 14555',
          'Visit nearest empanelled hospital with Aadhaar card',
          'Meet Ayushman Mitra at the hospital help desk',
          'Get Ayushman Card issued on-spot',
          'Avail cashless treatment immediately',
        ],
      },
      tags: ['pmjay', 'ayushman', 'health', 'insurance', 'cashless', 'hospital'],
      status: 'active',
      source: 'ai-pipeline',
      pipelineSource: 'pmjay-scraper',
    },
    {
      name: 'Ayushman Bharat – Pradhan Mantri Jan Arogya Yojana for Senior Citizens (AB PM-JAY 70+)',
      description:
        'Extended PM-JAY coverage for all senior citizens aged 70 years and above, irrespective of their income or existing insurance status. Announced in 2024, this extends health protection to approximately 6 crore senior citizens.',
      type: 'Healthcare',
      agency: 'National Health Authority, Ministry of Health & Family Welfare',
      location: 'Nationwide',
      state: 'All India',
      eligibilityCriteria: {
        minAge: 70,
        maxIncome: null, // No income limit for 70+
        allowedCategories: ['Senior Citizen (60+)'],
        requiredDocuments: [
          'Aadhaar Card',
          'Age Proof (Birth Certificate / School Certificate)',
        ],
        studentRequired: false,
        disabilityRequired: false,
      },
      benefits: {
        type: 'service',
        amount: 500000,
        frequency: 'annually',
        description: 'Cashless health coverage of up to ₹5 lakh per year for all citizens aged 70+, regardless of income.',
      },
      applicationProcess: {
        url: 'https://pmjay.gov.in/',
        steps: [
          'Visit nearest empanelled hospital or Common Service Centre',
          'Carry Aadhaar card and age proof',
          'Get Ayushman Vaya Vandana Card issued',
          'Avail cashless treatment at empanelled hospitals',
        ],
      },
      tags: ['pmjay', 'ayushman', 'senior', 'elderly', 'health', '70+'],
      status: 'active',
      source: 'ai-pipeline',
      pipelineSource: 'pmjay-scraper',
    },
  ]

  // Try to enrich with live data from NHA
  try {
    const html = await fetchHTML(URLS.overview)
    const $ = cheerio.load(html)

    // Look for beneficiary count or coverage stats
    let hospitalisations = ''
    $('p, li, td, div').each((_, el) => {
      const text = $(el).text().trim()
      if (/\d+\s*(crore|lakh)\s*(hospitalisation|beneficiar|empanell)/i.test(text) && text.length < 200) {
        hospitalisations = text
        return false // break
      }
    })

    if (hospitalisations) {
      programs[0].description += ` ${hospitalisations}`
    }

    log('[pmjay] Enriched with live NHA data')
  } catch (err) {
    log(`[pmjay] NHA portal fetch failed (${err.message}) — using static data`)
  }

  log(`[pmjay] Done — ${programs.length} program(s)`)
  return programs
}
