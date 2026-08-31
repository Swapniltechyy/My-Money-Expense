import { formatINR } from '../lib/currency'
import { dailyTotals, categoryTotals } from '../lib/calc'
import { useStore } from '../lib/store'
import { shortDate } from '../lib/dates'
import { CategoryGlyph } from '../components/CategoryGlyph'

export function AnalyticsPage({ onClose }: { onClose?: () => void }) {
  const { metrics, data } = useStore()
  const period = metrics.period
      const cats = categoryTotals(metrics.scoped, data.items, data.customCategories)
  const trend = period
    ? dailyTotals(metrics.scoped, period.startDate, period.endDate)
    : []
  const top = metrics.groups.slice().sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 6)
  const maxTrend = Math.max(1, ...trend.map((d) => d.amount))
  const totalCat = cats.reduce((s, c) => s + c.amount, 0) || 1

  return (
    <div className="page pad-top">
      {onClose ? (
        <button className="text-link" onClick={onClose}>
          Back
        </button>
      ) : null}
      <h1 className="page-title">Analytics</h1>

      <section className="card">
        <h2>Overview</h2>
        <dl className="overview-grid">
          <div>
            <dt>Monthly budget</dt>
            <dd>{formatINR(metrics.budget)}</dd>
          </div>
          <div>
            <dt>Total spent</dt>
            <dd className="spend">{formatINR(metrics.spent)}</dd>
          </div>
          <div>
            <dt>Remaining</dt>
            <dd className={metrics.remaining < 0 ? 'spend' : 'remain'}>{formatINR(metrics.remaining)}</dd>
          </div>
          <div>
            <dt>Budget used</dt>
            <dd>{metrics.status.utilization.toFixed(0)}%</dd>
          </div>
          <div>
            <dt>Avg daily spending</dt>
            <dd>{formatINR(metrics.avgDaily)}</dd>
          </div>
        </dl>
        <div className={`util-bar ${metrics.status.level}`}>
          <span style={{ width: `${Math.min(100, metrics.status.utilization)}%` }} />
        </div>
      </section>

      <section className="card">
        <h2>Category breakdown</h2>
        {cats.length === 0 ? (
          <p className="muted">Spend something to see the breakdown.</p>
        ) : (
          <div className="donut-layout">
            <Donut segments={cats.map((c) => ({ color: c.color, value: c.amount }))} />
            <ul className="legend">
              {cats.map((c) => (
                <li key={c.id}>
                  <i style={{ background: c.color }} />
                  {c.label}
                  <span>{formatINR(c.amount)}</span>
                  <em>{Math.round((c.amount / totalCat) * 100)}%</em>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Spending trend</h2>
        {trend.every((d) => d.amount === 0) ? (
          <p className="muted">No spending in this period yet.</p>
        ) : (
          <div className="bars" role="img" aria-label="Daily spending">
            {trend.map((d) => (
              <div key={d.date} className="bar-col" title={`${shortDate(d.date)} ${formatINR(d.amount)}`}>
                <span style={{ height: `${(d.amount / maxTrend) * 100}%` }} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2>Top expenses</h2>
        {top.length === 0 ? (
          <p className="muted">No expenses yet.</p>
        ) : (
          <ul className="top-list">
            {top.map((g) => (
              <li key={g.item.id}>
                <CategoryGlyph category={g.item.category} size={32} />
                <span>{g.item.name}</span>
                <strong>{formatINR(g.totalAmount)}</strong>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Donut({ segments }: { segments: { color: string; value: number }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  let acc = 0
  const stops = segments.map((s) => {
    const start = (acc / total) * 100
    acc += s.value
    const end = (acc / total) * 100
    return `${s.color} ${start}% ${end}%`
  })
  return (
    <div
      className="donut"
      style={{ background: `conic-gradient(${stops.join(',')})` }}
      aria-hidden
    />
  )
}
