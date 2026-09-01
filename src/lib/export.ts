import type { AppData, CategoryId, Purchase } from '../types'
import { resolveCategory, selectableCategories } from './categories'
import { formatINR } from './currency'

export type ExportScope = 'all' | CategoryId

export interface ExportRow {
  purchase: Purchase
  itemName: string
  categoryId: CategoryId
  categoryLabel: string
}

export type ExportColumn = 'name' | 'category' | 'amount' | 'date' | 'notes'

const COLUMN_LABEL: Record<ExportColumn, string> = {
  name: 'Name',
  category: 'Category',
  amount: 'Amount',
  date: 'Date',
  notes: 'Notes',
}

export function exportRows(data: AppData, scope: ExportScope): ExportRow[] {
  const itemMap = new Map(data.items.map((i) => [i.id, i]))
  const seen = new Set<string>()
  const rows: ExportRow[] = []
  for (const purchase of data.purchases) {
    if (seen.has(purchase.id)) continue
    seen.add(purchase.id)
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

export function exportColumns(rows: ExportRow[], scope: ExportScope): ExportColumn[] {
  const columns: ExportColumn[] = ['name']
  if (scope === 'all') columns.push('category')
  columns.push('amount', 'date')
  if (rows.some((row) => row.purchase.notes.trim())) columns.push('notes')
  return columns
}

export function cellValue(row: ExportRow, column: ExportColumn): string {
  switch (column) {
    case 'name':
      return row.itemName
    case 'category':
      return row.categoryLabel
    case 'amount':
      return formatINR(row.purchase.amount)
    case 'date': {
      const [year, month, day] = row.purchase.date.split('-')
      return year && month && day ? `${day}/${month}/${year}` : row.purchase.date
    }
    case 'notes':
      return row.purchase.notes.trim()
  }
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

function pdfSafe(value: string): string {
  return value
    .replaceAll('₹', 'Rs.')
    .replaceAll('−', '-')
    .replace(/[^\x20-\x7E]/g, '?')
}

function pdfEscape(value: string): string {
  return pdfSafe(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function fitPdf(value: string, maxChars: number): string {
  const text = pdfSafe(value)
  if (text.length <= maxChars) return text
  return `${text.slice(0, Math.max(1, maxChars - 1))}.`
}

export function rowsToPdf(rows: ExportRow[], title: string, scope: ExportScope): Uint8Array {
  const columns = exportColumns(rows, scope)
  const pageW = 595
  const pageH = 842
  const margin = 36
  const rowH = 16
  const usable = pageW - margin * 2
  const weights: Record<ExportColumn, number> = {
    name: 1.5,
    category: 1.1,
    amount: 1.1,
    date: 0.9,
    time: 0.7,
    notes: 1.3,
  }
  const weightSum = columns.reduce((sum, col) => sum + weights[col], 0)
  const widths = columns.map((col) => (usable * weights[col]) / weightSum)
  const charsPerCol = widths.map((w) => Math.max(6, Math.floor(w / 5.2)))
  const titleBlock = 48
  const headerBlock = 22
  const rowsPerPage = Math.max(1, Math.floor((pageH - margin * 2 - titleBlock - headerBlock) / rowH) - 1)
  const pages: ExportRow[][] = []
  if (rows.length === 0) pages.push([])
  for (let i = 0; i < rows.length; i += rowsPerPage) pages.push(rows.slice(i, i + rowsPerPage))
  const total = rows.reduce((sum, row) => sum + row.purchase.amount, 0)

  function drawPage(pageRows: ExportRow[], pageIndex: number, pageCount: number): string {
    const lines: string[] = ['BT']
    let y = pageH - margin - 16
    lines.push('/F2 14 Tf')
    lines.push(`1 0 0 1 ${margin} ${y} Tm`)
    lines.push(`(My Money) Tj`)
    y -= 16
    lines.push('/F1 10 Tf')
    lines.push(`1 0 0 1 ${margin} ${y} Tm`)
    lines.push(`(${pdfEscape(`${title} expenses`)}) Tj`)
    y -= 22
    lines.push('/F2 8 Tf')
    let x = margin
    columns.forEach((col, i) => {
      lines.push(`1 0 0 1 ${x} ${y} Tm`)
      lines.push(`(${pdfEscape(fitPdf(COLUMN_LABEL[col], charsPerCol[i]))}) Tj`)
      x += widths[i]
    })
    y -= 8
    lines.push('ET')
    lines.push(`${margin} ${y} m ${pageW - margin} ${y} l S`)
    y -= 12
    lines.push('BT')
    lines.push('/F1 8 Tf')
    for (const row of pageRows) {
      x = margin
      columns.forEach((col, i) => {
        lines.push(`1 0 0 1 ${x} ${y} Tm`)
        lines.push(`(${pdfEscape(fitPdf(cellValue(row, col), charsPerCol[i]))}) Tj`)
        x += widths[i]
      })
      y -= rowH
    }
    y -= 6
    lines.push('ET')
    lines.push(`${margin} ${y} m ${pageW - margin} ${y} l S`)
    y -= 14
    lines.push('BT')
    lines.push('/F2 9 Tf')
    lines.push(`1 0 0 1 ${margin} ${y} Tm`)
    lines.push(`(${pdfEscape(`Total ${formatINR(total)}`)}) Tj`)
    lines.push('/F1 8 Tf')
    lines.push(`1 0 0 1 ${margin} ${margin} Tm`)
    lines.push(`(${pdfEscape(`Page ${pageIndex + 1} of ${pageCount}`)}) Tj`)
    lines.push('ET')
    return lines.join('\n')
  }

  const catalog = '<< /Type /Catalog /Pages 2 0 R >>'
  const font1 = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  const font2 = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'
  const streams = pages.map((pageRows, i) => drawPage(pageRows, i, pages.length))
  const contentObjectIds = streams.map((_, i) => 5 + i)
  const pageObjectIds = streams.map((_, i) => 5 + streams.length + i)
  const pagesObj = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${streams.length} >>`

  const pageObjects = streams.map((_, i) => {
    const contentId = contentObjectIds[i]
    return `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`
  })

  const ordered = [catalog, pagesObj, font1, font2]
  const streamObjects = streams.map((stream) => {
    const body = `${stream}\n`
    return `<< /Length ${body.length} >>\nstream\n${body}endstream`
  })

  const allObjects = [...ordered, ...streamObjects, ...pageObjects]
  return assemblePdf(allObjects)
}

function assemblePdf(objectBodies: string[]): Uint8Array {
  const encoder = new TextEncoder()
  const chunks: Uint8Array[] = []
  const header = encoder.encode('%PDF-1.4\n')
  chunks.push(header)
  let offset = header.length
  const offsets = [0]
  objectBodies.forEach((body, i) => {
    const obj = encoder.encode(`${i + 1} 0 obj\n${body}\nendobj\n`)
    offsets.push(offset)
    chunks.push(obj)
    offset += obj.length
  })
  const xrefStart = offset
  const xrefLines = ['xref', `0 ${objectBodies.length + 1}`, '0000000000 65535 f ']
  for (let i = 1; i <= objectBodies.length; i += 1) {
    xrefLines.push(`${String(offsets[i]).padStart(10, '0')} 00000 n `)
  }
  const xref = encoder.encode(`${xrefLines.join('\n')}\n`)
  chunks.push(xref)
  const trailer = encoder.encode(
    `trailer\n<< /Size ${objectBodies.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`,
  )
  chunks.push(trailer)
  const total = chunks.reduce((sum, c) => sum + c.length, 0)
  const out = new Uint8Array(total)
  let at = 0
  for (const chunk of chunks) {
    out.set(chunk, at)
    at += chunk.length
  }
  return out
}

export function downloadPdf(rows: ExportRow[], title: string, scope: ExportScope, filename: string) {
  const bytes = rowsToPdf(rows, title, scope)
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
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
