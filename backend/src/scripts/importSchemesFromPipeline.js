/**
 * Import schemes from AI pipeline into MongoDB
 * Filters out US programs and imports only Indian government schemes
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

// Program model schema
const programSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  eligibilityCriteria: {
    minAge: Number,
    maxAge: Number,
    maxIncome: Number,
    requiresCitizenship: Boolean,
    requiresResidency: Boolean,
    employmentStatus: [String],
    familySize: Number,
    hasChildren: Boolean,
    isVeteran: Boolean,
    hasDisability: Boolean,
    isStudent: Boolean,
  },
  benefits: {
    type: String,
    benefitType: String,
    benefitAmount: Number,
  },
  requiredDocuments: [String],
  applicationProcess: String,
  agency: String,
  state: String,
  website: String,
  contactEmail: String,
  contactPhone: String,
  applicationDeadline: Date,
  status: { type: String, default: 'active' },
}, { timestamps: true });

const Program = mongoose.model('Program', programSchema);

// List of Indian scheme keywords to identify valid schemes
const INDIAN_SCHEME_KEYWORDS = [
  'pradhan mantri',
  'pm-jay',
  'pm-kisan',
  'pmay',
  'ayushman',
  'bharat',
  'mgnrega',
  'jan dhan',
  'aadhaar',
  'myscheme',
  'india',
  'bharatiya',
  'bhartiya',
  'modi',
];

// List of US program names to exclude
const US_PROGRAMS = [
  'medicaid',
  'medicare',
  'liheap',
  'tanf',
  'snap',
  'wic',
  'ssi',
  'benefits.gov',
  'poverty guidelines',
];

function isIndianScheme(scheme) {
  const name = scheme.scheme_name.toLowerCase();
  
  // Exclude US programs
  for (const usProgram of US_PROGRAMS) {
    if (name.includes(usProgram)) {
      console.log(`❌ Excluding US program: ${scheme.scheme_name}`);
      return false;
    }
  }
  
  // Check if it's an Indian scheme
  const isIndian = INDIAN_SCHEME_KEYWORDS.some(keyword => name.includes(keyword));
  
  if (!isIndian) {
    console.log(`⚠️  Skipping non-Indian scheme: ${scheme.scheme_name}`);
  }
  
  return isIndian;
}

function mapCategory(allowedCategories) {
  // Map from pipeline categories to our app categories
  const categories = allowedCategories || [];
  
  if (categories.some(c => c.includes('Health') || c.includes('Medical'))) {
    return 'Healthcare';
  }
  if (categories.some(c => c.includes('EWS') || c.includes('Housing') || c.includes('Awas'))) {
    return 'Housing';
  }
  if (categories.some(c => c.includes('Farmer') || c.includes('Agriculture'))) {
    return 'Agriculture';
  }
  if (categories.some(c => c.includes('Student') || c.includes('Education') || c.includes('Scholarship'))) {
    return 'Education';
  }
  if (categories.some(c => c.includes('Employment') || c.includes('Job'))) {
    return 'Employment';
  }
  if (categories.some(c => c.includes('Women') || c.includes('Girl'))) {
    return 'Women & Child';
  }
  if (categories.some(c => c.includes('Senior') || c.includes('Pension'))) {
    return 'Senior Citizens';
  }
  if (categories.some(c => c.includes('Disability') || c.includes('Disabled'))) {
    return 'Disability';
  }
  
  return 'Social Welfare';
}

function determineBenefitType(benefit, schemeName) {
  const name = schemeName.toLowerCase();
  const benefitText = benefit.toLowerCase();
  
  if (name.includes('health') || name.includes('medical') || name.includes('insurance') || 
      benefitText.includes('health') || benefitText.includes('insurance')) {
    return 'Health Insurance';
  }
  if (name.includes('housing') || name.includes('awas') || 
      benefitText.includes('house') || benefitText.includes('housing')) {
    return 'Housing Subsidy';
  }
  if (name.includes('kisan') || name.includes('farmer') || 
      benefitText.includes('farmer') || benefitText.includes('agriculture')) {
    return 'Direct Cash Transfer';
  }
  if (name.includes('scholarship') || name.includes('education')) {
    return 'Scholarship';
  }
  if (name.includes('pension')) {
    return 'Pension';
  }
  
  return 'Financial Assistance';
}

function getAgency(schemeName) {
  const name = schemeName.toLowerCase();
  
  if (name.includes('pm-jay') || name.includes('ayushman')) {
    return 'National Health Authority, Ministry of Health & Family Welfare';
  }
  if (name.includes('kisan')) {
    return 'Department of Agriculture & Farmers Welfare';
  }
  if (name.includes('pmay') || name.includes('awas')) {
    return 'Ministry of Housing and Urban Affairs';
  }
  if (name.includes('myscheme')) {
    return 'National e-Governance Division, MeitY';
  }
  
  return 'Government of India';
}

function getWebsite(schemeName) {
  const name = schemeName.toLowerCase();
  
  if (name.includes('pm-jay') || name.includes('ayushman')) {
    return 'https://pmjay.gov.in/';
  }
  if (name.includes('kisan')) {
    return 'https://pmkisan.gov.in/';
  }
  if (name.includes('pmay') || name.includes('awas')) {
    return 'https://pmay-urban.gov.in/';
  }
  if (name.includes('myscheme')) {
    return 'https://www.myscheme.gov.in/';
  }
  
  return null;
}

function mapSchemeToProgram(scheme) {
  const category = mapCategory(scheme.allowed_categories);
  const benefitType = determineBenefitType(scheme.benefit, scheme.scheme_name);
  const agency = getAgency(scheme.scheme_name);
  const website = getWebsite(scheme.scheme_name);
  
  return {
    name: scheme.scheme_name,
    description: scheme.description || 'No description available',
    category: category,
    eligibilityCriteria: {
      minAge: scheme.age_min,
      maxAge: scheme.age_max,
      maxIncome: scheme.income_max,
      requiresCitizenship: true, // Indian schemes require citizenship
      requiresResidency: scheme.state !== 'All India',
      hasDisability: scheme.disability_required || false,
      isStudent: scheme.student_required || false,
    },
    benefits: {
      type: scheme.benefit || 'As per scheme guidelines',
      benefitType: benefitType,
      benefitAmount: scheme.income_max ? Math.floor(scheme.income_max / 10) : null,
    },
    requiredDocuments: scheme.required_documents || [],
    applicationProcess: scheme.application_process || 'Please visit the official website for application process.',
    agency: agency,
    state: scheme.state === 'All India' ? null : scheme.state,
    website: website,
    status: 'active',
  };
}

async function importSchemes() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Read schemes.json
    const schemesPath = path.join(__dirname, '../../../backend/data/schemes.json');
    console.log(`📂 Reading schemes from: ${schemesPath}`);
    
    const rawData = fs.readFileSync(schemesPath, 'utf8');
    const allSchemes = JSON.parse(rawData);
    
    console.log(`📊 Total schemes in file: ${allSchemes.length}\n`);

    // Filter to only Indian schemes
    const indianSchemes = allSchemes.filter(isIndianScheme);
    console.log(`\n✅ Found ${indianSchemes.length} Indian government schemes\n`);

    let imported = 0;
    let skipped = 0;

    for (const scheme of indianSchemes) {
      try {
        // Check if scheme already exists
        const existing = await Program.findOne({ 
          name: { $regex: new RegExp(scheme.scheme_name, 'i') }
        });

        if (existing) {
          console.log(`⏭️  Already exists: ${scheme.scheme_name}`);
          skipped++;
          continue;
        }

        // Map and create new program
        const programData = mapSchemeToProgram(scheme);
        const program = new Program(programData);
        await program.save();

        console.log(`✅ Imported: ${scheme.scheme_name}`);
        console.log(`   Category: ${programData.category}`);
        console.log(`   Agency: ${programData.agency}`);
        if (programData.website) {
          console.log(`   Website: ${programData.website}`);
        }
        console.log('');
        imported++;

      } catch (error) {
        console.error(`❌ Error importing ${scheme.scheme_name}:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 IMPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully imported: ${imported}`);
    console.log(`⏭️  Skipped (already exist): ${skipped}`);
    console.log(`📦 Total Indian schemes: ${indianSchemes.length}`);
    console.log('='.repeat(60));

    // Show total programs in database
    const totalPrograms = await Program.countDocuments();
    console.log(`\n📚 Total programs in database: ${totalPrograms}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the import
importSchemes();
