import { useEffect, useState, type FormEvent } from 'react'
import { parseAmount } from '../lib/currency'
import { nowTime, todayISO } from '../lib/dates'
import { frequentItems } from '../lib/calc'
import { selectableCategories, suggestCategory } from '../lib/categories'
import { useStore } from '../lib/store'
import type { CategoryId, ExpenseItem } from '../types'
import { CategoryGlyph } from './CategoryGlyph'
import { IconPlus } from './Icons'
import { Sheet } from './Sheet'

export function QuickAdd({
  open,
  onClose,
  item,
}: {
  open: boolean
  onClose: () => void
  item?: ExpenseItem | null
}) {
  const { addToExisting } = useStore()
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [more, setMore] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setAmount('')
    setNotes('')
    setMore(false)
    setError('')
  }, [open, item?.id])

  function save(e: FormEvent) {
    e.preventDefault()
    if (!item) return
    const value = parseAmount(amount)
    if (value === null || value <= 0) {
      setError('Amount must be greater than zero.')
      return
    }
    addToExisting({
      itemId: item.id,
      amount: value,
      date: todayISO(),
      time: nowTime(),
      notes,
    })
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={item ? `Add to ${item.name}` : 'Quick add'}>
      {item ? (
        <form className="form" onSubmit={save}>
          <div className="match-row">
            <CategoryGlyph category={item.category} />
            <div>
              <strong>{item.name}</strong>
              <p>Another purchase of this item</p>
            </div>
          </div>
          <label className="field">
            <span>Amount (₹)</span>
            <input
              autoFocus
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="20"
            />
          </label>
          <button type="button" className="text-link" onClick={() => setMore((v) => !v)}>
            {more ? 'Hide notes' : 'Add notes'}
          </button>
          {more ? (
            <label className="field">
              <span>Notes</span>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
          ) : null}
          {error ? <p className="error">{error}</p> : null}
          <button className="btn btn-primary btn-block" type="submit">
            Save purchase
          </button>
        </form>
      ) : (
        <p className="hint">Choose an expense to add a purchase.</p>
      )}
    </Sheet>
  )
}

export function FrequentRow({ onPick }: { onPick: (itemId: string) => void }) {
  const { metrics } = useStore()
  const frequent = frequentItems(metrics.groups)
  if (!frequent.length) return null
  return (
    <section className="frequent">
      <h3>Frequent</h3>
      <div className="frequent-list">
        {frequent.map((g) => (
          <button key={g.item.id} className="frequent-chip" onClick={() => onPick(g.item.id)}>
            <span>{g.item.name}</span>
            <span className="plus-mini">
              <IconPlus size={16} />
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

export function HomeQuickAdd({
  onAddNew,
}: {
  onAddNew: (draft?: { name: string; amount: string; category?: CategoryId }) => void
}) {
  const { matchesFor, addToExisting, createNew, data } = useStore()
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<CategoryId>('other')
  const [categoryTouched, setCategoryTouched] = useState(false)
  const [error, setError] = useState('')

  const preview = matchesFor(name)[0]
  const options = selectableCategories(data.customCategories, data.hiddenCategoryIds ?? [])

  useEffect(() => {
    if (preview || categoryTouched) return
    setCategory(suggestCategory(name))
  }, [name, preview, categoryTouched])

  function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Enter an expense name.')
      return
    }
    const value = parseAmount(amount)
    if (value === null || value <= 0) {
      setError('Amount must be greater than zero.')
      return
    }
    if (preview) {
      addToExisting({ itemId: preview.id, amount: value })
    } else {
      createNew({ name: trimmed, amount: value, category })
    }
    setName('')
    setAmount('')
    setCategory('other')
    setCategoryTouched(false)
    setError('')
  }

  return (
    <form className="quick-bar" onSubmit={submit}>
      <input
        value={name}
        onChange={(e) => {
          setName(e.target.value)
          if (!e.target.value.trim()) setCategoryTouched(false)
        }}
        placeholder="Expense name"
        aria-label="Expense name"
      />
      <input
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="₹"
        aria-label="Amount"
      />
      <button className="btn btn-primary" type="submit">
        Add
      </button>
      {error ? <p className="error quick-error">{error}</p> : null}
      {preview ? (
        <p className="quick-hint">
          Adds to {preview.name} · {options.find((c) => c.id === preview.category)?.label ?? 'Other'}.{' '}
          <button type="button" className="text-link" onClick={onAddNew}>
            Open full form
          </button>
        </p>
      ) : name.trim() ? (
        <div className="quick-cats" role="listbox" aria-label="Category">
          {options.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`quick-cat ${category === cat.id ? 'active' : ''}`}
              onClick={() => {
                if (cat.id === 'other') {
                  onAddNew({ name, amount, category: 'other' })
                  setName('')
                  setAmount('')
                  setCategory('other')
                  setCategoryTouched(false)
                  setError('')
                  return
                }
                setCategory(cat.id)
                setCategoryTouched(true)
              }}
            >
              <CategoryGlyph category={cat.id} size={22} />
              {cat.label}
            </button>
          ))}
        </div>
      ) : (
        <p className="quick-hint">New items get a suggested category. You can change it before Add.</p>
      )}
    </form>
  )
}
