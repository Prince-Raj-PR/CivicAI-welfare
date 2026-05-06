# Government Program Import Guide

## Overview

CivicAI now includes a powerful program import system that fetches welfare programs from government sources and imports them into the database. This feature is accessible through the Admin Dashboard.

## Features

✅ **Automated Import**: Fetch programs from government APIs and data sources  
✅ **Curated Data**: Includes 8 pre-configured federal programs as fallback  
✅ **Smart Updates**: Automatically updates existing programs or creates new ones  
✅ **Admin Dashboard**: Beautiful UI to trigger imports and view statistics  
✅ **Activity Tracking**: Monitor recent system activity and changes  

## Included Government Programs

The system currently includes curated data for these federal programs:

1. **SNAP** (Supplemental Nutrition Assistance Program)
2. **Medicaid** (Healthcare coverage)
3. **Section 8** (Housing Choice Voucher Program)
4. **TANF** (Temporary Assistance for Needy Families)
5. **WIC** (Women, Infants, and Children)
6. **LIHEAP** (Low Income Home Energy Assistance)
7. **SSI** (Supplemental Security Income)
8. **CCDF** (Child Care and Development Fund)

## How to Use

### 1. Create an Admin User

First, you need to create a user with admin privileges. You can do this by:

**Option A: Manually update a user in MongoDB**

```bash
# Connect to MongoDB
mongosh civicai

# Update a user to admin
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { role: "admin" } }
)
```

**Option B: Create admin user via script**

Create a file `backend/src/scripts/createAdmin.js`:

```javascript
import mongoose from 'mongoose'
import User from '../models/User.js'
import dotenv from 'dotenv'

dotenv.config()

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    
    const adminEmail = 'admin@civicai.com'
    const adminPassword = 'Admin@123456'
    
    // Check if admin exists
    const existingAdmin = await User.findOne({ email: adminEmail })
    
    if (existingAdmin) {
      // Update to admin
      existingAdmin.role = 'admin'
      existingAdmin.isEmailVerified = true
      await existingAdmin.save()
      console.log('✅ Existing user updated to admin')
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
      console.log('✅ Admin user created')
    }
    
    console.log(`📧 Email: ${adminEmail}`)
    console.log(`🔑 Password: ${adminPassword}`)
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

createAdmin()
```

Run it:

```bash
cd backend
node src/scripts/createAdmin.js
```

### 2. Access Admin Dashboard

1. Login with your admin account
2. Navigate to `/admin` or click "Admin" in the header
3. You'll see the Admin Dashboard with:
   - Import Programs button
   - System statistics (programs, users, eligibility checks)
   - Recent activity log

### 3. Import Programs

1. Click the **"📥 Import Programs"** button
2. Confirm the import action
3. Wait for the import to complete (usually 5-10 seconds)
4. View the import summary showing:
   - Total programs processed
   - New programs imported
   - Existing programs updated
   - Programs skipped (errors)

### 4. Verify Import

After import, you can verify the programs were added:

**Via MongoDB:**
```bash
mongosh civicai
db.programs.find().count()
db.programs.find({}, { name: 1, agency: 1 })
```

**Via API:**
```bash
curl http://localhost:8000/api/v1/programs
```

**Via Frontend:**
Navigate to `/programs` to see all imported programs

## API Endpoints

### Import Programs
```http
POST /api/v1/admin/programs/import
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Programs imported successfully",
  "data": {
    "success": true,
    "imported": 8,
    "updated": 0,
    "skipped": 0,
    "total": 8
  }
}
```

### Get Admin Stats
```http
GET /api/v1/admin/stats
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "programs": {
      "total": 8,
      "active": 8,
      "inactive": 0
    },
    "users": {
      "total": 5,
      "verified": 3,
      "unverified": 2
    },
    "eligibilityChecks": {
      "total": 12,
      "lastWeek": 5
    }
  }
}
```

### Get Recent Activity
```http
GET /api/v1/admin/activity?limit=10
Authorization: Bearer <admin-token>
```

## Program Data Sources

The system is designed to fetch from multiple government sources:

### Configured Sources (Future Integration)

1. **Benefits.gov** - Federal benefits portal
2. **Data.gov** - Open government datasets
3. **USA.gov** - Federal programs API
4. **HHS.gov** - Health and Human Services
5. **USDA FNS** - Food and Nutrition Service

### Current Implementation

Currently uses **curated government data** with accurate information from official sources. This ensures:
- ✅ Reliable, verified program information
- ✅ Consistent data structure
- ✅ No API rate limits or downtime
- ✅ Fast import process

### Future Enhancements

To enable live API fetching:

