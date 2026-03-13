import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'

// Import routes
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import programRoutes from './routes/programs.js'
import eligibilityRoutes from './routes/eligibility.js'
import testRoutes from './routes/test.js'

// Import middleware
import { errorHandler } from './middleware/errorHandler.js'
import { notFound } from './middleware/notFound.js'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 8000

// Security middleware
app.use(helmet())

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
})
app.use('/api/', limiter)

// Logging
app.use(morgan('combined'))

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

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

// Test routes (remove in production)
if (process.env.NODE_ENV === 'development') {
  app.use(`/api/${apiVersion}/test`, testRoutes)
}

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