import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react'
import type {
  AdditionalNote,
  AppData,
  AppSettings,
  BudgetPeriod,
  CategoryId,
  CustomCategory,
  ExpenseItem,
  Purchase,
} from '../types'
import { isBuiltinCategory, prepareCustomCategory } from './categories'
import { dashboardMetrics, remainingMoney, sumAmounts, purchasesInPeriod } from './calc'
import { nowTime, todayISO } from './dates'
import { createId } from './id'
import { displayName, findMatchingItems, normalizeName } from './normalize'
import { createInitialData, createPeriod, loadData, saveData } from './storage'

type Toast = { id: string; message: string }

type Action =
  | { type: 'hydrate'; data: AppData }
  | {
      type: 'addToItem'
      itemId: string
      amount: number
      date: string
      time: string
      notes: string
      quantity: number | null
      category?: CategoryId
    }
  | {
      type: 'createItem'
      name: string
      amount: number
      category: CategoryId
      date: string
      time: string
      notes: string
      quantity: number | null
    }
  | { type: 'updatePurchase'; purchase: Purchase }
  | { type: 'deletePurchase'; purchaseId: string }
  | { type: 'updateItem'; itemId: string; name: string; category: CategoryId }
  | { type: 'deleteItem'; itemId: string }
  | { type: 'updatePeriod'; patch: Partial<BudgetPeriod> }
  | { type: 'startNewPeriod'; amount: number; startDate: string; endDate: string }
  | { type: 'switchPeriod'; periodId: string }
  | { type: 'deletePeriod'; periodId: string }
  | { type: 'updateSettings'; patch: Partial<AppSettings> }
  | { type: 'replace'; data: AppData }
  | { type: 'reset' }
  | { type: 'addCustomCategory'; category: CustomCategory }
  | { type: 'removeCategory'; categoryId: CategoryId }
  | { type: 'unhideCategory'; categoryId: CategoryId }
  | { type: 'addAdditional'; personName: string; amount: number; notes: string }
  | { type: 'updateAdditional'; note: AdditionalNote }
  | { type: 'deleteAdditional'; id: string }

function addPurchase(
  data: AppData,
  itemId: string,
  amount: number,
  date: string,
  time: string,
  notes: string,
  quantity: number | null,
): AppData {
  const purchase: Purchase = {
    id: createId(),
    itemId,
    amount,
    date,
    time,
    notes,
    quantity,
    createdAt: new Date().toISOString(),
  }
  return { ...data, purchases: [...data.purchases, purchase] }
}

