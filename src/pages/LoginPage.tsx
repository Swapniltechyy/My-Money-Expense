import { useState, type FormEvent } from 'react'
import { IconEye, IconEyeOff } from '../components/Icons'
import { createAccount, login, forgotPassword, verifyOtp, resetPassword } from '../lib/auth'

type AuthMode = 'login' | 'create' | 'forgot-email' | 'forgot-otp' | 'forgot-reset'

export function LoginPage({ onSuccess }: { onSuccess: () => void }) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [otp, setOtp] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  // Email used during forgot flow (locked after OTP is sent)
  const [resetEmail, setResetEmail] = useState('')

  function switchMode(next: AuthMode) {
    setMode(next)
    setError('')
    setNotice('')
    setPassword('')
    setConfirm('')
    setOtp('')
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setNotice('')
    setBusy(true)

    try {
      // ─── Login ──────────────────────────────────────
      if (mode === 'login') {
        const trimmed = name.trim()
        if (!trimmed) { setError('Enter your name.'); return }
        if (password.length < 4) { setError('Password must be at least 4 characters.'); return }
        await login(trimmed, password)
        onSuccess()
        return
      }

      // ─── Register ───────────────────────────────────
      if (mode === 'create') {
        const trimmed = name.trim()
        if (!trimmed) { setError('Enter your name.'); return }
        if (!email.trim()) { setError('Enter your email.'); return }
        if (password.length < 4) { setError('Password must be at least 4 characters.'); return }
        if (password !== confirm) { setError('Passwords do not match.'); return }
        await createAccount(trimmed, email.trim(), password)
        onSuccess()
        return
      }

      // ─── Forgot: Enter email ────────────────────────
      if (mode === 'forgot-email') {
        const trimmedEmail = email.trim()
        if (!trimmedEmail) { setError('Enter your email address.'); return }
        await forgotPassword(trimmedEmail)
        setResetEmail(trimmedEmail)
        setNotice('If an account exists with that email, a 6-digit code has been sent.')
        setMode('forgot-otp')
        return
      }

      // ─── Forgot: Enter OTP ─────────────────────────
      if (mode === 'forgot-otp') {
        const trimmedCode = otp.trim()
        if (trimmedCode.length !== 6) { setError('Enter the 6-digit code from your email.'); return }
        await verifyOtp(resetEmail, trimmedCode)
        setNotice('Code verified! Set your new password.')
        setMode('forgot-reset')
        return
      }

      // ─── Forgot: New password ──────────────────────
      if (mode === 'forgot-reset') {
        if (password.length < 4) { setError('Password must be at least 4 characters.'); return }
        if (password !== confirm) { setError('Passwords do not match.'); return }
        const msg = await resetPassword(resetEmail, otp.trim(), password)
        setNotice(msg)
        setPassword('')
        setConfirm('')
        setOtp('')
        setMode('login')
        return
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not continue.')
    } finally {
      setBusy(false)
    }
  }

  // ─── Determine UI labels ──────────────────────────────────────────────────
  const isLoginTab = mode === 'login'
  const isCreateTab = mode === 'create'
  const isForgot = mode.startsWith('forgot')

  const submitLabel = {
    login: 'Login',
    create: 'Register',
    'forgot-email': 'Send OTP',
    'forgot-otp': 'Verify Code',
    'forgot-reset': 'Reset Password',
  }[mode]

  const heading = isForgot
    ? mode === 'forgot-email'
      ? 'Forgot Password'
      : mode === 'forgot-otp'
        ? 'Enter OTP'
        : 'New Password'
    : undefined

  return (
    <div className="login-page">
      <header className="login-hero">
        <p className="kicker login-kicker">Welcome</p>
        <h1>My Money</h1>
        <p>Simple monthly budgeting, in one place.</p>
      </header>

      <form className="card login-card" onSubmit={submit}>
        {/* Tab bar — hidden during forgot flow */}
        {!isForgot ? (
          <div className="login-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={isLoginTab}
              className={isLoginTab ? 'active' : ''}
              onClick={() => switchMode('login')}
            >
              Login
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isCreateTab}
              className={isCreateTab ? 'active' : ''}
              onClick={() => switchMode('create')}
            >
              Register
            </button>
          </div>
        ) : (
          <div className="login-forgot-header">
            <h2>{heading}</h2>
            <button
              type="button"
              className="text-link"
              onClick={() => switchMode('login')}
            >
              ← Back to Login
            </button>
          </div>
        )}

        {/* ─── Login mode ──────────────────────────── */}
        {isLoginTab ? (
          <>
            <label className="login-line">
              <input
                autoFocus
                autoComplete="username"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <div className="login-secret">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="login-eye"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
              </button>
            </div>
            <p className="login-forgot">
              <button type="button" className="text-link" onClick={() => switchMode('forgot-email')}>
                Forgot password?
              </button>
            </p>
          </>
        ) : null}

        {/* ─── Register mode ───────────────────────── */}
        {isCreateTab ? (
          <>
            <label className="login-line">
              <input
                autoFocus
                autoComplete="username"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="login-line">
              <input
                type="email"
                autoComplete="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <div className="login-secret">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="login-eye"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
              </button>
            </div>
            <div className="login-secret">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Confirm password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
          </>
        ) : null}

        {/* ─── Forgot: email step ──────────────────── */}
        {mode === 'forgot-email' ? (
          <label className="login-line">
            <input
              autoFocus
              type="email"
              autoComplete="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
        ) : null}

        {/* ─── Forgot: OTP step ────────────────────── */}
        {mode === 'forgot-otp' ? (
          <label className="login-line">
            <input
              autoFocus
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              placeholder="Enter 6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              style={{ textAlign: 'center', letterSpacing: '6px', fontSize: '1.3rem', fontWeight: 600 }}
            />
          </label>
        ) : null}

        {/* ─── Forgot: new password step ───────────── */}
        {mode === 'forgot-reset' ? (
          <>
            <div className="login-secret">
              <input
                autoFocus
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="login-eye"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
              </button>
            </div>
            <div className="login-secret">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
          </>
        ) : null}

        {error ? <p className="error">{error}</p> : null}
        {notice ? <p className="login-notice">{notice}</p> : null}

        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? 'Please wait…' : submitLabel}
        </button>
      </form>
    </div>
  )
}
