import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import fileUpload from 'express-fileupload'

// Database connection
import connectDB from './config/database.js'

// Import routes
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import programRoutes from './routes/programs.js'
import eligibilityRoutes from './routes/eligibility.js'
import adminRoutes from './routes/admin.js'
import aiRoutes from './routes/ai.js'
import applicationRoutes from './routes/applications.js'
import documentRoutes from './routes/documents.js'
import notificationRoutes from './routes/notifications.js'

// Import middleware
import { errorHandler } from './middleware/errorHandler.js'
import { notFound } from './middleware/notFound.js'

// Load environment variables
dotenv.config()

// Connect to MongoDB
connectDB()

const app = express()
const PORT = process.env.PORT || 8000

// Security middleware
app.use(helmet())

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000'
  ],
  credentials: true
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: { success: false, error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests from this IP, please try again later.'
    })
  }
})
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CivicAI Welfare Backend Running'
  })
})
app.use('/api/', limiter)

// Logging
app.use(morgan('combined'))

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// File upload middleware
app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max file size
  abortOnLimit: true,
  createParentPath: true,
}))

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'CivicAI Backend is running',
    timestamp: new Date().toISOString(),
    version: process.env.API_VERSION || 'v1'
  })
})

// API routes
const apiVersion = process.env.API_VERSION || 'v1'
app.use(`/api/${apiVersion}/auth`, authRoutes)
app.use(`/api/${apiVersion}/users`, userRoutes)
app.use(`/api/${apiVersion}/programs`, programRoutes)
app.use(`/api/${apiVersion}/eligibility`, eligibilityRoutes)
app.use(`/api/${apiVersion}/admin`, adminRoutes)
app.use(`/api/${apiVersion}/ai`, aiRoutes)
app.use(`/api/${apiVersion}/applications`, applicationRoutes)
app.use(`/api/${apiVersion}/documents`, documentRoutes)
app.use(`/api/${apiVersion}/notifications`, notificationRoutes)

// 404 handler
app.use(notFound)

// Error handling middleware
app.use(errorHandler)

// Start server
app.listen(PORT, () => {
  console.log(`🚀 CivicAI Backend running on port ${PORT}`)
  console.log(`📊 Environment: ${process.env.NODE_ENV}`)
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api/${apiVersion}`)
  console.log(`💚 Health Check: http://localhost:${PORT}/health`)
})

export default app