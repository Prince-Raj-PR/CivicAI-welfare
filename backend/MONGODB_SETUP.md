# MongoDB Setup Guide for CivicAI

This guide will help you set up MongoDB for the CivicAI backend application.

## Option 1: MongoDB Atlas (Cloud - Recommended for Production)

MongoDB Atlas is a fully managed cloud database service. It's free for development and easy to set up.

### Steps:

1. **Create an Account**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Click "Try Free" and create an account
   - Verify your email address

2. **Create a Cluster**
   - Click "Build a Database"
   - Choose "FREE" tier (M0 Sandbox)
   - Select your preferred cloud provider and region
   - Click "Create Cluster"

3. **Create Database User**
   - Go to "Database Access" in the left sidebar
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Username: `civicai_user`
   - Password: Generate a secure password (save it!)
   - Database User Privileges: "Read and write to any database"
   - Click "Add User"

4. **Configure Network Access**
   - Go to "Network Access" in the left sidebar
   - Click "Add IP Address"
   - For development: Click "Allow Access from Anywhere" (0.0.0.0/0)
   - For production: Add your server's specific IP address
   - Click "Confirm"

5. **Get Connection String**
   - Go to "Database" in the left sidebar
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - It looks like: `mongodb+srv://civicai_user:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`

6. **Update .env File**
   ```env
   MONGODB_URI=mongodb+srv://civicai_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/civicai?retryWrites=true&w=majority
   ```
   - Replace `YOUR_PASSWORD` with your actual password
   - Replace `cluster0.xxxxx` with your actual cluster address
   - Add `/civicai` before the `?` to specify the database name

## Option 2: Local MongoDB Installation

For local development, you can install MongoDB on your machine.

### macOS Installation:

```bash
# Install using Homebrew
brew tap mongodb/brew
brew install mongodb-community@7.0

# Start MongoDB service
brew services start mongodb-community@7.0

# Verify installation
mongosh --version
```

### Windows Installation:

1. Download MongoDB Community Server from [MongoDB Download Center](https://www.mongodb.com/try/download/community)
2. Run the installer (.msi file)
3. Choose "Complete" installation
4. Install MongoDB as a Service
5. Install MongoDB Compass (GUI tool) when prompted

### Linux (Ubuntu) Installation:

```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# Create list file
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update package database
sudo apt-get update

# Install MongoDB
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod

# Enable MongoDB to start on boot
sudo systemctl enable mongod
```

### Local MongoDB Configuration:

Update your `.env` file:
```env
MONGODB_URI=mongodb://localhost:27017/civicai
```

## Database Seeding

After setting up MongoDB, seed the database with initial data:

```bash
cd backend
npm run seed
```

This will:
- Clear existing data
- Insert 5 sample welfare programs
- Create 2 test users (1 admin, 1 regular user)

### Test Credentials:
- **Admin**: admin@civicai.com / Admin123!
- **User**: john.doe@example.com / Test123!

## Verify Connection

1. **Start the backend server:**
   ```bash
   npm run dev
   ```

2. **Check the console output:**
   You should see:
   ```
   ✅ MongoDB Connected: cluster0.xxxxx.mongodb.net
   🚀 CivicAI Backend running on port 8000
   ```

3. **Test the health endpoint:**
   ```bash
   curl http://localhost:8000/health
   ```

4. **Test the programs endpoint:**
   ```bash
   curl http://localhost:8000/api/v1/programs
   ```

## MongoDB Compass (GUI Tool)

MongoDB Compass is a free GUI tool for MongoDB:

1. Download from [MongoDB Compass](https://www.mongodb.com/products/compass)
2. Install and open
3. Connect using your connection string
4. Browse collections: `users`, `programs`, `eligibilitychecks`

## Common Issues

### Issue: "MongoServerError: bad auth"
**Solution**: Check your username and password in the connection string

### Issue: "MongooseServerSelectionError: connect ECONNREFUSED"
**Solution**: 
- For Atlas: Check network access settings
- For Local: Ensure MongoDB service is running

### Issue: "MongoParseError: Invalid connection string"
**Solution**: Ensure your connection string is properly formatted and URL-encoded

### Issue: Connection timeout
**Solution**: 
- Check your internet connection
- Verify IP whitelist in Atlas
- Check firewall settings

## Database Collections

The application uses three main collections:

1. **users** - User accounts and profiles
2. **programs** - Welfare programs information
3. **eligibilitychecks** - User eligibility check history

## Environment Variables

Required MongoDB-related environment variables in `.env`:

```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/civicai

# Optional: Connection pool settings
MONGODB_MAX_POOL_SIZE=10
MONGODB_MIN_POOL_SIZE=2
```

## Production Considerations

For production deployment:

1. **Use MongoDB Atlas** with a paid tier for better performance
2. **Enable authentication** and use strong passwords
3. **Restrict IP access** to your server's IP only
4. **Enable backup** in Atlas settings
5. **Monitor performance** using Atlas monitoring tools
6. **Use connection pooling** for better performance
7. **Enable SSL/TLS** for secure connections
8. **Set up alerts** for database issues

## Backup and Restore

### Atlas Backup:
- Automatic backups are enabled by default
- Configure backup schedule in Atlas dashboard

### Local Backup:
```bash
# Backup
mongodump --uri="mongodb://localhost:27017/civicai" --out=./backup

# Restore
mongorestore --uri="mongodb://localhost:27017/civicai" ./backup/civicai
```

## Additional Resources

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [MongoDB University](https://university.mongodb.com/) - Free courses

## Support

If you encounter issues:
1. Check the MongoDB logs
2. Review the connection string format
3. Verify network access settings
4. Consult the MongoDB documentation
5. Contact the development team

---

**Note**: Never commit your `.env` file with real credentials to version control!
