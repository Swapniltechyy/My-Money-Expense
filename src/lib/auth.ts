import { TOKEN_KEY } from '../constants'

/**
 * JWT-based auth module.
 * All authentication is done against the database via the API server.
 * Only the JWT token string is stored in localStorage.
 */

interface AuthResponse {
  token: string
  user: { id: string; name: string }
}

interface ApiError {
  error: string
}

async function authFetch<T>(url: string, body: object): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error((data as ApiError).error || 'Request failed.')
  }
  return data as T
}

/** Get the stored JWT token, or null if not logged in. */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

/** Check if a JWT token exists in localStorage. */
export function isLoggedIn(): boolean {
  return Boolean(getToken())
}

/**
 * Register a new account.
 * Calls the API, stores the JWT in localStorage on success.
 */
export async function createAccount(name: string, email: string, password: string): Promise<void> {
  const data = await authFetch<AuthResponse>('/api/auth/register', { name, email, password })
  localStorage.setItem(TOKEN_KEY, data.token)
}

/**
 * Log in with name and password.
 * Calls the API, stores the JWT in localStorage on success.
 * Returns true on success, throws on failure.
 */
export async function login(name: string, password: string): Promise<boolean> {
  const data = await authFetch<AuthResponse>('/api/auth/login', { name, password })
  localStorage.setItem(TOKEN_KEY, data.token)
  return true
}

/** Clear the JWT token from localStorage. */
export function logout(): void {
  localStorage.removeItem(TOKEN_KEY)
}

/**
 * Verify the current token and get user info from the server.
 * Returns null if the token is missing or invalid.
 */
export async function getUser(): Promise<{ id: string; name: string } | null> {
  const token = getToken()
  if (!token) return null
  try {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    const data = (await res.json()) as { user: { id: string; name: string } }
    return data.user
  } catch {
    return null
  }
}

// ─── Forgot Password Flow ────────────────────────────────────────────────────

/**
 * Request a password reset OTP.
 * Sends a 6-digit code to the given email address.
 */
export async function forgotPassword(email: string): Promise<string> {
  const data = await authFetch<{ message: string }>('/api/auth/forgot-password', { email })
  return data.message
}

/**
 * Verify a 6-digit OTP code.
 * Returns true if the code is valid and not expired.
 */
export async function verifyOtp(email: string, code: string): Promise<boolean> {
  const data = await authFetch<{ valid: boolean }>('/api/auth/verify-otp', { email, code })
  return data.valid
}

/**
 * Reset the password using a verified OTP.
 * Returns the success message.
 */
export async function resetPassword(email: string, code: string, newPassword: string): Promise<string> {
  const data = await authFetch<{ message: string }>('/api/auth/reset-password', {
    email,
    code,
    newPassword,
  })
  return data.message
}