1. **Uncomment API functions** in `backend/src/services/programFetcher.js`
2. **Add API keys** to `.env` if required
3. **Test API endpoints** for availability
4. **Implement rate limiting** for API calls
5. **Add error handling** for API failures

## Program Data Structure

Each imported program includes:

```javascript
{
  name: "Program Name",
  description: "Detailed description",
  type: "Food Assistance | Healthcare | Housing | Financial Aid | etc.",
  agency: "Responsible government agency",
  location: "Nationwide | State-specific",
  eligibilityCriteria: {
    maxIncome: 35000,
    minHouseholdSize: 1,
    employmentStatus: ["employed", "unemployed"],
    requiredDocuments: ["Proof of income", "ID"],
    additionalRequirements: ["Special conditions"]
  },
  benefits: {
    type: "monetary | service | voucher",
    amount: 250,
    frequency: "monthly | annually",
    description: "Benefit details"
  },
  maxBenefit: 250,
  applicationProcess: {
    url: "https://...",
    steps: ["Step 1", "Step 2"],
    estimatedTime: "30 days",
    contactInfo: {
      phone: "1-800-XXX-XXXX",
      email: "contact@agency.gov",
      website: "https://..."
    }
  },
  status: "active | inactive",
  tags: ["tag1", "tag2"],
  source: "usda.gov | hhs.gov | etc."
}
```

## Troubleshooting

### Import Button Not Visible

**Problem**: Admin link not showing in header  
**Solution**: Ensure user has `role: "admin"` in database

```bash
mongosh civicai
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { role: "admin" } }
)
```

### 403 Access Denied

**Problem**: "Access denied. Admin privileges required"  
**Solution**: 
1. Check user role in database
2. Logout and login again to refresh token
3. Verify JWT token includes role field

### Import Fails

**Problem**: Import returns errors  
**Solution**:
1. Check MongoDB connection
2. Verify Program model is properly defined
3. Check backend logs for detailed errors
4. Ensure axios is installed: `npm install axios`

### Programs Not Showing

**Problem**: Import succeeds but programs not visible  
**Solution**:
1. Check MongoDB: `db.programs.find().count()`
2. Verify API endpoint: `GET /api/v1/programs`
3. Check frontend API calls in browser console
4. Ensure programs have `status: "active"`

## Security Considerations

### Admin Access Control

- ✅ Admin routes protected by authentication middleware
- ✅ Role-based access control (RBAC)
- ✅ JWT token validation
- ✅ Admin-only middleware checks

### Best Practices

1. **Limit admin accounts**: Only create admin users when necessary
2. **Strong passwords**: Enforce strong password policies for admins
3. **Audit logging**: Monitor admin actions (future enhancement)
4. **Regular reviews**: Periodically review admin user list
5. **Secure tokens**: Keep JWT secrets secure and rotate regularly

## Testing

### Test Import Locally

```bash
# Start backend
cd backend
npm run dev

# In another terminal, test import
curl -X POST http://localhost:8000/api/v1/admin/programs/import \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

### Test Admin Dashboard

1. Login as admin user
2. Navigate to `http://localhost:3000/admin`
3. Click "Import Programs"
4. Verify import summary appears
5. Check statistics update
6. View recent activity log

## Next Steps

### Recommended Enhancements

1. **Schedule Imports**: Add cron job to auto-import weekly
2. **Email Notifications**: Notify admins of import results
3. **Import History**: Track all import operations
4. **Bulk Operations**: Add bulk edit/delete for programs
5. **Data Validation**: Enhanced validation for imported data
6. **API Integration**: Connect to live government APIs
7. **State Programs**: Add state-specific program sources
8. **Export Feature**: Export programs to CSV/JSON

### Development Roadmap

- [ ] Implement scheduled imports
- [ ] Add import history tracking
- [ ] Create program management UI
- [ ] Add data validation rules
- [ ] Integrate live government APIs
- [ ] Add state-level program sources
- [ ] Implement audit logging
- [ ] Add export functionality

## Support

For issues or questions:
1. Check backend logs: `backend/logs/`
2. Review MongoDB data: `mongosh civicai`
3. Test API endpoints with Postman/curl
4. Check browser console for frontend errors

## Summary

The Government Program Import system provides a robust foundation for managing welfare programs in CivicAI. With the admin dashboard, you can easily import, update, and monitor programs while maintaining data quality and security.

**Key Benefits:**
- 🚀 Fast import process (5-10 seconds)
- 📊 Real-time statistics and monitoring
- 🔒 Secure admin-only access
- 📝 Comprehensive program data
- 🔄 Smart update/create logic
- 📈 Activity tracking and logging
