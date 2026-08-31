import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { formatINR, parseAmount } from '../lib/currency'
import { formatTime, nowTime, shortDate, todayISO } from '../lib/dates'
import { useStore } from '../lib/store'
import type { CategoryId, ExpenseItem } from '../types'
import { CategoryGlyph } from './CategoryGlyph'
import { CategoryPicker } from './CategoryPicker'
import { Sheet } from './Sheet'

export function AddExpense({
  open,
  onClose,
  presetName,
  presetAmount,
  presetCategory,
}: {
  open: boolean
  onClose: () => void
  presetName?: string
  presetAmount?: string
  presetCategory?: CategoryId
}) {
  const { matchesFor, addToExisting, createNew, metrics, ensureCategory } = useStore()
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<CategoryId>('snacks')
  const [notes, setNotes] = useState('')
  const [quantity, setQuantity] = useState('')
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [customCategoryName, setCustomCategoryName] = useState('')

  useEffect(() => {
    if (!open) return
    setName(presetName ?? '')
    setAmount(presetAmount ?? '')
    setCategory(presetCategory ?? 'snacks')
    setNotes('')
    setQuantity('')
    setError('')
    setMode('existing')
    setCustomCategoryName('')
  }, [open, presetName, presetAmount, presetCategory])

  const matches = useMemo(() => matchesFor(name), [matchesFor, name])
  const primary = matches[0]
  const useExisting = Boolean(primary) && mode === 'existing'

  useEffect(() => {
    if (primary) {
      setCategory(primary.category)
      setMode('existing')
    }
  }, [primary?.id])

  function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Expense name cannot be empty.')
      return
    }
    const value = parseAmount(amount)
    if (value === null || value <= 0) {
      setError('Amount must be greater than zero.')
      return
    }
    const qty = quantity.trim() ? Number(quantity) : null
    if (qty !== null && (!Number.isFinite(qty) || qty <= 0)) {
      setError('Quantity must be greater than zero.')
      return
    }

    let resolvedCategory = category
    if (category === 'other' && customCategoryName.trim()) {
      resolvedCategory = ensureCategory(customCategoryName)
    }

    if (useExisting && primary) {
      addToExisting({
        itemId: primary.id,
        amount: value,
        date: todayISO(),
        time: nowTime(),
        notes,
        quantity: qty,
        category: resolvedCategory,
      })
    } else {
      createNew({
        name: trimmed,
        amount: value,
        category: resolvedCategory,
        date: todayISO(),
        time: nowTime(),
        notes,
        quantity: qty,
      })
    }
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Add Expense">
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>Expense name</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Lays"
            autoComplete="off"
          />
        </label>

        {primary ? (
          <MatchCard item={primary} selected={useExisting} onSelect={setMode} />
        ) : null}

        <label className="field">
          <span>Amount (₹)</span>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="20"
          />
        </label>

        <CategoryPicker
          value={category}
          onChange={setCategory}
          customName={customCategoryName}
          onCustomName={setCustomCategoryName}
        />

        <p className="locked-stamp">
          Date & time are set automatically · {shortDate(todayISO())} {formatTime(nowTime())}
        </p>

        <label className="field">
          <span>Notes (optional)</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any details" />
        </label>
        <label className="field">
          <span>Quantity (optional)</span>
          <input
            inputMode="numeric"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="1"
          />
        </label>

        {error ? <p className="error">{error}</p> : null}

        <button className="btn btn-primary btn-block" type="submit">
          {useExisting && primary ? `Add to ${primary.name}` : 'Save expense'}
        </button>
        {metrics.groups.length === 0 ? (
          <p className="hint">This will be your first tracked purchase this month.</p>
        ) : null}
      </form>
    </Sheet>
  )
}

function MatchCard({
  item,
  selected,
  onSelect,
}: {
  item: ExpenseItem
  selected: boolean
  onSelect: (mode: 'existing' | 'new') => void
}) {
  const { data } = useStore()
  const purchases = data.purchases.filter((p) => p.itemId === item.id)
  const total = purchases.reduce((s, p) => s + p.amount, 0)
  return (
    <div className="match-card">
      <p className="match-kicker">Existing expense found</p>
      <div className="match-row">
        <CategoryGlyph category={item.category} />
        <div>
          <strong>{item.name} already exists</strong>
          <p>
            {purchases.length} purchase{purchases.length === 1 ? '' : 's'} · {formatINR(total)} total
          </p>
        </div>
      </div>
      <div className="row-actions">
        <button
          type="button"
          className={`btn ${selected ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => onSelect('existing')}
        >
          Add to {item.name}
        </button>
        <button
          type="button"
          className={`btn ${!selected ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => onSelect('new')}
        >
          Create new item
        </button>
      </div>
    </div>
  )
}
