import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth'

const app = express()
const PORT = process.env.API_PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Routes
app.use('/api/auth', authRoutes)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Start server
app.listen(PORT, () => {
  console.log(`✅ API server running on http://localhost:${PORT}`)
})