function reducer(data: AppData, action: Action): AppData {
  switch (action.type) {
    case 'hydrate':
    case 'replace':
      return action.data
    case 'reset': {
      const next = createInitialData()
      return { ...next, settings: data.settings, customCategories: data.customCategories, hiddenCategoryIds: data.hiddenCategoryIds, additionalNotes: data.additionalNotes ?? [] }
    }
    case 'addToItem': {
      const items = action.category
        ? data.items.map((item) =>
            item.id === action.itemId ? { ...item, category: action.category! } : item,
          )
        : data.items
      return addPurchase(
        { ...data, items },
        action.itemId,
        action.amount,
        action.date,
        action.time,
        action.notes,
        action.quantity,
      )
    }
    case 'createItem': {
      const item: ExpenseItem = {
        id: createId(),
        name: displayName(action.name),
        normalizedName: normalizeName(action.name),
        category: action.category,
        createdAt: new Date().toISOString(),
      }
      return addPurchase(
        { ...data, items: [...data.items, item] },
        item.id,
        action.amount,
        action.date,
        action.time,
        action.notes,
        action.quantity,
      )
    }
    case 'updatePurchase': {
      return {
        ...data,
        purchases: data.purchases.map((p) => (p.id === action.purchase.id ? action.purchase : p)),
      }
    }
    case 'deletePurchase': {
      const purchases = data.purchases.filter((p) => p.id !== action.purchaseId)
      const remainingIds = new Set(purchases.map((p) => p.itemId))
      return {
        ...data,
        purchases,
        items: data.items.filter((item) => remainingIds.has(item.id)),
      }
    }
    case 'updateItem': {
      return {
        ...data,
        items: data.items.map((item) =>
          item.id === action.itemId
            ? {
                ...item,
                name: displayName(action.name),
                normalizedName: normalizeName(action.name),
                category: action.category,
              }
            : item,
        ),
      }
    }
    case 'deleteItem': {
      return {
        ...data,
        items: data.items.filter((i) => i.id !== action.itemId),
        purchases: data.purchases.filter((p) => p.itemId !== action.itemId),
      }
    }
    case 'updatePeriod': {
      return {
        ...data,
        periods: data.periods.map((p) => {
          if (p.id !== data.currentPeriodId) return p
          const nextEnd = action.patch.endDate ?? p.endDate
          const sameDays = nextEnd === p.endDate
          const nextAmount = action.patch.amount
          const amountChanged = nextAmount !== undefined && nextAmount !== p.amount
          const hadBudget = p.amount > 0
          const addedOnSameDays =
            amountChanged &&
            nextAmount !== undefined &&
            nextAmount > p.amount &&
            sameDays &&
            hadBudget
          const amountHistory =
            amountChanged && hadBudget
              ? [p.amount, ...(p.amountHistory ?? [])]
              : amountChanged
                ? []
                : (p.amountHistory ?? [])
          const extraFunds = sameDays ? Boolean(hadBudget && (p.extraFunds || addedOnSameDays)) : false
          return { ...p, ...action.patch, amountHistory, extraFunds }
        }),
      }
    }
    case 'startNewPeriod': {
      const current = data.periods.find((p) => p.id === data.currentPeriodId)
      let carry = 0
      if (data.settings.carryOverUnused && current) {
        const spent = sumAmounts(purchasesInPeriod(data.purchases, current))
        carry = Math.max(0, remainingMoney(current, spent))
      }
      const period = createPeriod(action.amount, {
        startDate: action.startDate,
        endDate: action.endDate,
      }, carry)
      return {
        ...data,
        periods: [...data.periods, period],
        currentPeriodId: period.id,
      }
    }
    case 'switchPeriod':
      return { ...data, currentPeriodId: action.periodId }
    case 'deletePeriod': {
      if (data.periods.length <= 1) return data
      const periods = data.periods.filter((p) => p.id !== action.periodId)
      const currentPeriodId =
        data.currentPeriodId === action.periodId ? periods[periods.length - 1].id : data.currentPeriodId
      return { ...data, periods, currentPeriodId }
    }
    case 'updateSettings':
      return { ...data, settings: { ...data.settings, ...action.patch } }
    case 'addCustomCategory': {
      if (data.customCategories.some((c) => c.id === action.category.id)) return data
      return {
        ...data,
        customCategories: [...data.customCategories, action.category],
        hiddenCategoryIds: (data.hiddenCategoryIds ?? []).filter((id) => id !== action.category.id),
      }
    }
    case 'removeCategory': {
      if (action.categoryId === 'other') return data
      const items = data.items.map((item) =>
        item.category === action.categoryId ? { ...item, category: 'other' } : item,
      )
      const customCategories = data.customCategories.filter((c) => c.id !== action.categoryId)
      const hidden = data.hiddenCategoryIds ?? []
      const hiddenCategoryIds = isBuiltinCategory(action.categoryId)
        ? [...new Set([...hidden, action.categoryId])]
        : hidden.filter((id) => id !== action.categoryId)
      return { ...data, items, customCategories, hiddenCategoryIds }
    }
    case 'unhideCategory':
      return {
        ...data,
        hiddenCategoryIds: (data.hiddenCategoryIds ?? []).filter((id) => id !== action.categoryId),
      }
    case 'addAdditional': {
      const note: AdditionalNote = {
        id: createId(),
        personName: action.personName.trim(),
        amount: action.amount,
        notes: action.notes.trim(),
        createdAt: new Date().toISOString(),
      }
      return { ...data, additionalNotes: [note, ...(data.additionalNotes ?? [])] }
    }
    case 'updateAdditional':
      return {
        ...data,
        additionalNotes: (data.additionalNotes ?? []).map((n) => (n.id === action.note.id ? action.note : n)),
      }
    case 'deleteAdditional':
      return {
        ...data,
        additionalNotes: (data.additionalNotes ?? []).filter((n) => n.id !== action.id),
      }
    default:
      return data
  }
}

