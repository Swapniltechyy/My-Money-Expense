import { CATEGORIES, CATEGORY_LIST, CUSTOM_CATEGORY_COLORS } from '../constants'
import type { BuiltinCategoryId, CategoryId, CustomCategory } from '../types'
import { CATEGORY_IDS } from '../types'
import { createId } from './id'
import { displayName, normalizeName } from './normalize'

export interface CategoryMeta {
  id: CategoryId
  label: string
  color: string
  glyph: string
  builtin: boolean
}

const GLYPHS: Record<BuiltinCategoryId, string> = {
  food: '🍽️',
  snacks: '🍿',
  drinks: '☕',
  transport: '🛺',
  shopping: '🛍️',
  bills: '🧾',
  entertainment: '🎬',
  health: '💊',
  education: '📚',
  other: '•',
}

export function isBuiltinCategory(id: string): id is BuiltinCategoryId {
  return (CATEGORY_IDS as readonly string[]).includes(id)
}

export function resolveCategory(id: CategoryId, custom: CustomCategory[] = []): CategoryMeta {
  if (isBuiltinCategory(id)) {
    const meta = CATEGORIES[id]
    return { id, label: meta.label, color: meta.color, glyph: GLYPHS[id], builtin: true }
  }
  const found = custom.find((c) => c.id === id)
  if (found) {
    return {
      id: found.id,
      label: found.name,
      color: found.color,
      glyph: found.name.trim().charAt(0).toUpperCase() || '•',
      builtin: false,
    }
  }
  const other = CATEGORIES.other
  return { id: 'other', label: other.label, color: other.color, glyph: GLYPHS.other, builtin: true }
}

export function selectableCategories(
  custom: CustomCategory[] = [],
  hidden: string[] = [],
): CategoryMeta[] {
  const skip = new Set(hidden)
  const builtIn = CATEGORY_LIST.filter((c) => c.id !== 'other' && !skip.has(c.id)).map((c) =>
    resolveCategory(c.id),
  )
  const extras = custom.filter((c) => !skip.has(c.id)).map((c) => resolveCategory(c.id, custom))
  return [...builtIn, ...extras, resolveCategory('other')]
}

export function suggestCategory(name: string): BuiltinCategoryId {
  const key = normalizeName(name)
  if (!key) return 'other'
  const rules: [BuiltinCategoryId, string[]][] = [
    ['snacks', ['lays', 'chips', 'kurkure', 'namkeen', 'biscuit', 'cookie', 'maggi', 'snack', 'popcorn', 'wafer']],
    ['drinks', ['coffee', 'tea', 'chai', 'juice', 'soda', 'pepsi', 'coke', 'cola', 'water', 'lassi', 'shake', 'milk']],
    ['food', ['idli', 'dosa', 'biryani', 'biriyani', 'rice', 'lunch', 'dinner', 'breakfast', 'paneer', 'chole', 'roti', 'thali', 'pizza', 'burger', 'meal', 'hotel', 'paratha', 'sambar', 'curry']],
    ['transport', ['auto', 'uber', 'ola', 'bus', 'metro', 'petrol', 'diesel', 'fuel', 'cab', 'train', 'parking']],
    ['shopping', ['amazon', 'flipkart', 'clothes', 'shirt', 'shoes', 'myntra']],
    ['bills', ['rent', 'electricity', 'wifi', 'recharge', 'broadband', 'gas']],
    ['entertainment', ['movie', 'netflix', 'cinema', 'game', 'concert']],
    ['health', ['medicine', 'pharmacy', 'hospital', 'clinic', 'doctor']],
    ['education', ['course', 'book', 'tuition', 'class', 'fees']],
  ]
  for (const [id, words] of rules) {
    if (words.some((word) => key.includes(word))) return id
  }
  return 'other'
}

export function prepareCustomCategory(
  name: string,
  custom: CustomCategory[],
): { id: CategoryId; created?: CustomCategory } {
  const cleaned = name.trim().replace(/\s+/g, ' ')
  if (!cleaned) return { id: 'other' }
  const key = normalizeName(cleaned)
  const builtin = CATEGORY_LIST.find((c) => normalizeName(c.label) === key)
  if (builtin) return { id: builtin.id }
  const existing = custom.find((c) => c.normalizedName === key)
  if (existing) return { id: existing.id }
  const created: CustomCategory = {
    id: `cat_${createId()}`,
    name: displayName(cleaned),
    normalizedName: key,
    color: CUSTOM_CATEGORY_COLORS[custom.length % CUSTOM_CATEGORY_COLORS.length],
  }
  return { id: created.id, created }
}
