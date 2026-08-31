import { useEffect, useRef, useState } from 'react'
import { formatINR } from '../lib/currency'

export function WasHistory({ amounts }: { amounts: number[] }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointer(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open])

  if (!amounts.length) return null

  return (
    <div className="was-wrap" ref={wrapRef}>
      <button
        type="button"
        className="was-label"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((value) => !value)}
      >
        was
      </button>
      {open ? (
        <ul className="was-menu" role="listbox">
          {amounts.map((amt, i) => (
            <li key={`${i}-${amt}`} role="option">
              {formatINR(amt)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
