/**
 * List all programs in the database
 */

import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

const programSchema = new mongoose.Schema({
  name: String,
  description: String,
  category: String,
  agency: String,
  state: String,
  website: String,
  status: String,
}, { timestamps: true });

const Program = mongoose.model('Program', programSchema);

async function listPrograms() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const programs = await Program.find().sort({ name: 1 });
    
    console.log('📋 Programs in database:\n');
    console.log('='.repeat(80));
    
    programs.forEach((program, index) => {
      console.log(`${index + 1}. ${program.name}`);
      console.log(`   Category: ${program.category}`);
      console.log(`   Agency: ${program.agency || 'N/A'}`);
      console.log(`   State: ${program.state || 'All India'}`);
      console.log(`   Status: ${program.status}`);
      if (program.website) {
        console.log(`   Website: ${program.website}`);
      }
      console.log('');
    });
    
    console.log('='.repeat(80));
    console.log(`📊 Total: ${programs.length} programs\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

listPrograms();
