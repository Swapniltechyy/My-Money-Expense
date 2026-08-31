import { useEffect, useMemo, useState } from 'react'
import { formatINR, parseAmount } from '../lib/currency'
import { formatTime, shortDate } from '../lib/dates'
import { itemStats } from '../lib/calc'
import { useStore } from '../lib/store'
import type { CategoryId, ExpenseItem, Purchase } from '../types'
import { CategoryGlyph } from './CategoryGlyph'
import { CategoryPicker } from './CategoryPicker'
import { ConfirmDialog, Sheet } from './Sheet'

export function ExpenseDetail({
  open,
  item,
  onClose,
  onQuickAdd,
}: {
  open: boolean
  item: ExpenseItem | null
  onClose: () => void
  onQuickAdd: () => void
}) {
  const { data, updatePurchase, deletePurchase, updateItem, deleteItem } = useStore()
  const [editing, setEditing] = useState<Purchase | null>(null)
  const [confirmPurchase, setConfirmPurchase] = useState<string | null>(null)
  const [confirmItem, setConfirmItem] = useState(false)
  const [name, setName] = useState(item?.name ?? '')
  const [category, setCategory] = useState<CategoryId>(item?.category ?? 'other')

  useEffect(() => {
    if (!item) return
    setName(item.name)
    setCategory(item.category)
  }, [item?.id, item?.name, item?.category])

  const stats = useMemo(
    () => (item ? itemStats(item.id, data.purchases) : { purchases: [], totalAmount: 0, purchaseCount: 0 }),
    [item, data.purchases],
  )

  const groupedDays = useMemo(() => {
    const map = new Map<string, Purchase[]>()
    const sorted = [...stats.purchases].sort((a, b) =>
      `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`),
    )
    for (const p of sorted) {
      const list = map.get(p.date) ?? []
      list.push(p)
      map.set(p.date, list)
    }
    return [...map.entries()]
  }, [stats.purchases])

  if (!item) return null

  return (
    <>
      <Sheet open={open} onClose={onClose} title={item.name} wide>
        <div className="detail-hero">
          <CategoryGlyph category={item.category} size={52} />
          <div>
            <p className="muted">Total</p>
            <p className="hero-money spend">{formatINR(stats.totalAmount)}</p>
          </div>
          <div>
            <p className="muted">Purchases</p>
            <p className="hero-money">{stats.purchaseCount}</p>
          </div>
        </div>

        <div className="field-row" style={{ marginTop: 8 }}>
          <label className="field">
            <span>Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => name.trim() && updateItem(item.id, name, category)}
            />
          </label>
        </div>
        <CategoryPicker
          compact
          value={category}
          onChange={(id) => {
            setCategory(id)
            updateItem(item.id, name || item.name, id)
          }}
        />

        <button className="btn btn-primary btn-block" onClick={onQuickAdd}>
          Add another purchase
        </button>

        <div className="timeline">
          {groupedDays.map(([date, list]) => (
            <section key={date}>
              <h3>{shortDate(date)}</h3>
              {list.map((p) => (
                <article key={p.id} className="purchase-row">
                  <div>
                    <strong>{formatTime(p.time)}</strong>
                    {p.notes ? <p className="muted">{p.notes}</p> : null}
                    {p.quantity ? <p className="muted">Qty {p.quantity}</p> : null}
                  </div>
                  <strong>{formatINR(p.amount)}</strong>
                  <div className="row-actions tight">
                    <button className="text-link" onClick={() => setEditing(p)}>
                      Edit
                    </button>
                    <button className="text-link danger" onClick={() => setConfirmPurchase(p.id)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </section>
          ))}
        </div>

        <button className="btn btn-ghost btn-block danger" onClick={() => setConfirmItem(true)}>
          Delete all {item.name} purchases
        </button>
      </Sheet>

      <EditPurchase
        key={editing?.id ?? 'closed'}
        purchase={editing}
        onClose={() => setEditing(null)}
        onSave={(next) => {
          updatePurchase(next)
          setEditing(null)
        }}
      />

      <ConfirmDialog
        open={Boolean(confirmPurchase)}
        title="Delete purchase?"
        message="This transaction will be removed and totals will update immediately."
        danger
        onCancel={() => setConfirmPurchase(null)}
        onConfirm={() => {
          if (confirmPurchase) deletePurchase(confirmPurchase)
          setConfirmPurchase(null)
        }}
      />
      <ConfirmDialog
        open={confirmItem}
        title={`Remove ${item.name}?`}
        message="All purchases for this item will be deleted."
        danger
        confirmLabel="Remove"
        onCancel={() => setConfirmItem(false)}
        onConfirm={() => {
          deleteItem(item.id)
          setConfirmItem(false)
          onClose()
        }}
      />
    </>
  )
}

function EditPurchase({
  purchase,
  onClose,
  onSave,
}: {
  purchase: Purchase | null
  onClose: () => void
  onSave: (purchase: Purchase) => void
}) {
  const [amount, setAmount] = useState(purchase ? String(purchase.amount) : '')
  const [date, setDate] = useState(purchase?.date ?? '')
  const [time, setTime] = useState(purchase?.time ?? '')
  const [notes, setNotes] = useState(purchase?.notes ?? '')
  const [error, setError] = useState('')

  if (!purchase) return null

  return (
    <Sheet open onClose={onClose} title="Edit purchase">
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault()
          const value = parseAmount(amount)
          if (value === null || value <= 0) {
            setError('Amount must be greater than zero.')
            return
          }
          onSave({ ...purchase, amount: value, date, time, notes })
        }}
      >
        <label className="field">
          <span>Amount</span>
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="field">
            <span>Time</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
        </div>
        <label className="field">
          <span>Notes</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn btn-primary btn-block" type="submit">
          Save changes
        </button>
      </form>
    </Sheet>
  )
}
