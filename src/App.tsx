import { useEffect, useMemo, useState } from 'react'
import { AddExpense } from './components/AddExpense'
import { ExpenseDetail } from './components/ExpenseDetail'
import { IconClose, IconHome, IconHistory, IconPlus, IconSettings, IconChart, IconWallet, IconPeople } from './components/Icons'
import { QuickAdd } from './components/QuickAdd'
import { ConfirmDialog } from './components/Sheet'
import { ToastNotice } from './components/Toast'
import { StoreProvider, useStore } from './lib/store'
import { AdditionalPage } from './pages/AdditionalPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { BudgetPage } from './pages/BudgetPage'
import { HistoryPage } from './pages/HistoryPage'
import { HomePage } from './pages/HomePage'
import { SettingsPage } from './pages/SettingsPage'
import { useVisualViewportVars } from './lib/useVisualViewport'
import type { ExpenseDraft, ExpenseItem, TabId } from './types'

type Screen = TabId | 'analytics' | 'additional'

function ThemedApp() {
  const { data, toast, deleteItem } = useStore()
  useVisualViewportVars()
  const [tab, setTab] = useState<Screen>('home')
  const [addOpen, setAddOpen] = useState(false)
  const [addDraft, setAddDraft] = useState<ExpenseDraft | null>(null)
  const [quickItem, setQuickItem] = useState<ExpenseItem | null>(null)
  const [detailItemId, setDetailItemId] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [itemMenu, setItemMenu] = useState<ExpenseItem | null>(null)
  const [confirmDeleteItem, setConfirmDeleteItem] = useState(false)

  const resolvedTheme = useMemo(() => {
    if (data.settings.theme !== 'system') return data.settings.theme
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }, [data.settings.theme])

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme
  }, [resolvedTheme])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if (data.settings.theme === 'system') {
        document.documentElement.dataset.theme = mq.matches ? 'dark' : 'light'
      }
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [data.settings.theme])

  const detailItem = data.items.find((i) => i.id === detailItemId) ?? null

  useEffect(() => {
    if (detailItemId && !detailItem) setDetailItemId(null)
  }, [detailItem, detailItemId])

  function goHome() {
    setTab('home')
    setMenuOpen(false)
    setDetailItemId(null)
    setItemMenu(null)
    setAddOpen(false)
    setAddDraft(null)
    setQuickItem(null)
    window.scrollTo(0, 0)
  }

  return (
    <div className="shell">
      <div className="frame">
        <nav className="bottom-nav" aria-label="Primary">
          <button className={tab === 'home' ? 'active' : ''} onClick={goHome}>
            <IconHome />
            Home
          </button>
          <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>
            <IconHistory />
            History
          </button>
          <button
            className="nav-add"
            onClick={() => {
              setAddDraft(null)
              setAddOpen(true)
            }}
            aria-label="Add expense"
          >
            <IconPlus />
          </button>
          <button className={tab === 'budget' ? 'active' : ''} onClick={() => setTab('budget')}>
            <IconWallet />
            Budget
          </button>
          <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>
            <IconSettings />
            Settings
          </button>
        </nav>
        <div className="content">
          {tab === 'home' ? (
            <HomePage
              onMenu={() => setMenuOpen(true)}
              onHero={goHome}
              onAnalytics={() => setTab('analytics')}
              onBudget={() => setTab('budget')}
              onAdd={(draft) => {
                setAddDraft(draft ?? null)
                setAddOpen(true)
              }}
              onQuickAdd={setQuickItem}
              onOpenItem={(item) => setDetailItemId(item.id)}
              onItemMenu={setItemMenu}
            />
          ) : null}
          {tab === 'history' ? <HistoryPage /> : null}
          {tab === 'budget' ? <BudgetPage /> : null}
          {tab === 'additional' ? <AdditionalPage /> : null}
          {tab === 'settings' ? <SettingsPage /> : null}
          {tab === 'analytics' ? <AnalyticsPage onClose={goHome} /> : null}
        </div>
      </div>

      {menuOpen ? (
        <div className="drawer-root">
          <button className="sheet-backdrop" onClick={() => setMenuOpen(false)} aria-label="Close menu" />
          <aside className="drawer">
            <header>
              <strong>My Money</strong>
              <button className="icon-btn" onClick={() => setMenuOpen(false)} aria-label="Close">
                <IconClose />
              </button>
            </header>
            <button onClick={goHome}>
              <IconHome /> Home
            </button>
            <button
              onClick={() => {
                setTab('analytics')
                setMenuOpen(false)
              }}
            >
              <IconChart /> Analytics
            </button>
            <button
              onClick={() => {
                setTab('budget')
                setMenuOpen(false)
              }}
            >
              <IconWallet /> Budget
            </button>
            <button
              onClick={() => {
                setTab('history')
                setMenuOpen(false)
              }}
            >
              <IconHistory /> History
            </button>
            <button onClick={goHome}>
              <IconPeople /> Additional
            </button>
            <button
              onClick={() => {
                setTab('settings')
                setMenuOpen(false)
              }}
            >
              <IconSettings /> Settings
            </button>
          </aside>
        </div>
      ) : null}

      {itemMenu ? (
        <div className="drawer-root bottom">
          <button className="sheet-backdrop" onClick={() => setItemMenu(null)} />
          <div className="action-sheet">
            <p>{itemMenu.name}</p>
            <button
              onClick={() => {
                setDetailItemId(itemMenu.id)
                setItemMenu(null)
              }}
            >
              View details
            </button>
            <button
              onClick={() => {
                setQuickItem(itemMenu)
                setItemMenu(null)
              }}
            >
              Add purchase
            </button>
            <button className="danger" onClick={() => setConfirmDeleteItem(true)}>
              Delete item
            </button>
            <button onClick={() => setItemMenu(null)}>Cancel</button>
          </div>
        </div>
      ) : null}

      <AddExpense
        open={addOpen}
        presetName={addDraft?.name}
        presetAmount={addDraft?.amount}
        presetCategory={addDraft?.category}
        onClose={() => {
          setAddOpen(false)
          setAddDraft(null)
        }}
      />
      <QuickAdd open={Boolean(quickItem)} item={quickItem} onClose={() => setQuickItem(null)} />
      <ExpenseDetail
        open={Boolean(detailItem)}
        item={detailItem}
        onClose={() => setDetailItemId(null)}
        onQuickAdd={() => detailItem && setQuickItem(detailItem)}
      />
      <ConfirmDialog
        open={confirmDeleteItem}
        title={`Remove ${itemMenu?.name ?? 'item'}?`}
        message="All purchases for this item will be deleted."
        danger
        confirmLabel="Remove"
        onCancel={() => setConfirmDeleteItem(false)}
        onConfirm={() => {
          if (itemMenu) deleteItem(itemMenu.id)
          setConfirmDeleteItem(false)
          setItemMenu(null)
        }}
      />
      <ToastNotice toast={toast} />
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <ThemedApp />
    </StoreProvider>
  )
}
