import { useState, type FormEvent } from 'react'
import { IconEye, IconEyeOff } from '../components/Icons'
import { accountExists, createAccount, hasAccount, login, resetPassword } from '../lib/auth'

type AuthMode = 'login' | 'create' | 'reset'

export function LoginPage({ onSuccess }: { onSuccess: () => void }) {
  const registered = hasAccount()
  const [mode, setMode] = useState<AuthMode>(registered ? 'login' : 'create')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  function switchMode(next: AuthMode) {
    if (next === 'login' && !hasAccount()) {
      setError('Register first to create an account.')
      setMode('create')
      return
    }
    setMode(next)
    setError('')
    setNotice('')
    setPassword('')
    setConfirm('')
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Enter your name.')
      return
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters.')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      if (mode === 'create') {
        if (password !== confirm) {
          setError('Passwords do not match.')
          return
        }
        await createAccount(trimmed, password)
        onSuccess()
        return
      }
      if (mode === 'reset') {
        if (password !== confirm) {
          setError('Passwords do not match.')
          return
        }
        await resetPassword(trimmed, password)
        setMode('login')
        setPassword('')
        setConfirm('')
        setName(trimmed)
        setNotice('Password updated. Sign in with your new password.')
        return
      }
      if (!hasAccount() || !accountExists(trimmed)) {
        setError('Register first to create an account.')
        setMode('create')
        return
      }
      const ok = await login(trimmed, password)
      if (!ok) {
        setError('Name or password is incorrect.')
        return
      }
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not continue.')
    } finally {
      setBusy(false)
    }
  }

  const tab = mode === 'create' ? 'create' : 'login'
  const submitLabel = mode === 'create' ? 'Register' : mode === 'reset' ? 'Reset password' : 'Login'

  return (
    <div className="login-page">
      <header className="login-hero">
        <p className="kicker login-kicker">Welcome</p>
        <h1>My Money</h1>
        <p>Simple monthly budgeting, in one place.</p>
      </header>

      <form className="card login-card" onSubmit={submit}>
        <div className="login-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'login'}
            className={tab === 'login' ? 'active' : ''}
            onClick={() => switchMode('login')}
          >
            Login
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'create'}
            className={tab === 'create' ? 'active' : ''}
            onClick={() => switchMode('create')}
          >
            Register
          </button>
        </div>

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
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            placeholder={mode === 'reset' ? 'Enter new password' : 'Enter password'}
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

        {mode === 'login' ? (
          <p className="login-forgot">
            <button type="button" className="text-link" onClick={() => switchMode('reset')}>
              Forgot password?
            </button>
          </p>
        ) : null}

        {mode === 'create' || mode === 'reset' ? (
          <div className="login-secret">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
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
