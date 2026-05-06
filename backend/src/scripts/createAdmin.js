import mongoose from 'mongoose'
import User from '../models/User.js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../../.env') })

const createAdmin = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')
    
    // Admin credentials
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@civicai.com'
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456'
    
    // Check if admin exists
    const existingAdmin = await User.findOne({ email: adminEmail })
    
    if (existingAdmin) {
      // Update to admin
      existingAdmin.role = 'admin'
      existingAdmin.isEmailVerified = true
      await existingAdmin.save()
      console.log('\n✅ Existing user updated to admin role')
      console.log(`📧 Email: ${adminEmail}`)
      console.log(`👤 Name: ${existingAdmin.firstName} ${existingAdmin.lastName}`)
    } else {
      // Create new admin
      const admin = await User.create({
        firstName: 'Admin',
        lastName: 'User',
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        isEmailVerified: true
      })
      console.log('\n✅ Admin user created successfully!')
      console.log(`📧 Email: ${adminEmail}`)
      console.log(`🔑 Password: ${adminPassword}`)
      console.log(`👤 Name: ${admin.firstName} ${admin.lastName}`)
      console.log('\n⚠️  IMPORTANT: Change the default password after first login!')
    }
    
    console.log('\n🎉 Admin setup complete!')
    console.log('🔗 Login at: http://localhost:3000/login')
    console.log('🔗 Admin Dashboard: http://localhost:3000/admin')
    
    await mongoose.connection.close()
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error creating admin:', error.message)
    await mongoose.connection.close()
    process.exit(1)
  }
}

// Run the script
createAdmin()
