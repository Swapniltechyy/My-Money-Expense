import type { BuiltinCategoryId } from './types'

export const STORAGE_KEY = 'my-money.v1'

export const CUSTOM_CATEGORY_COLORS = [
  '#0ea5e9',
  '#8b5cf6',
  '#f43f5e',
  '#14b8a6',
  '#f59e0b',
  '#6366f1',
  '#84cc16',
  '#ec4899',
]

export const CATEGORIES: Record<
  BuiltinCategoryId,
  { id: BuiltinCategoryId; label: string; color: string; hint: string }
> = {
  food: { id: 'food', label: 'Food', color: '#ea580c', hint: 'Meals & groceries' },
  snacks: { id: 'snacks', label: 'Snacks', color: '#d97706', hint: 'Chips, street food' },
  drinks: { id: 'drinks', label: 'Drinks', color: '#0284c7', hint: 'Tea, coffee, juice' },
  transport: { id: 'transport', label: 'Transport', color: '#4f46e5', hint: 'Auto, cab, fuel' },
  shopping: { id: 'shopping', label: 'Shopping', color: '#db2777', hint: 'Clothes, goods' },
  bills: { id: 'bills', label: 'Bills', color: '#0f766e', hint: 'Utilities, rent' },
  entertainment: { id: 'entertainment', label: 'Entertainment', color: '#7c3aed', hint: 'Movies, outings' },
  health: { id: 'health', label: 'Health', color: '#16a34a', hint: 'Pharmacy, care' },
  education: { id: 'education', label: 'Education', color: '#2563eb', hint: 'Courses, books' },
  other: { id: 'other', label: 'Other', color: '#64748b', hint: 'Everything else' },
}

export const CATEGORY_LIST = Object.values(CATEGORIES)

export const DEFAULT_BUDGET = 0
