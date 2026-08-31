import { DEFAULT_BUDGET, STORAGE_KEY } from '../constants'
import type { AppData, AppSettings, BudgetPeriod } from '../types'
import { fromTodayBounds } from './dates'
import { createId } from './id'

type StoredPeriod = BudgetPeriod & { previousAmount?: number | null }

function normalizePeriod(p: StoredPeriod): BudgetPeriod {
  const history = Array.isArray(p.amountHistory)
    ? p.amountHistory.filter((n) => Number.isFinite(n))
    : []
  if (history.length === 0 && p.previousAmount && p.previousAmount > 0) {
    return {
      id: p.id,
      amount: p.amount,
      amountHistory: [p.previousAmount],
      extraFunds: p.extraFunds ?? true,
      carryOverApplied: p.carryOverApplied ?? 0,
      startDate: p.startDate,
      endDate: p.endDate,
      createdAt: p.createdAt,
    }
  }
  return {
    id: p.id,
    amount: p.amount,
    amountHistory: history,
    extraFunds: p.extraFunds ?? history.length > 0,
    carryOverApplied: p.carryOverApplied ?? 0,
    startDate: p.startDate,
    endDate: p.endDate,
    createdAt: p.createdAt,
  }
}

export function defaultSettings(): AppSettings {
  return {
    theme: 'system',
    currencyCode: 'INR',
    currencySymbol: '₹',
    carryOverUnused: false,
    notifyBudgetWarnings: true,
    notifyDailyReminders: false,
  }
}

export function createPeriod(
  amount = DEFAULT_BUDGET,
  bounds = fromTodayBounds(),
  carryOverApplied = 0,
): BudgetPeriod {
  return {
    id: createId(),
    amount,
    amountHistory: [],
    extraFunds: false,
    carryOverApplied,
    startDate: bounds.startDate,
    endDate: bounds.endDate,
    createdAt: new Date().toISOString(),
  }
}

export function createInitialData(): AppData {
  const period = createPeriod()
  return {
    version: 1,
    items: [],
    purchases: [],
    periods: [period],
    currentPeriodId: period.id,
    settings: defaultSettings(),
    customCategories: [],
    hiddenCategoryIds: [],
    additionalNotes: [],
  }
}

function clearUnusedFactoryBudget(data: AppData): AppData {
  const onlyDefaultPeriod = data.periods.length === 1
  const noPurchases = data.purchases.length === 0
  if (!onlyDefaultPeriod || !noPurchases) return data
  return {
    ...data,
    periods: data.periods.map((p) => {
      if (p.amount !== 15000) return p
      if ((p.amountHistory?.length ?? 0) > 0) return p
      if (p.extraFunds) return p
      return { ...p, amount: 0 }
    }),
  }
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createInitialData()
    const parsed = JSON.parse(raw) as AppData & { occasionBudgets?: unknown }
    if (parsed.version !== 1 || !Array.isArray(parsed.items) || !Array.isArray(parsed.purchases)) {
      return createInitialData()
    }
    const { occasionBudgets: _unused, ...rest } = parsed
    return clearUnusedFactoryBudget({
      ...createInitialData(),
      ...rest,
      settings: { ...defaultSettings(), ...parsed.settings },
      customCategories: Array.isArray(parsed.customCategories) ? parsed.customCategories : [],
      hiddenCategoryIds: Array.isArray(parsed.hiddenCategoryIds) ? parsed.hiddenCategoryIds : [],
      additionalNotes: Array.isArray(parsed.additionalNotes) ? parsed.additionalNotes : [],
      periods: Array.isArray(parsed.periods)
        ? parsed.periods.map((p) => normalizePeriod(p as StoredPeriod))
        : createInitialData().periods,
    })
  } catch {
    return createInitialData()
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function exportJson(data: AppData): string {
  return JSON.stringify(data, null, 2)
}

export function parseImport(text: string): AppData {
  const parsed = JSON.parse(text) as AppData & { occasionBudgets?: unknown }
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.items) || !Array.isArray(parsed.purchases)) {
    throw new Error('This file is not a valid My Money backup.')
  }
  const { occasionBudgets: _unused, ...rest } = parsed
  return {
    ...createInitialData(),
    ...rest,
    settings: { ...defaultSettings(), ...parsed.settings },
    customCategories: Array.isArray(parsed.customCategories) ? parsed.customCategories : [],
    hiddenCategoryIds: Array.isArray(parsed.hiddenCategoryIds) ? parsed.hiddenCategoryIds : [],
    additionalNotes: Array.isArray(parsed.additionalNotes) ? parsed.additionalNotes : [],
    periods: Array.isArray(parsed.periods)
      ? parsed.periods.map((p) => normalizePeriod(p as StoredPeriod))
      : createInitialData().periods,
  }
}
