import { useState } from 'react'
import { formatINR, parseAmount } from '../lib/currency'
import { purchasesInPeriod, remainingMoney, sumAmounts } from '../lib/calc'
import { currentMonthBounds, monthLabel } from '../lib/dates'
import { useStore } from '../lib/store'
import { ConfirmDialog } from '../components/Sheet'
import { WasHistory } from '../components/WasHistory'

export function BudgetPage({ onClose, embedded }: { onClose?: () => void; embedded?: boolean }) {
  const {
    data,
    metrics,
    updatePeriod,
    startNewPeriod,
    switchPeriod,
    deletePeriod,
    updateSettings,
  } = useStore()
  const period = metrics.period
  const [amount, setAmount] = useState(period ? String(period.amount) : '15000')
  const [startDate, setStartDate] = useState(period?.startDate ?? currentMonthBounds().startDate)
  const [endDate, setEndDate] = useState(period?.endDate ?? currentMonthBounds().endDate)
  const [error, setError] = useState('')
  const [confirmPeriod, setConfirmPeriod] = useState<string | null>(null)
  const [newAmount, setNewAmount] = useState(period ? String(period.amount) : '15000')

  function saveCurrent() {
    const value = parseAmount(amount)
    if (value === null || value <= 0) {
      setError('Enter an amount greater than zero.')
      return
    }
    if (endDate < startDate) {
      setError('End date must be on or after the start date.')
      return
    }
    updatePeriod({ amount: value, startDate, endDate })
    setError('')
  }

  function startNew() {
    const value = parseAmount(newAmount)
    if (value === null || value <= 0) {
      setError('Enter an amount greater than zero.')
      return
    }
    const bounds = currentMonthBounds()
    startNewPeriod(value, bounds.startDate, bounds.endDate)
    setStartDate(bounds.startDate)
    setEndDate(bounds.endDate)
    setAmount(String(value))
  }

  return (
    <div className={embedded ? 'stack' : 'page pad-top'}>
      {onClose ? (
        <button className="text-link" onClick={onClose}>
          Back
        </button>
      ) : null}
      {embedded ? null : <h1 className="page-title">Budget</h1>}

      <section className="card">
        <h2>Monthly budget</h2>
        <p className="muted">Your usual money for this month.</p>
        <label className="field">
          <span>Amount (₹)</span>
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        {period?.amountHistory?.length ? <WasHistory amounts={period.amountHistory} /> : null}
        <div className="field-row">
          <label className="field">
            <span>From</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label className="field">
            <span>To</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
        </div>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn btn-primary btn-block" onClick={saveCurrent}>
          Save monthly budget
        </button>
        {period && period.carryOverApplied > 0 ? (
          <p className="hint">Includes {formatINR(period.carryOverApplied)} carried over from last period.</p>
        ) : null}
      </section>

      <section className="card">
        <h2>Carry over</h2>
        <label className="toggle">
          <input
            type="checkbox"
            checked={data.settings.carryOverUnused}
            onChange={(e) => updateSettings({ carryOverUnused: e.target.checked })}
          />
          Unused monthly money carries into the next period
        </label>
      </section>

      <section className="card">
        <h2>Start a new month</h2>
        <p className="muted">Saves this month and starts a fresh monthly budget.</p>
        <label className="field">
          <span>New monthly amount</span>
          <input inputMode="decimal" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} />
        </label>
        <button className="btn btn-primary btn-block" onClick={startNew}>
          Start new month
        </button>
      </section>

      <section className="card">
        <h2>Past months</h2>
        <ul className="period-list">
          {[...data.periods].reverse().map((p) => {
            const spent = sumAmounts(purchasesInPeriod(data.purchases, p))
            const remaining = remainingMoney(p, spent)
            const active = p.id === data.currentPeriodId
            return (
              <li key={p.id} className={active ? 'active' : ''}>
                <button type="button" onClick={() => switchPeriod(p.id)}>
                  <strong>{monthLabel(p.startDate)}</strong>
                  <p>
                    {formatINR(spent)} spent · {formatINR(remaining)} left
                  </p>
                  {active ? <em>Current</em> : null}
                </button>
                {!active ? (
                  <button className="text-link danger" onClick={() => setConfirmPeriod(p.id)}>
                    Remove
                  </button>
                ) : null}
              </li>
            )
          })}
        </ul>
      </section>

      <ConfirmDialog
        open={Boolean(confirmPeriod)}
        title="Remove this month?"
        message="The month will be removed. Purchases stay in history."
        danger
        confirmLabel="Remove"
        onCancel={() => setConfirmPeriod(null)}
        onConfirm={() => {
          if (confirmPeriod) deletePeriod(confirmPeriod)
          setConfirmPeriod(null)
        }}
      />
    </div>
  )
}
