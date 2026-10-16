import express, { Request, Response, NextFunction } from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import apiRoutes from './routes/api.js'

// Load local configuration file only if environment variables are not set by the hosting provider
if (!process.env.MONGO_URI) {
  dotenv.config({ path: path.resolve('../.env') })
}

const app = express()
const PORT = process.env.PORT || 5000

// Strict whitelist configuration mapping for safe cross-origin requests
const allowedOrigins: string[] = [
  'http://localhost:5173',          // Local Vite development server
  'https://al-devstack.vercel.app', // Production frontend deployment target
]

// Middleware configuration
app.use(
  cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin like mobile apps or curl requests
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS security policies'))
      }
    },
  }),
)
app.use(express.json())

// Global database connection health tracker state flag
let isDatabaseConnected: boolean = false

// Mount routing logic cleanly directly at root level to comply with vercel.json rewrite logic
app.use((req: Request, res: Response, next: NextFunction) => {
  if (!isDatabaseConnected && req.path !== '/health') {
    res.setHeader('Retry-After', '30')
    return res.status(503).json({ error: 'Database Infrastructure Unavailable. Service is warming up.' })
  }
  next()
})
app.use('/api', apiRoutes)

// Database connection initialization leveraging automated retries or graceful fallback handlers
const connectDB = async (): Promise<void> => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI environment variable not found!')
    }
    await mongoose.connect(process.env.MONGO_URI)
    isDatabaseConnected = true
    console.log(' 🛰️ MongoDB Atlas (al-devstack) successfully connected...')
  } catch (error: any) {
    isDatabaseConnected = false
    console.error(' ❌ Database connection error initialized graceful degradation mode:', error.message)
  }
}

connectDB()

// Health Check endpoint for monitoring services (Always active, independent from DB state)
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    database: isDatabaseConnected ? 'CONNECTED' : 'DEGRADED',
    timestamp: new Date(),
  })
})

app.listen(PORT, () => {
  console.log(`🚀 Backend server successfully running on port ${PORT}`)
})
