import { useState } from 'react'
import { selectableCategories } from '../lib/categories'
import { useStore } from '../lib/store'
import type { CategoryId } from '../types'
import type { CategoryMeta } from '../lib/categories'
import { CategoryGlyph } from './CategoryGlyph'
import { IconClose } from './Icons'
import { ConfirmDialog } from './Sheet'

export function CategoryPicker({
  value,
  onChange,
  customName,
  onCustomName,
  compact,
}: {
  value: CategoryId
  onChange: (id: CategoryId) => void
  customName?: string
  onCustomName?: (name: string) => void
  compact?: boolean
}) {
  const { data, ensureCategory, removeCategory } = useStore()
  const [localName, setLocalName] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState<CategoryMeta | null>(null)
  const options = selectableCategories(data.customCategories, data.hiddenCategoryIds ?? [])
  const otherOpen = value === 'other'
  const name = customName ?? localName
  const setName = onCustomName ?? setLocalName

  function addNamedCategory() {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Enter a category name, like Friend or miscellaneous.')
      return
    }
    const id = ensureCategory(trimmed)
    onChange(id)
    setName('')
    setError('')
  }

  return (
    <fieldset className="field">
      <legend>Category</legend>
      <div className={`cat-grid ${compact ? 'compact' : ''}`}>
        {options.map((cat) => (
          <div key={cat.id} className={`cat-chip ${value === cat.id ? 'active' : ''}`}>
            <button
              type="button"
              className="cat-chip-main"
              onClick={() => {
                onChange(cat.id)
                setError('')
                if (cat.id !== 'other') setName('')
              }}
            >
              <CategoryGlyph category={cat.id} size={32} />
              <span>{cat.label}</span>
            </button>
            {cat.id !== 'other' ? (
              <button
                type="button"
                className="cat-remove"
                aria-label={`Remove ${cat.label}`}
                onClick={() => setPending(cat)}
              >
                <IconClose size={14} />
              </button>
            ) : null}
          </div>
        ))}
      </div>
      {otherOpen ? (
        <div className="other-category">
          <p className="hint">Name this category — it will appear in the list above.</p>
          <div className="other-row">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Friend, miscellaneous…"
              aria-label="Custom category name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addNamedCategory()
                }
              }}
            />
            <button type="button" className="btn btn-primary sm" onClick={addNamedCategory}>
              Add
            </button>
          </div>
          {error ? <p className="error">{error}</p> : null}
        </div>
      ) : null}
      <ConfirmDialog
        open={Boolean(pending)}
        title={`Remove ${pending?.label ?? 'category'}?`}
        message="This category will be removed from the list. Expenses in it will move to Other."
        danger
        confirmLabel="Remove"
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (!pending) return
          const id = pending.id
          removeCategory(id)
          if (value === id) onChange('other')
          setPending(null)
        }}
      />
    </fieldset>
  )
}
