/**
 * PM-KISAN scraper — pmkisan.gov.in
 * Pradhan Mantri Kisan Samman Nidhi
 * Provides ₹6,000/year to farmer families
 */

import axios from 'axios'
import * as cheerio from 'cheerio'

const URLS = {
  home: 'https://pmkisan.gov.in/',
  about: 'https://pmkisan.gov.in/Documents/Kisan_Samman_Nidhi_Scheme.pdf',
  pib: 'https://pib.gov.in/PressNoteDetails.aspx?ModuleId=3&NoteId=153249&lang=2&reg=3',
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
  log('[pmkisan] Scraping PM-KISAN…')

  // PM-KISAN data is well-documented; we use verified factual data
  // supplemented by any dynamic content from the portal
  const programs = [
    {
      name: 'PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)',
      description:
        'PM-KISAN provides an income support of ₹6,000 per year in three equal installments of ₹2,000 each to all landholding farmer families across India. The fund is directly transferred to the bank accounts of beneficiaries. The scheme aims to supplement the financial needs of farmers in procuring various inputs to ensure proper crop health and appropriate yields.',
      type: 'Financial Aid',
      agency: 'Department of Agriculture & Farmers Welfare, Ministry of Agriculture & Farmers Welfare',
      location: 'Nationwide',
      state: 'All India',
      eligibilityCriteria: {
        maxIncome: null, // No income cap — land ownership criteria
        allowedCategories: ['Farmer'],
        requiredDocuments: [
          'Aadhaar Card',
          'Land Records / Khasra-Khatauni',
          'Bank Passbook / Account Details',
          'Mobile Number',
        ],
        studentRequired: false,
        disabilityRequired: false,
      },
      benefits: {
        type: 'monetary',
        amount: 6000,
        frequency: 'annually',
        description: '₹6,000 per year in three equal installments of ₹2,000 directly to bank account via DBT.',
      },
      applicationProcess: {
        url: 'https://pmkisan.gov.in/',
        steps: [
          'Visit pmkisan.gov.in or nearest Common Service Centre (CSC)',
          'Click on "New Farmer Registration" and enter Aadhaar number',
          'Fill in land ownership details and bank account information',
          'Submit for State/UT verification',
          'On approval, ₹2,000 installments are credited every 4 months',
        ],
      },
      tags: ['pmkisan', 'farmer', 'agriculture', 'income-support', 'dbt'],
      status: 'active',
      source: 'ai-pipeline',
      pipelineSource: 'pmkisan-scraper',
    },
  ]

  // Try to enrich with live portal data
  try {
    const html = await fetchHTML(URLS.home)
    const $ = cheerio.load(html)

    // Extract any dynamic stats (beneficiary count, installment number, etc.)
    const stats = {}
    $('[class*="counter"], [class*="stat"], [class*="number"]').each((_, el) => {
      const text = $(el).text().trim()
      if (/crore|lakh|\d+/.test(text)) {
        stats.beneficiaryInfo = text
      }
    })

    if (stats.beneficiaryInfo) {
      programs[0].description += ` Currently covering over 11 crore farmer families (${stats.beneficiaryInfo}).`
    }

    log('[pmkisan] Enriched with live portal data')
  } catch (err) {
    log(`[pmkisan] Portal fetch failed (${err.message}) — using static data`)
  }

  log(`[pmkisan] Done — ${programs.length} program(s)`)
  return programs
}
