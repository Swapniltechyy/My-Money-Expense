export const CATEGORY_IDS = [
  'food',
  'snacks',
  'drinks',
  'transport',
  'shopping',
  'bills',
  'entertainment',
  'health',
  'education',
  'other',
] as const

export type BuiltinCategoryId = (typeof CATEGORY_IDS)[number]
export type CategoryId = string

export interface CustomCategory {
  id: string
  name: string
  normalizedName: string
  color: string
}

export type ThemePreference = 'light' | 'dark' | 'system'
export type TabId = 'home' | 'history' | 'budget' | 'settings'
export type OverlayView =
  | 'none'
  | 'add'
  | 'quickAdd'
  | 'detail'
  | 'menu'
  | 'analytics'
  | 'budget'
  | 'periodHistory'

export type HistoryGroupBy = 'day' | 'category' | 'all'
export type HistorySort = 'newest' | 'oldest' | 'highest' | 'lowest'

export interface ExpenseDraft {
  name?: string
  amount?: string
  category?: CategoryId
}

export interface Purchase {
  id: string
  itemId: string
  amount: number
  date: string
  time: string
  notes: string
  quantity: number | null
  createdAt: string
}

export interface ExpenseItem {
  id: string
  name: string
  normalizedName: string
  category: CategoryId
  createdAt: string
}

export interface BudgetPeriod {
  id: string
  amount: number
  amountHistory: number[]
  extraFunds: boolean
  carryOverApplied: number
  startDate: string
  endDate: string
  createdAt: string
}

export interface AdditionalNote {
  id: string
  personName: string
  amount: number
  notes: string
  createdAt: string
}

export interface AppSettings {
  theme: ThemePreference
  currencyCode: 'INR'
  currencySymbol: '₹'
  carryOverUnused: boolean
  notifyBudgetWarnings: boolean
  notifyDailyReminders: boolean
}

export interface AppData {
  version: 1
  items: ExpenseItem[]
  purchases: Purchase[]
  periods: BudgetPeriod[]
  currentPeriodId: string
  settings: AppSettings
  customCategories: CustomCategory[]
  hiddenCategoryIds: string[]
  additionalNotes: AdditionalNote[]
}

export interface GroupedExpense {
  item: ExpenseItem
  purchases: Purchase[]
  totalAmount: number
  purchaseCount: number
  lastPurchasedAt: string
}

export interface BudgetStatus {
  level: 'healthy' | 'warning' | 'strong' | 'reached' | 'exceeded'
  utilization: number
  label: string
}