interface StoreValue {
  data: AppData
  metrics: ReturnType<typeof dashboardMetrics>
  ready: boolean
  toast: Toast | null
  notify: (message: string) => void
  matchesFor: (name: string) => ExpenseItem[]
  addToExisting: (input: {
    itemId: string
    amount: number
    date?: string
    time?: string
    notes?: string
    quantity?: number | null
    category?: CategoryId
  }) => void
  createNew: (input: {
    name: string
    amount: number
    category: CategoryId
    date?: string
    time?: string
    notes?: string
    quantity?: number | null
  }) => void
  updatePurchase: (purchase: Purchase) => void
  deletePurchase: (purchaseId: string) => void
  updateItem: (itemId: string, name: string, category: CategoryId) => void
  deleteItem: (itemId: string) => void
  updatePeriod: (patch: Partial<BudgetPeriod>) => void
  startNewPeriod: (amount: number, startDate: string, endDate: string) => void
  switchPeriod: (periodId: string) => void
  deletePeriod: (periodId: string) => void
  updateSettings: (patch: Partial<AppSettings>) => void
  replaceData: (next: AppData) => void
  resetData: () => void
  ensureCategory: (name: string) => CategoryId
  removeCategory: (categoryId: CategoryId) => void
  addAdditional: (personName: string, amount: number, notes: string) => void
  updateAdditional: (note: AdditionalNote) => void
  deleteAdditional: (id: string) => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, loadData)
  const [ready, setReady] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)

  useEffect(() => {
    setReady(true)
  }, [])

  useEffect(() => {
    if (ready) saveData(data)
  }, [data, ready])

  const notify = useCallback((message: string) => {
    const id = createId()
    setToast({ id, message })
    window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current))
    }, 2600)
  }, [])

  const metrics = useMemo(() => dashboardMetrics(data), [data])

  const value = useMemo<StoreValue>(
    () => ({
      data,
      metrics,
      ready,
      toast,
      notify,
      matchesFor: (name) => findMatchingItems(data.items, name),
      addToExisting: (input) => {
        dispatch({
          type: 'addToItem',
          itemId: input.itemId,
          amount: input.amount,
          date: input.date ?? todayISO(),
          time: input.time ?? nowTime(),
          notes: input.notes ?? '',
          quantity: input.quantity ?? null,
          category: input.category,
        })
        notify('Purchase added')
      },
      createNew: (input) => {
        dispatch({
          type: 'createItem',
          name: input.name,
          amount: input.amount,
          category: input.category,
          date: input.date ?? todayISO(),
          time: input.time ?? nowTime(),
          notes: input.notes ?? '',
          quantity: input.quantity ?? null,
        })
        notify('Expense added')
      },
      updatePurchase: (purchase) => {
        dispatch({ type: 'updatePurchase', purchase })
        notify('Purchase updated')
      },
      deletePurchase: (purchaseId) => {
        dispatch({ type: 'deletePurchase', purchaseId })
        notify('Purchase deleted')
      },
      updateItem: (itemId, name, category) => {
        dispatch({ type: 'updateItem', itemId, name, category })
        notify('Expense updated')
      },
      deleteItem: (itemId) => {
        dispatch({ type: 'deleteItem', itemId })
        notify('Expense removed')
      },
      updatePeriod: (patch) => {
        dispatch({ type: 'updatePeriod', patch })
        notify('Budget saved')
      },
      startNewPeriod: (amount, startDate, endDate) => {
        dispatch({ type: 'startNewPeriod', amount, startDate, endDate })
        notify('New budget period started')
      },
      switchPeriod: (periodId) => dispatch({ type: 'switchPeriod', periodId }),
      deletePeriod: (periodId) => dispatch({ type: 'deletePeriod', periodId }),
      updateSettings: (patch) => dispatch({ type: 'updateSettings', patch }),
      replaceData: (next) => {
        dispatch({ type: 'replace', data: next })
        notify('Data imported')
      },
      resetData: () => {
        dispatch({ type: 'reset' })
        notify('Expenses cleared')
      },
      ensureCategory: (name) => {
        const result = prepareCustomCategory(name, data.customCategories)
        if (result.created) {
          dispatch({ type: 'addCustomCategory', category: result.created })
        }
        if ((data.hiddenCategoryIds ?? []).includes(result.id)) {
          dispatch({ type: 'unhideCategory', categoryId: result.id })
        }
        return result.id
      },
      removeCategory: (categoryId) => {
        dispatch({ type: 'removeCategory', categoryId })
        notify('Category removed')
      },
      addAdditional: (personName, amount, notes) => {
        dispatch({ type: 'addAdditional', personName, amount, notes })
        notify('Note saved')
      },
      updateAdditional: (note) => {
        dispatch({ type: 'updateAdditional', note })
        notify('Note updated')
      },
      deleteAdditional: (id) => {
        dispatch({ type: 'deleteAdditional', id })
        notify('Note removed')
      },
    }),
    [data, metrics, ready, toast, notify],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
