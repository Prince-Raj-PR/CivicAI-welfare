# 🚀 Quick Start: Admin Dashboard & Program Import

## TL;DR - Get Started in 3 Steps

```bash
# 1. Create admin user
cd backend
node src/scripts/createAdmin.js

# 2. Start the application (if not already running)
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev

# 3. Login and import programs
# - Go to http://localhost:3000/login
# - Login with: admin@civicai.com / Admin@123456
# - Click "Admin" in header
# - Click "📥 Import Programs"
```

## What You Get

### 8 Federal Welfare Programs
- ✅ SNAP (Food Assistance) - $250/month
- ✅ Medicaid (Healthcare) - Full coverage
- ✅ Section 8 (Housing) - $1,200/month
- ✅ TANF (Financial Aid) - $500/month
- ✅ WIC (Women/Infants/Children) - $150/month
- ✅ LIHEAP (Energy Assistance) - $600/year
- ✅ SSI (Supplemental Security) - $914/month
- ✅ CCDF (Child Care) - $800/month

### Admin Dashboard Features
- 📊 **Statistics** - Programs, users, eligibility checks
- 📥 **One-Click Import** - Import all programs instantly
- 📝 **Activity Log** - Recent system activity
- 🔒 **Secure Access** - Admin-only features

## Default Admin Credentials

```
Email: admin@civicai.com
Password: Admin@123456
```

⚠️ **Change the password after first login!**

## Custom Admin User

To create a custom admin user, set environment variables:

```bash
# In backend/.env
ADMIN_EMAIL=your-email@example.com
ADMIN_PASSWORD=YourSecurePassword123!

# Then run
node src/scripts/createAdmin.js
```

## Make Existing User Admin

```bash
# Connect to MongoDB
mongosh civicai

# Update user role
db.users.updateOne(
  { email: "user@example.com" },
  { $set: { role: "admin", isEmailVerified: true } }
)
```

## Verify Import Success

### Check MongoDB
```bash
mongosh civicai
db.programs.find().count()  # Should show 8
db.programs.find({}, { name: 1, agency: 1 })
```

### Check API
```bash
curl http://localhost:8000/api/v1/programs
```

### Check Frontend
Navigate to http://localhost:3000/programs

## Troubleshooting

### "Admin link not showing"
**Solution**: Logout and login again to refresh the token

### "Access denied"
**Solution**: Verify user has `role: "admin"` in database

### "Import fails"
**Solution**: 
1. Check MongoDB is running
2. Check backend logs for errors
3. Verify axios is installed: `npm list axios`

## API Testing

### Import Programs
```bash
# Get admin token first (login)
TOKEN="your-jwt-token"

# Import programs
curl -X POST http://localhost:8000/api/v1/admin/programs/import \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

### Get Statistics
```bash
curl http://localhost:8000/api/v1/admin/stats \
  -H "Authorization: Bearer $TOKEN"
```

## Next Steps

1. ✅ Import programs via admin dashboard
2. ✅ Browse programs at `/programs`
3. ✅ Test eligibility checking
4. ✅ View activity logs
5. ✅ Monitor statistics

## Need Help?

- 📖 Full Guide: [PROGRAM_IMPORT_GUIDE.md](PROGRAM_IMPORT_GUIDE.md)
- 📋 Complete Summary: [GOVERNMENT_PROGRAM_IMPORT_COMPLETE.md](GOVERNMENT_PROGRAM_IMPORT_COMPLETE.md)
- 📚 Main README: [README.md](README.md)

---

**Ready to go!** 🎉 Your admin dashboard is fully functional and ready to import government programs.
