import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../src/generated/prisma/client.js'
import { signToken, requireAuth, type AuthRequest } from '../middleware/auth'
import { generateOtp, sendOtpEmail } from '../lib/mailer'

const router = Router()
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const SALT_ROUNDS = 10
const OTP_EXPIRY_MINUTES = 10

/**
 * POST /api/auth/register
 * Body: { name: string, email: string, password: string }
 * Creates a new user and returns a JWT.
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Name is required.' })
      return
    }
    if (!email || typeof email !== 'string' || !email.trim()) {
      res.status(400).json({ error: 'Email is required.' })
      return
    }
    const trimmedEmail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      res.status(400).json({ error: 'Enter a valid email address.' })
      return
    }
    if (!password || typeof password !== 'string' || password.length < 4) {
      res.status(400).json({ error: 'Password must be at least 4 characters.' })
      return
    }

    const trimmedName = name.trim()

    // Check if user already exists (case-insensitive)
    const existingName = await prisma.user.findFirst({
      where: { name: { equals: trimmedName, mode: 'insensitive' } },
    })
    if (existingName) {
      res.status(409).json({ error: 'That name is already registered. Sign in instead.' })
      return
    }

    const existingEmail = await prisma.user.findFirst({
      where: { email: { equals: trimmedEmail, mode: 'insensitive' } },
    })
    if (existingEmail) {
      res.status(409).json({ error: 'That email is already registered. Sign in instead.' })
      return
    }

    // Hash password with bcrypt
    const salt = await bcrypt.genSalt(SALT_ROUNDS)
    const passwordHash = await bcrypt.hash(password, salt)

    const user = await prisma.user.create({
      data: {
        name: trimmedName,
        email: trimmedEmail,
        passwordHash,
        salt,
      },
    })

    // Create default app settings for the new user
    await prisma.appSettings.create({
      data: { userId: user.id },
    })

    const token = signToken(user.id)

    res.status(201).json({
      token,
      user: { id: user.id, name: user.name },
    })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ error: 'Could not create account.' })
  }
})

/**
 * POST /api/auth/login
 * Body: { name: string, password: string }
 * Verifies credentials and returns a JWT.
 */
router.post('/login', async (req, res) => {
  try {
    const { name, password } = req.body

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Name is required.' })
      return
    }
    if (!password || typeof password !== 'string') {
      res.status(400).json({ error: 'Password is required.' })
      return
    }

    const trimmedName = name.trim()

    // Find user (case-insensitive)
    const user = await prisma.user.findFirst({
      where: { name: { equals: trimmedName, mode: 'insensitive' } },
    })
    if (!user) {
      res.status(401).json({ error: 'Name or password is incorrect.' })
      return
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      res.status(401).json({ error: 'Name or password is incorrect.' })
      return
    }

    const token = signToken(user.id)

    res.json({
      token,
      user: { id: user.id, name: user.name },
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Could not sign in.' })
  }
})

/**
 * GET /api/auth/me
 * Requires Bearer token.
 * Returns the authenticated user's info.
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthRequest
    const user = await prisma.user.findUnique({
      where: { id: authReq.userId },
      select: { id: true, name: true, createdAt: true },
    })
    if (!user) {
      res.status(404).json({ error: 'User not found.' })
      return
    }
    res.json({ user })
  } catch (err) {
    console.error('Me error:', err)
    res.status(500).json({ error: 'Could not fetch user.' })
  }
})

// ─── Forgot Password Flow ────────────────────────────────────────────────────

/**
 * POST /api/auth/forgot-password
 * Body: { email: string }
 * Generates a 6-digit OTP, stores it in DB, and sends it via email.
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body

    if (!email || typeof email !== 'string' || !email.trim()) {
      res.status(400).json({ error: 'Email is required.' })
      return
    }

    const trimmedEmail = email.trim().toLowerCase()

    // Check if user exists
    const user = await prisma.user.findFirst({
      where: { email: { equals: trimmedEmail, mode: 'insensitive' } },
    })
    if (!user) {
      // Don't reveal whether email exists — still return success
      res.json({ message: 'If an account exists with that email, an OTP has been sent.' })
      return
    }

    // Invalidate any existing unused OTPs for this email
    await prisma.otp.updateMany({
      where: { email: trimmedEmail, used: false },
      data: { used: true },
    })

    // Generate and store new OTP
    const code = generateOtp()
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

    await prisma.otp.create({
      data: {
        email: trimmedEmail,
        code,
        expiresAt,
      },
    })

    // Send OTP via email
    await sendOtpEmail(trimmedEmail, code)

    res.json({ message: 'If an account exists with that email, an OTP has been sent.' })
  } catch (err) {
    console.error('Forgot password error:', err)
    res.status(500).json({ error: 'Could not send OTP. Please try again.' })
  }
})

/**
 * POST /api/auth/verify-otp
 * Body: { email: string, code: string }
 * Verifies that the OTP is valid and not expired.
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, code } = req.body

    if (!email || !code) {
      res.status(400).json({ error: 'Email and OTP code are required.' })
      return
    }

    const trimmedEmail = email.trim().toLowerCase()
    const trimmedCode = code.trim()

    const otp = await prisma.otp.findFirst({
      where: {
        email: trimmedEmail,
        code: trimmedCode,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!otp) {
      res.status(400).json({ error: 'Invalid or expired OTP. Please request a new one.' })
      return
    }

    res.json({ valid: true })
  } catch (err) {
    console.error('Verify OTP error:', err)
    res.status(500).json({ error: 'Could not verify OTP.' })
  }
})

/**
 * POST /api/auth/reset-password
 * Body: { email: string, code: string, newPassword: string }
 * Re-verifies the OTP, then updates the user's password.
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body

    if (!email || !code || !newPassword) {
      res.status(400).json({ error: 'Email, OTP code, and new password are required.' })
      return
    }
    if (typeof newPassword !== 'string' || newPassword.length < 4) {
      res.status(400).json({ error: 'Password must be at least 4 characters.' })
      return
    }

    const trimmedEmail = email.trim().toLowerCase()
    const trimmedCode = code.trim()

    // Re-verify OTP
    const otp = await prisma.otp.findFirst({
      where: {
        email: trimmedEmail,
        code: trimmedCode,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!otp) {
      res.status(400).json({ error: 'Invalid or expired OTP. Please request a new one.' })
      return
    }

    // Find the user
    const user = await prisma.user.findFirst({
      where: { email: { equals: trimmedEmail, mode: 'insensitive' } },
    })
    if (!user) {
      res.status(404).json({ error: 'User not found.' })
      return
    }

    // Hash new password
    const salt = await bcrypt.genSalt(SALT_ROUNDS)
    const passwordHash = await bcrypt.hash(newPassword, salt)

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, salt },
    })

    // Mark OTP as used
    await prisma.otp.update({
      where: { id: otp.id },
      data: { used: true },
    })

    res.json({ message: 'Password has been reset. You can now sign in.' })
  } catch (err) {
    console.error('Reset password error:', err)
    res.status(500).json({ error: 'Could not reset password.' })
  }
})

export default router
