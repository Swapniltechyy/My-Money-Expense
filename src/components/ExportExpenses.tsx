import { useEffect, useMemo, useState } from 'react'
import { CategoryGlyph } from './CategoryGlyph'
import { Sheet } from './Sheet'
import {
  categoryExportSummaries,
  downloadPdf,
  exportRows,
  slugLabel,
  type ExportScope,
} from '../lib/export'
import { formatINR } from '../lib/currency'
import { formatTime, shortDate } from '../lib/dates'
import { useStore } from '../lib/store'
import { resolveCategory } from '../lib/categories'

export function ExportExpenses({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, notify } = useStore()
  const [scope, setScope] = useState<ExportScope | null>(null)
  const summaries = useMemo(() => categoryExportSummaries(data), [data])
  const rows = useMemo(() => (scope ? exportRows(data, scope) : []), [data, scope])
  const title =
    scope === null
      ? 'Export expenses'
      : scope === 'all'
        ? 'All over'
        : resolveCategory(scope, data.customCategories).label
  const total = rows.reduce((sum, r) => sum + r.purchase.amount, 0)

  useEffect(() => {
    if (!open) setScope(null)
  }, [open])

  function close() {
    setScope(null)
    onClose()
  }

  function downloadExpensesPdf() {
    if (!scope) return
    const label = scope === 'all' ? 'all-over' : slugLabel(title)
    downloadPdf(rows, title, scope, `my-money-${label}.pdf`)
    notify(`${title} expenses downloaded as PDF`)
  }

  return (
    <Sheet open={open} onClose={close} title={title} wide>
      {scope === null ? (
        <div className="stack">
          <p className="hint">Choose a category to view and download as PDF, or take everything with All over.</p>
          <button className="export-cat all" type="button" onClick={() => setScope('all')}>
            <span className="export-cat-copy">
              <strong>All over</strong>
              <span>
                {summaries.all.count} purchase{summaries.all.count === 1 ? '' : 's'}
              </span>
            </span>
            <strong>{formatINR(summaries.all.total)}</strong>
          </button>
          <ul className="export-cats">
            {summaries.categories.map((cat) => (
              <li key={cat.id}>
                <button type="button" className="export-cat" onClick={() => setScope(cat.id)}>
                  <CategoryGlyph category={cat.id} size={36} />
                  <span className="export-cat-copy">
                    <strong>{cat.label}</strong>
                    <span>
                      {cat.count} purchase{cat.count === 1 ? '' : 's'}
                    </span>
                  </span>
                  <strong>{formatINR(cat.total)}</strong>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="stack export-detail">
          <button type="button" className="text-link" onClick={() => setScope(null)}>
            Back to categories
          </button>
          <div className="detail-hero">
            {scope !== 'all' ? <CategoryGlyph category={scope} size={52} /> : <span />}
            <div>
              <p className="muted">Purchases</p>
              <p className="hero-money">{rows.length}</p>
            </div>
            <div>
              <p className="muted">Total</p>
              <p className="hero-money spend">{formatINR(total)}</p>
            </div>
          </div>
          <button
            className="btn btn-primary btn-block"
            type="button"
            onClick={downloadExpensesPdf}
            disabled={rows.length === 0}
          >
            Download PDF
          </button>
          {rows.length === 0 ? (
            <div className="empty">
              <p>No expenses in this category yet.</p>
            </div>
          ) : (
            <ul className="export-preview">
              {rows.map((row) => (
                <li key={row.purchase.id}>
                  <div>
                    <strong>{row.itemName}</strong>
                    <p className="muted">
                      {shortDate(row.purchase.date)} · {formatTime(row.purchase.time)}
                      {row.categoryLabel && scope === 'all' ? ` · ${row.categoryLabel}` : ''}
                    </p>
                  </div>
                  <strong className="spend">{formatINR(row.purchase.amount)}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Sheet>
  )
}
