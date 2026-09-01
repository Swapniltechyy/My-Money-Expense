import { useRef, useState } from 'react'
import { parseImport } from '../lib/storage'
import { useStore } from '../lib/store'
import { ConfirmDialog } from '../components/Sheet'
import { ExportExpenses } from '../components/ExportExpenses'
import { IconPower } from '../components/Icons'
import { getAccount } from '../lib/auth'
import { BudgetPage } from './BudgetPage'

export function SettingsPage({ onLogout }: { onLogout: () => void }) {
  const { data, updateSettings, replaceData, resetData } = useStore()
  const account = getAccount()
  const [confirmReset, setConfirmReset] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [importError, setImportError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function onImport(file: File | undefined) {
    if (!file) return
    try {
      const text = await file.text()
      replaceData(parseImport(text))
      setImportError('')
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Could not import this file.')
    }
  }

  return (
    <div className="page pad-top">
      <h1 className="page-title">Settings</h1>

      <section className="card">
        <div className="account-head">
          <h2>Account</h2>
          {account?.name ? <p className="account-name">{account.name}</p> : <span />}
        </div>
        <button className="btn btn-ghost btn-block btn-logout" type="button" onClick={onLogout}>
          <IconPower />
          Log out
        </button>
      </section>

      <section className="card">
        <h2>Appearance</h2>
        <div className="choice-row">
          {(['light', 'dark', 'system'] as const).map((theme) => (
            <button
              key={theme}
              className={`choice ${data.settings.theme === theme ? 'active' : ''}`}
              onClick={() => updateSettings({ theme })}
            >
              {theme[0].toUpperCase() + theme.slice(1)}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Currency</h2>
        <p className="setting-line">
          <strong>Indian Rupee</strong>
          <span>₹ INR</span>
        </p>
      </section>

      <BudgetPage embedded />

      <section className="card">
        <h2>Notifications</h2>
        <label className="toggle">
          <input
            type="checkbox"
            checked={data.settings.notifyBudgetWarnings}
            onChange={(e) => updateSettings({ notifyBudgetWarnings: e.target.checked })}
          />
          Budget warnings
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={data.settings.notifyDailyReminders}
            onChange={(e) => updateSettings({ notifyDailyReminders: e.target.checked })}
          />
          Daily spending reminders
        </label>
        <p className="hint">Warnings appear on Home when spending crosses 75%, 90%, and 100%.</p>
      </section>

      <section className="card">
        <h2>Data</h2>
        <div className="stack">
          <button className="btn btn-ghost" onClick={() => setExportOpen(true)}>
            Export expenses
          </button>
          <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
            Import expenses
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => onImport(e.target.files?.[0])}
          />
          {importError ? <p className="error">{importError}</p> : null}
          <button className="btn btn-danger" onClick={() => setConfirmReset(true)}>
            Reset data
          </button>
        </div>
      </section>

      <ExportExpenses open={exportOpen} onClose={() => setExportOpen(false)} />
      <ConfirmDialog
        open={confirmReset}
        title="Reset all data?"
        message="This deletes every expense and purchase. This cannot be undone."
        danger
        confirmLabel="Reset"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          resetData()
          setConfirmReset(false)
        }}
      />
    </div>
  )
}
