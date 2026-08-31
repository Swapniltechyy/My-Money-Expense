import type { CustomCategory } from '../types'
import type {
  AppData,
  BudgetPeriod,
  BudgetStatus,
  CategoryId,
  ExpenseItem,
  GroupedExpense,
  Purchase,
} from '../types'
import { resolveCategory } from './categories'
import { daysLeftInPeriod, inRange, purchaseStamp, todayISO, weekStartISO } from './dates'

export function purchasesInPeriod(
  purchases: Purchase[],
  period: BudgetPeriod | undefined,
): Purchase[] {
  if (!period) return []
  return purchases.filter((p) => inRange(p.date, period.startDate, period.endDate))
}

export function sumAmounts(purchases: Purchase[]): number {
  return purchases.reduce((sum, p) => sum + p.amount, 0)
}

export function effectiveBudget(period: BudgetPeriod | undefined): number {
  if (!period) return 0
  return period.amount + period.carryOverApplied
}

export function remainingMoney(period: BudgetPeriod | undefined, spent: number): number {
  return effectiveBudget(period) - spent
}

export function safeToSpendDaily(remaining: number, daysLeft: number): number {
  if (daysLeft <= 0) return remaining > 0 ? remaining : 0
  if (remaining <= 0) return 0
  return remaining / daysLeft
}

export function budgetStatus(spent: number, budget: number): BudgetStatus {
  if (budget <= 0) {
    return { level: 'healthy', utilization: 0, label: 'Set a monthly budget to get insights' }
  }
  const utilization = (spent / budget) * 100
  if (utilization > 100) {
    return { level: 'exceeded', utilization, label: 'Budget exceeded' }
  }
  if (utilization >= 100) {
    return { level: 'reached', utilization, label: 'Budget reached' }
  }
  if (utilization >= 90) {
    return { level: 'strong', utilization, label: '90% of budget used' }
  }
  if (utilization >= 75) {
    return { level: 'warning', utilization, label: '75% of budget used' }
  }
  return { level: 'healthy', utilization, label: 'On track' }
}

export function currentPeriod(data: AppData): BudgetPeriod | undefined {
  return data.periods.find((p) => p.id === data.currentPeriodId)
}

export function groupedExpenses(
  items: ExpenseItem[],
  purchases: Purchase[],
  period?: BudgetPeriod,
): GroupedExpense[] {
  const scoped = period ? purchasesInPeriod(purchases, period) : purchases
  const byItem = new Map<string, Purchase[]>()
  for (const purchase of scoped) {
    const list = byItem.get(purchase.itemId) ?? []
    list.push(purchase)
    byItem.set(purchase.itemId, list)
  }

  const groups: GroupedExpense[] = []
  for (const item of items) {
    const itemPurchases = byItem.get(item.id)
    if (!itemPurchases?.length) continue
    const sorted = [...itemPurchases].sort((a, b) =>
      purchaseStamp(b.date, b.time).localeCompare(purchaseStamp(a.date, a.time)),
    )
    const last = sorted[0]
    groups.push({
      item,
      purchases: sorted,
      totalAmount: sumAmounts(sorted),
      purchaseCount: sorted.length,
      lastPurchasedAt: purchaseStamp(last.date, last.time),
    })
  }

  return groups.sort((a, b) => b.lastPurchasedAt.localeCompare(a.lastPurchasedAt))
}

export function itemStats(itemId: string, purchases: Purchase[]) {
  const list = purchases.filter((p) => p.itemId === itemId)
  return {
    purchases: list,
    totalAmount: sumAmounts(list),
    purchaseCount: list.length,
  }
}

export function categoryTotals(
  purchases: Purchase[],
  items: ExpenseItem[],
  custom: CustomCategory[] = [],
) {
  const itemMap = new Map(items.map((i) => [i.id, i]))
  const totals = new Map<CategoryId, number>()
  for (const purchase of purchases) {
    const category = itemMap.get(purchase.itemId)?.category ?? 'other'
    totals.set(category, (totals.get(category) ?? 0) + purchase.amount)
  }
  return [...totals.entries()]
    .map(([id, amount]) => ({ ...resolveCategory(id, custom), amount }))
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount)
}

export function dailyTotals(purchases: Purchase[], start: string, end: string) {
  const map = new Map<string, number>()
  let cursor = start
  while (cursor <= end) {
    map.set(cursor, 0)
    const [y, m, d] = cursor.split('-').map(Number)
    const next = new Date(y, m - 1, d + 1)
    cursor = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
  }
  for (const purchase of purchases) {
    if (purchase.date < start || purchase.date > end) continue
    map.set(purchase.date, (map.get(purchase.date) ?? 0) + purchase.amount)
  }
  return [...map.entries()].map(([date, amount]) => ({ date, amount }))
}

export function historySummaries(purchases: Purchase[]) {
  const today = todayISO()
  const weekStart = weekStartISO(today)
  const monthStart = `${today.slice(0, 7)}-01`
  return {
    today: sumAmounts(purchases.filter((p) => p.date === today)),
    week: sumAmounts(purchases.filter((p) => p.date >= weekStart && p.date <= today)),
    month: sumAmounts(purchases.filter((p) => p.date >= monthStart && p.date <= today)),
  }
}

export function frequentItems(groups: GroupedExpense[], limit = 6): GroupedExpense[] {
  return [...groups]
    .sort((a, b) => {
      if (b.purchaseCount !== a.purchaseCount) return b.purchaseCount - a.purchaseCount
      return b.lastPurchasedAt.localeCompare(a.lastPurchasedAt)
    })
    .slice(0, limit)
}

export function dashboardMetrics(data: AppData) {
  const period = currentPeriod(data)
  const scoped = purchasesInPeriod(data.purchases, period)
  const spent = sumAmounts(scoped)
  const budget = effectiveBudget(period)
  const remaining = remainingMoney(period, spent)
  const daysLeft = period ? daysLeftInPeriod(period.endDate) : 0
  const elapsed = period ? daysLeftInPeriod(todayISO(), period.startDate) : 1
  const daysElapsed = Math.max(1, elapsed)
  return {
    period,
    scoped,
    spent,
    budget,
    remaining,
    daysLeft,
    safeDaily: safeToSpendDaily(remaining, daysLeft),
    status: budgetStatus(spent, budget),
    avgDaily: spent / daysElapsed,
    groups: groupedExpenses(data.items, data.purchases, period),
  }
}
