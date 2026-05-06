# Database Integration Documentation

## Overview

CivicAI now uses MongoDB with Mongoose ODM for data persistence. This document outlines the database structure, models, and usage.

## Database Models

### 1. User Model (`models/User.js`)

Stores user account information and profiles.

**Schema:**
```javascript
{
  firstName: String (required, max 50 chars)
  lastName: String (required, max 50 chars)
  email: String (required, unique, validated)
  password: String (required, hashed, min 8 chars)
  isEmailVerified: Boolean (default: false)
  emailVerificationToken: String
  emailVerificationExpires: Date
  passwordResetToken: String
  passwordResetExpires: Date
  role: String (enum: ['user', 'admin'], default: 'user')
  profile: {
    phone: String
    dateOfBirth: Date
    address: {
      street, city, state, zipCode, country: String
    }
    householdSize: Number
    annualIncome: Number
    employmentStatus: String (enum)
  }
  lastLogin: Date
  createdAt: Date (auto)
  updatedAt: Date (auto)
}
```

**Methods:**
- `comparePassword(candidatePassword)` - Compare password with hashed version
- `toPublicJSON()` - Return user data without sensitive fields

**Hooks:**
- Pre-save: Automatically hashes password before saving

### 2. Program Model (`models/Program.js`)

Stores welfare program information.

**Schema:**
```javascript
{
  name: String (required, max 200 chars)
  description: String (required, max 2000 chars)
  type: String (enum: Healthcare, Food Assistance, Housing, etc.)
  agency: String (required)
  location: String (required)
  eligibilityCriteria: {
    minAge: Number
    maxAge: Number
    maxIncome: Number
    minHouseholdSize: Number
    maxHouseholdSize: Number
    employmentStatus: [String]
    requiredDocuments: [String]
    additionalRequirements: [String]
  }
  benefits: {
    type: String (enum: monetary, service, voucher, etc.)
    amount: Number
    frequency: String (enum: one-time, monthly, etc.)
    description: String
  }
  maxBenefit: Number
  applicationProcess: {
    url: String
    steps: [String]
    estimatedTime: String
    contactInfo: {
      phone, email, website: String
    }
  }
  status: String (enum: active, inactive, pending, expired)
  startDate: Date
  endDate: Date
  tags: [String]
  views: Number (default: 0)
  applications: Number (default: 0)
  createdAt: Date (auto)
  updatedAt: Date (auto)
}
```

**Methods:**
- `incrementViews()` - Increment program view count
- `incrementApplications()` - Increment application count

**Static Methods:**
- `searchPrograms(query)` - Full-text search across programs

**Indexes:**
- Text index on name, description, and tags
- Indexes on type, location, status, maxIncome

### 3. EligibilityCheck Model (`models/EligibilityCheck.js`)

Stores user eligibility check history and results.

**Schema:**
```javascript
{
  user: ObjectId (ref: User, required)
  program: ObjectId (ref: Program, required)
  userProfile: {
    age: Number
    householdSize: Number
    annualIncome: Number
    employmentStatus: String
    location: String
  }
  result: {
    isEligible: Boolean (required)
    score: Number (0-100)
    matchedCriteria: [String]
    unmatchedCriteria: [String]
    recommendations: [String]
  }
  status: String (enum: pending, eligible, not-eligible, needs-review)
  applicationStatus: String (enum: not-started, in-progress, submitted, approved, rejected)
  applicationDate: Date
  notes: String
  createdAt: Date (auto)
  updatedAt: Date (auto)
}
```

**Methods:**
- `updateApplicationStatus(status, notes)` - Update application status

**Static Methods:**
- `getUserHistory(userId, limit)` - Get user's eligibility check history
- `getEligiblePrograms(userId)` - Get all eligible programs for user

**Indexes:**
- Compound index on user and program
- Index on user and createdAt
- Index on isEligible and status

## Database Connection

**Configuration:** `config/database.js`

```javascript
import connectDB from './config/database.js'

// In server.js
connectDB()
```

**Connection String:**
```
mongodb://localhost:27017/civicai  // Local
mongodb+srv://user:pass@cluster.mongodb.net/civicai  // Atlas
```

## Usage Examples

### Creating a User

```javascript
import User from './models/User.js'

const user = await User.create({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  password: 'SecurePass123!',
  profile: {
    householdSize: 3,
    annualIncome: 35000,
    employmentStatus: 'employed'
  }
})
```

### Finding Users

