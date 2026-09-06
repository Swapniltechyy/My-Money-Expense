import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

/**
 * Generate a random 6-digit OTP code.
 */
export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Send a password reset OTP email.
 */
export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const from = process.env.SMTP_USER || 'noreply@mymoney.app'

  await transporter.sendMail({
    from: `"My Money" <${from}>`,
    to,
    subject: 'Password Reset — My Money',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <h2 style="color: #1a1a2e; margin: 0 0 8px;">Password Reset</h2>
        <p style="color: #555; font-size: 15px; line-height: 1.5; margin: 0 0 24px;">
          Use the code below to reset your <strong>My Money</strong> password. This code expires in <strong>10 minutes</strong>.
        </p>
        <div style="background: #f0f4ff; border-radius: 12px; padding: 20px; text-align: center; margin: 0 0 24px;">
          <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #4f46e5;">${code}</span>
        </div>
        <p style="color: #888; font-size: 13px; line-height: 1.4; margin: 0;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  })
}
