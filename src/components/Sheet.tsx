import { useEffect, type ReactNode } from 'react'
import { IconBack, IconClose } from './Icons'

export function Sheet({
  open,
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="sheet-root" role="dialog" aria-modal="true" aria-label={title}>
      <button className="sheet-backdrop" aria-label="Close" onClick={onClose} />
      <div className={`sheet ${wide ? 'sheet-wide' : ''} ${footer ? 'sheet-with-footer' : ''}`}>
        <div className="sheet-handle" />
        <header className="sheet-head">
          <button className="icon-btn" onClick={onClose} aria-label="Back">
            <IconBack />
          </button>
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </header>
        <div className="sheet-body">{children}</div>
        {footer ? <div className="sheet-footer">{footer}</div> : null}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  danger,
  onCancel,
  onConfirm,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  if (!open) return null
  return (
    <div className="sheet-root confirm-root" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
      <button className="sheet-backdrop" aria-label="Cancel" onClick={onCancel} />
      <div className="confirm-card">
        <h2 id="confirm-title">{title}</h2>
        <p>{message}</p>
        <div className="row-actions">
          <button className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
