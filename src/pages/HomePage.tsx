import { formatINR } from '../lib/currency'
import { formatTime, monthLabel, shortDate } from '../lib/dates'
import { useStore } from '../lib/store'
import type { CategoryId, ExpenseItem, GroupedExpense } from '../types'
import { CategoryGlyph } from '../components/CategoryGlyph'
import { FrequentRow, HomeQuickAdd } from '../components/QuickAdd'
import { IconCalendar, IconChart, IconEdit, IconMenu, IconMore, IconPlus } from '../components/Icons'
import { WasHistory } from '../components/WasHistory'

export function HomePage({
  onMenu,
  onAnalytics,
  onBudget,
  onAdd,
  onQuickAdd,
  onOpenItem,
  onItemMenu,
}: {
  onMenu: () => void
  onAnalytics: () => void
  onBudget: () => void
  onAdd: (draft?: { name?: string; amount?: string; category?: CategoryId }) => void
  onQuickAdd: (item: ExpenseItem) => void
  onOpenItem: (item: ExpenseItem) => void
  onItemMenu: (item: ExpenseItem) => void
}) {
  const { metrics, ready, data } = useStore()
  const { period, spent, remaining, daysLeft, safeDaily, status, groups } = metrics
  const remainingTone = remaining < 0 ? 'spend' : 'remain'

  if (!ready) {
    return (
      <div className="page">
        <div className="skeleton-card" />
        <div className="skeleton-card" />
      </div>
    )
  }

  return (
    <div className="page">
      <header className="app-header">
        <button className="icon-btn light" onClick={onMenu} aria-label="Menu">
          <IconMenu />
        </button>
        <h1>My Money</h1>
        <button className="icon-btn light" onClick={onAnalytics} aria-label="Analytics">
          <IconChart />
        </button>
      </header>

      <section className={`money-card status-${status.level}`}>
        <div className="money-top">
          <div>
            <p className="kicker">Monthly Money</p>
            <p className="money-lg">{formatINR(metrics.budget)}</p>
            {period?.amountHistory?.length ? <WasHistory amounts={period.amountHistory} /> : null}
          </div>
          <button className="pill-btn" onClick={onBudget}>
            <IconEdit size={16} /> Edit
          </button>
        </div>
        <div className="metric-grid">
          <div>
            <p className="muted">Days Left</p>
            <p className="metric-value">
              {daysLeft}
              <button className="icon-btn tiny" onClick={onBudget} aria-label="Budget calendar">
                <IconCalendar size={16} />
              </button>
            </p>
          </div>
          <div>
            <p className="muted">Spent</p>
            <p className="metric-value spend">{formatINR(spent)}</p>
          </div>
          <div>
            <p className="muted">Remaining</p>
            <p className={`metric-value ${remainingTone}`}>{formatINR(remaining)}</p>
          </div>
        </div>
        <div className="safe-box">
          <p className="muted">Safe to Spend Daily</p>
          <p className="safe-value">
            {daysLeft === 0 && remaining <= 0 ? '—' : formatINR(safeDaily)}
          </p>
          <p className={`status-label ${status.level}`}>{status.label}</p>
        </div>
        {period ? (
          <p className="period-caption">
            {monthLabel(period.startDate)} · {shortDate(period.startDate)} – {shortDate(period.endDate)}
          </p>
        ) : null}
      </section>

      {data.settings.notifyBudgetWarnings && status.level !== 'healthy' ? (
        <div className={`banner ${status.level}`}>{status.label}</div>
      ) : null}
      {data.settings.notifyDailyReminders ? (
        <div className="banner info">Safe to spend {formatINR(safeDaily)} today.</div>
      ) : null}

      <HomeQuickAdd onAddNew={onAdd} />
      <FrequentRow onPick={(id) => {
        const g = groups.find((x) => x.item.id === id)
        if (g) onQuickAdd(g.item)
      }} />

      <section className="expenses-head">
        <h2>Expenses</h2>
        <button className="btn btn-primary sm" onClick={onAdd}>
          Add Expense
        </button>
      </section>

      {groups.length === 0 ? (
        <div className="empty">
          <p>No expenses yet this month.</p>
          <p className="muted">Add your first purchase — repeat buys stay grouped in one row.</p>
          <button className="btn btn-primary" onClick={onAdd}>
            Add Expense
          </button>
        </div>
      ) : (
        <ul className="expense-list">
          {groups.map((g) => (
            <ExpenseRow
              key={g.item.id}
              group={g}
              onOpen={() => onOpenItem(g.item)}
              onPlus={() => onQuickAdd(g.item)}
              onMore={() => onItemMenu(g.item)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function ExpenseRow({
  group,
  onOpen,
  onPlus,
  onMore,
}: {
  group: GroupedExpense
  onOpen: () => void
  onPlus: () => void
  onMore: () => void
}) {
  const last = group.purchases[0]
  return (
    <li className="expense-row">
      <button className="expense-main" onClick={onOpen}>
        <CategoryGlyph category={group.item.category} />
        <div className="expense-copy">
          <strong>{group.item.name}</strong>
          <p>
            {group.purchaseCount} purchase{group.purchaseCount === 1 ? '' : 's'}
            {last ? ` · ${shortDate(last.date)} ${formatTime(last.time)}` : ''}
          </p>
        </div>
        <span className="expense-total spend">{formatINR(group.totalAmount)}</span>
      </button>
      <div className="expense-actions">
        <button className="plus-btn" onClick={onPlus} aria-label={`Add another ${group.item.name}`}>
          <IconPlus />
        </button>
        <button className="icon-btn more" onClick={onMore} aria-label="More options">
          <IconMore />
        </button>
      </div>
    </li>
  )
}
