import { getToken } from './auth'
import type { AppData } from '../types'

/**
 * Fetch full user data from the database.
 * Returns null if not logged in or request fails.
 */
export async function fetchUserData(): Promise<AppData | null> {
  const token = getToken()
  if (!token) return null

  try {
    const res = await fetch('/api/data', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    if (!res.ok) return null
    return (await res.json()) as AppData
  } catch (err) {
    console.error('Failed to fetch user data from server:', err)
    return null
  }
}

/**
 * Save full user data snapshot to the database.
 * Returns true on success.
 */
export async function syncUserData(data: AppData): Promise<boolean> {
  const token = getToken()
  if (!token) return false

  try {
    const res = await fetch('/api/data', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })
    return res.ok
  } catch (err) {
    console.error('Failed to sync user data with server:', err)
    return false
  }
}
