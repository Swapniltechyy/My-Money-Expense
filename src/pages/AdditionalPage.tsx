import { useState, type FormEvent } from 'react'
import { ConfirmDialog } from '../components/Sheet'
import { formatINR, parseAmount } from '../lib/currency'
import { useStore } from '../lib/store'
import type { AdditionalNote } from '../types'

export function AdditionalPage() {
  const { data, addAdditional, updateAdditional, deleteAdditional } = useStore()
  const [personName, setPersonName] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<AdditionalNote | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const list = data.additionalNotes ?? []

  function resetForm() {
    setPersonName('')
    setAmount('')
    setNotes('')
    setEditing(null)
    setError('')
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const name = personName.trim()
    if (!name) {
      setError('Enter a person name.')
      return
    }
    const value = parseAmount(amount)
    if (value === null || value <= 0) {
      setError('Amount must be greater than zero.')
      return
    }
    if (editing) {
      updateAdditional({ ...editing, personName: name, amount: value, notes: notes.trim() })
    } else {
      addAdditional(name, value, notes)
    }
    resetForm()
  }

  return (
    <div className="page pad-top">
      <h1 className="page-title">Additional</h1>
      <p className="hint additional-intro">
        Personal notes only. These amounts are not part of your monthly budget or spending.
      </p>

      <form className="card form" onSubmit={submit}>
        <label className="field">
          <span>Person name</span>
          <input
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            placeholder="e.g. Anna"
            autoComplete="name"
          />
        </label>
        <label className="field">
          <span>Amount (₹)</span>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="500"
          />
        </label>
        <label className="field">
          <span>Note (optional)</span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any reminder"
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn btn-primary btn-block" type="submit">
          {editing ? 'Update note' : 'Save note'}
        </button>
        {editing ? (
          <button className="btn btn-ghost btn-block" type="button" onClick={resetForm}>
            Cancel edit
          </button>
        ) : null}
      </form>

      {list.length === 0 ? (
        <div className="empty">
          <p>No additional notes yet.</p>
          <p className="muted">Use this for loans, reminders, or anything outside monthly expenses.</p>
        </div>
      ) : (
        <ul className="additional-list">
          {list.map((note) => (
            <li key={note.id} className="card additional-row">
              <div>
                <strong>{note.personName}</strong>
                <p className="spend">{formatINR(note.amount)}</p>
                {note.notes ? <p className="muted">{note.notes}</p> : null}
              </div>
              <div className="row-actions tight">
                <button
                  type="button"
                  className="text-link"
                  onClick={() => {
                    setEditing(note)
                    setPersonName(note.personName)
                    setAmount(String(note.amount))
                    setNotes(note.notes)
                    setError('')
                  }}
                >
                  Edit
                </button>
                <button type="button" className="text-link danger" onClick={() => setConfirmId(note.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(confirmId)}
        title="Remove this note?"
        message="This does not change your monthly expenses."
        danger
        confirmLabel="Remove"
        onCancel={() => setConfirmId(null)}
        onConfirm={() => {
          if (confirmId) deleteAdditional(confirmId)
          setConfirmId(null)
          if (editing?.id === confirmId) resetForm()
        }}
      />
    </div>
  )
}
