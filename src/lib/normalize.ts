import type { ExpenseItem } from '../types'

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function displayName(name: string): string {
  const cleaned = name.trim().replace(/\s+/g, ' ')
  if (!cleaned) return ''
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

export function findMatchingItems(items: ExpenseItem[], name: string): ExpenseItem[] {
  const key = normalizeName(name)
  if (!key) return []
  return items.filter((item) => item.normalizedName === key)
}
