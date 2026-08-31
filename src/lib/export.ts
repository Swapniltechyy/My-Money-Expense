import type { AppData, CategoryId, Purchase } from '../types'
import { resolveCategory, selectableCategories } from './categories'
import { formatINR } from './currency'
import { formatTime } from './dates'

export type ExportScope = 'all' | CategoryId

export interface ExportRow {
  purchase: Purchase
  itemName: string
  categoryId: CategoryId
  categoryLabel: string
}

export function exportRows(data: AppData, scope: ExportScope): ExportRow[] {
  const itemMap = new Map(data.items.map((i) => [i.id, i]))
  const rows: ExportRow[] = []
  for (const purchase of data.purchases) {
    const item = itemMap.get(purchase.itemId)
    if (!item) continue
    if (scope !== 'all' && item.category !== scope) continue
    const meta = resolveCategory(item.category, data.customCategories)
    rows.push({
      purchase,
      itemName: item.name,
      categoryId: item.category,
      categoryLabel: meta.label,
    })
  }
  return rows.sort((a, b) =>
    `${a.purchase.date}T${a.purchase.time}`.localeCompare(`${b.purchase.date}T${b.purchase.time}`),
  )
}

export function categoryExportSummaries(data: AppData) {
  const all = exportRows(data, 'all')
  const byCat = new Map<string, ExportRow[]>()
  for (const row of all) {
    const list = byCat.get(row.categoryId) ?? []
    list.push(row)
    byCat.set(row.categoryId, list)
  }
  const categories = selectableCategories(data.customCategories, data.hiddenCategoryIds ?? []).map((meta) => {
    const rows = byCat.get(meta.id) ?? []
    return {
      ...meta,
      count: rows.length,
      total: rows.reduce((sum, r) => sum + r.purchase.amount, 0),
    }
  })
  return {
    all: {
      count: all.length,
      total: all.reduce((sum, r) => sum + r.purchase.amount, 0),
    },
    categories,
  }
}

function csvCell(value: string | number): string {
  const text = String(value)
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function rowsToCsv(rows: ExportRow[]): string {
  const header = ['Name', 'Category', 'Amount', 'Amount (₹)', 'Date', 'Time', 'Notes', 'Quantity']
  const lines = [
    header.join(','),
    ...rows.map((row) =>
      [
        csvCell(row.itemName),
        csvCell(row.categoryLabel),
        csvCell(row.purchase.amount),
        csvCell(formatINR(row.purchase.amount)),
        csvCell(row.purchase.date),
        csvCell(formatTime(row.purchase.time)),
        csvCell(row.purchase.notes),
        csvCell(row.purchase.quantity ?? ''),
      ].join(','),
    ),
  ]
  return `\uFEFF${lines.join('\n')}`
}

export function downloadTextFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function slugLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, '-') || 'expenses'
}
