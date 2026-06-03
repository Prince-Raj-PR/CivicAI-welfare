/**
 * Remove US programs and keep only Indian government schemes
 */

import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

const programSchema = new mongoose.Schema({}, { strict: false });
const Program = mongoose.model('Program', programSchema);

// US programs to remove
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

async function cleanupDatabase() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const allPrograms = await Program.find();
    console.log(`📊 Total programs before cleanup: ${allPrograms.length}\n`);

    let removed = 0;

    for (const program of allPrograms) {
      const name = program.name.toLowerCase();
      const isUSProgram = US_PROGRAMS.some(usProgram => name.includes(usProgram));

      if (isUSProgram) {
        await Program.findByIdAndDelete(program._id);
        console.log(`❌ Removed US program: ${program.name}`);
        removed++;
      }
    }

    const remaining = await Program.countDocuments();
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 CLEANUP SUMMARY');
    console.log('='.repeat(60));
    console.log(`❌ Removed: ${removed} US programs`);
    console.log(`✅ Remaining: ${remaining} Indian schemes`);
    console.log('='.repeat(60));

    // List remaining programs
    const indianPrograms = await Program.find().sort({ name: 1 });
    console.log('\n📋 Remaining Indian government schemes:\n');
    indianPrograms.forEach((program, index) => {
      console.log(`${index + 1}. ${program.name}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

cleanupDatabase();
