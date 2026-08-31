import { useMemo, useState } from 'react'
import { selectableCategories, resolveCategory } from '../lib/categories'
import { formatINR } from '../lib/currency'
import { formatTime, shortDate } from '../lib/dates'
import { historySummaries } from '../lib/calc'
import { useStore } from '../lib/store'
import type { CategoryId, HistoryGroupBy, HistorySort } from '../types'
import { CategoryGlyph } from '../components/CategoryGlyph'
import { IconSearch } from '../components/Icons'

export function HistoryPage() {
  const { data } = useStore()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryId | 'all'>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [groupBy, setGroupBy] = useState<HistoryGroupBy>('day')
  const [sort, setSort] = useState<HistorySort>('newest')

  const summaries = historySummaries(data.purchases)
  const itemMap = useMemo(() => new Map(data.items.map((i) => [i.id, i])), [data.items])

  const filtered = useMemo(() => {
    let rows = data.purchases.filter((p) => {
      const item = itemMap.get(p.itemId)
      if (!item) return false
      if (query && !item.name.toLowerCase().includes(query.trim().toLowerCase()) && !p.notes.toLowerCase().includes(query.trim().toLowerCase())) {
        return false
      }
      if (category !== 'all' && item.category !== category) return false
      if (from && p.date < from) return false
      if (to && p.date > to) return false
      return true
    })
    rows = [...rows].sort((a, b) => {
      if (sort === 'newest') return `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`)
      if (sort === 'oldest') return `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)
      if (sort === 'highest') return b.amount - a.amount
      return a.amount - b.amount
    })
    return rows
  }, [data.purchases, itemMap, query, category, from, to, sort])

  const groups = useMemo(() => {
    if (groupBy === 'all') return [{ key: 'All purchases', rows: filtered }]
    const map = new Map<string, typeof filtered>()
    for (const row of filtered) {
      const item = itemMap.get(row.itemId)
      const key = groupBy === 'day' ? row.date : (item?.category ?? 'other')
      const list = map.get(key) ?? []
      list.push(row)
      map.set(key, list)
    }
    return [...map.entries()].map(([key, rows]) => ({
      key:
        groupBy === 'day'
          ? shortDate(key)
          : resolveCategory(key, data.customCategories).label,
      rows,
    }))
  }, [filtered, groupBy, itemMap, data.customCategories])

  return (
    <div className="page pad-top">
      <h1 className="page-title">History</h1>
      <div className="summary-grid">
        <Summary label="Today" value={summaries.today} />
        <Summary label="This Week" value={summaries.week} />
        <Summary label="This Month" value={summaries.month} />
      </div>

      <label className="search-field">
        <IconSearch size={18} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search purchases" />
      </label>

      <div className="filters">
        <select value={category} onChange={(e) => setCategory(e.target.value as CategoryId | 'all')}>
          <option value="all">All categories</option>
          {selectableCategories(data.customCategories, data.hiddenCategoryIds ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as HistoryGroupBy)}>
          <option value="day">Grouped by day</option>
          <option value="category">Grouped by category</option>
          <option value="all">All purchases</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as HistorySort)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="highest">Highest amount</option>
          <option value="lowest">Lowest amount</option>
        </select>
      </div>
      <div className="field-row">
        <label className="field">
          <span>From</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="field">
          <span>To</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <p>No purchases match these filters.</p>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.key} className="history-group">
            <h3>{g.key}</h3>
            {g.rows.map((p) => {
              const item = itemMap.get(p.itemId)
              if (!item) return null
              return (
                <article key={p.id} className="history-row">
                  <CategoryGlyph category={item.category} size={36} />
                  <div>
                    <strong>{item.name}</strong>
                    <p className="muted">
                      {shortDate(p.date)} · {formatTime(p.time)}
                      {p.notes ? ` · ${p.notes}` : ''}
                    </p>
                  </div>
                  <strong className="spend">{formatINR(p.amount)}</strong>
                </article>
              )
            })}
          </section>
        ))
      )}
    </div>
  )
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="summary-card">
      <p className="muted">{label}</p>
      <p>{formatINR(value)}</p>
    </div>
  )
}
