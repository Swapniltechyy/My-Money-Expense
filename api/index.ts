import express from 'express'
import cors from 'cors'
import authRoutes from '../server/routes/auth.js'

const app = express()

// Middleware
app.use(cors())
app.use(express.json())

// Routes
app.use('/api/auth', authRoutes)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handler (ensures API always returns JSON)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('API Error:', err)
  res.status(500).json({ error: err?.message || 'Internal server error' })
})

export default app
