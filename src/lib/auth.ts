import { AUTH_KEY, SESSION_KEY } from '../constants'

export interface AuthAccount {
  name: string
  salt: string
  hash: string
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return bytesToHex(new Uint8Array(digest))
}

function randomSalt(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return bytesToHex(bytes)
}

function nameKey(name: string): string {
  return name.trim().toLowerCase()
}

function loadAccounts(): AuthAccount[] {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as AuthAccount | { accounts: AuthAccount[] }
    if (parsed && Array.isArray((parsed as { accounts: AuthAccount[] }).accounts)) {
      return (parsed as { accounts: AuthAccount[] }).accounts.filter((a) => a?.name && a.salt && a.hash)
    }
    const single = parsed as AuthAccount
    if (single?.name && single.salt && single.hash) return [single]
    return []
  } catch {
    return []
  }
}

function saveAccounts(accounts: AuthAccount[]): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify({ accounts }))
}

function sessionName(): string {
  return localStorage.getItem(SESSION_KEY)?.trim() ?? ''
}

export function getAccount(): AuthAccount | null {
  const accounts = loadAccounts()
  const session = sessionName()
  if (session && session !== '1') {
    return accounts.find((a) => nameKey(a.name) === nameKey(session)) ?? null
  }
  return accounts[0] ?? null
}

export function hasAccount(): boolean {
  return loadAccounts().length > 0
}

export function accountExists(name: string): boolean {
  return loadAccounts().some((a) => nameKey(a.name) === nameKey(name))
}

export function isLoggedIn(): boolean {
  const session = sessionName()
  if (!session) return false
  if (session === '1') return loadAccounts().length > 0
  return Boolean(getAccount())
}

export function setLoggedIn(value: boolean, name?: string): void {
  if (value) localStorage.setItem(SESSION_KEY, name?.trim() || '1')
  else localStorage.removeItem(SESSION_KEY)
}

export async function createAccount(name: string, password: string): Promise<void> {
  const trimmed = name.trim()
  const accounts = loadAccounts()
  if (accounts.some((a) => nameKey(a.name) === nameKey(trimmed))) {
    throw new Error('That name is already registered. Sign in instead.')
  }
  const salt = randomSalt()
  const hash = await sha256(`${salt}:${password}`)
  saveAccounts([...accounts, { name: trimmed, salt, hash }])
  setLoggedIn(true, trimmed)
}

export async function login(name: string, password: string): Promise<boolean> {
  const account = loadAccounts().find((a) => nameKey(a.name) === nameKey(name))
  if (!account) return false
  const hash = await sha256(`${account.salt}:${password}`)
  if (hash !== account.hash) return false
  setLoggedIn(true, account.name)
  return true
}

export async function resetPassword(name: string, password: string): Promise<void> {
  const trimmed = name.trim()
  const accounts = loadAccounts()
  const index = accounts.findIndex((a) => nameKey(a.name) === nameKey(trimmed))
  if (index < 0) {
    throw new Error('No account found with that name.')
  }
  const salt = randomSalt()
  const hash = await sha256(`${salt}:${password}`)
  const next = [...accounts]
  next[index] = { ...accounts[index], salt, hash }
  saveAccounts(next)
}

export function logout(): void {
  setLoggedIn(false)
}