```javascript
// Find by email
const user = await User.findOne({ email: 'john@example.com' })

// Find with password (excluded by default)
const user = await User.findOne({ email: 'john@example.com' }).select('+password')

// Find verified users
const users = await User.find({ isEmailVerified: true })
```

### Creating a Program

```javascript
import Program from './models/Program.js'

const program = await Program.create({
  name: 'SNAP Benefits',
  description: 'Food assistance program',
  type: 'Food Assistance',
  agency: 'USDA',
  location: 'Nationwide',
  eligibilityCriteria: {
    maxIncome: 35000,
    minHouseholdSize: 1
  },
  maxBenefit: 250,
  status: 'active'
})
```

### Searching Programs

```javascript
// Text search
const programs = await Program.searchPrograms('food assistance')

// Filter by criteria
const programs = await Program.find({
  type: 'Healthcare',
  status: 'active',
  'eligibilityCriteria.maxIncome': { $gte: 30000 }
})
```

### Creating Eligibility Check

```javascript
import EligibilityCheck from './models/EligibilityCheck.js'

const check = await EligibilityCheck.create({
  user: userId,
  program: programId,
  userProfile: {
    age: 35,
    householdSize: 3,
    annualIncome: 32000,
    employmentStatus: 'employed'
  },
  result: {
    isEligible: true,
    score: 85,
    matchedCriteria: ['Income requirement', 'Household size'],
    unmatchedCriteria: [],
    recommendations: ['Apply within 30 days']
  },
  status: 'eligible'
})
```

### Getting User History

```javascript
// Get last 10 eligibility checks
const history = await EligibilityCheck.getUserHistory(userId, 10)

// Get all eligible programs
const eligible = await EligibilityCheck.getEligiblePrograms(userId)
```

## Database Seeding

Populate the database with initial data:

```bash
npm run seed
```

This creates:
- 5 sample welfare programs
- 2 test users (admin and regular)

## Indexes

Indexes are automatically created when the models are first used. To manually create indexes:

```javascript
await User.createIndexes()
await Program.createIndexes()
await EligibilityCheck.createIndexes()
```

## Validation

Mongoose provides built-in validation:

```javascript
// Required fields
firstName: { type: String, required: [true, 'First name is required'] }

// String length
firstName: { type: String, maxlength: [50, 'Too long'] }

// Enum values
role: { type: String, enum: ['user', 'admin'] }

// Email format
email: { type: String, match: [/regex/, 'Invalid email'] }

// Number ranges
age: { type: Number, min: 0, max: 150 }
```

## Error Handling

Common MongoDB errors:

```javascript
try {
  await user.save()
} catch (error) {
  if (error.code === 11000) {
    // Duplicate key error (e.g., email already exists)
  }
  if (error.name === 'ValidationError') {
    // Validation failed
  }
  if (error.name === 'CastError') {
    // Invalid ObjectId
  }
}
```

## Transactions

For operations that need atomicity:

```javascript
const session = await mongoose.startSession()
session.startTransaction()

try {
  await User.create([userData], { session })
  await EligibilityCheck.create([checkData], { session })
  
  await session.commitTransaction()
} catch (error) {
  await session.abortTransaction()
  throw error
} finally {
  session.endSession()
}
```

## Performance Tips

1. **Use Indexes**: Ensure frequently queried fields are indexed
2. **Select Only Needed Fields**: Use `.select()` to limit returned fields
3. **Pagination**: Use `.limit()` and `.skip()` for large result sets
4. **Lean Queries**: Use `.lean()` for read-only operations
5. **Connection Pooling**: Configured automatically by Mongoose

## Migration from Mock Data

Controllers need to be updated to use MongoDB models instead of mock data:

**Before:**
```javascript
const programs = mockPrograms
```

**After:**
```javascript
import Program from '../models/Program.js'
const programs = await Program.find({ status: 'active' })
```

## Backup and Restore

**Backup:**
```bash
mongodump --uri="mongodb://localhost:27017/civicai" --out=./backup
```

**Restore:**
```bash
mongorestore --uri="mongodb://localhost:27017/civicai" ./backup/civicai
```

## Monitoring

Monitor database performance:
- Use MongoDB Atlas monitoring dashboard
- Check slow queries in logs
- Monitor connection pool usage
- Track index usage

## Next Steps

1. Update all controllers to use MongoDB models
2. Implement proper error handling
3. Add data validation middleware
4. Set up database backups
5. Configure production database
6. Add database monitoring
7. Implement caching layer (Redis)

## Resources

- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [MongoDB Manual](https://docs.mongodb.com/manual/)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
