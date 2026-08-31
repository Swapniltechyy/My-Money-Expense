import { useEffect, useState } from 'react'

export function ToastNotice({ toast }: { toast: { id: string; message: string } | null }) {
  const [shown, setShown] = useState<{ id: string; message: string } | null>(null)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (toast) {
      setShown(toast)
      setLeaving(false)
      return
    }
    setLeaving(true)
    const timer = window.setTimeout(() => {
      setShown(null)
      setLeaving(false)
    }, 320)
    return () => window.clearTimeout(timer)
  }, [toast])

  if (!shown) return null

  return (
    <div className={`toast${leaving ? ' leave' : ''}`} role="status">
      {shown.message}
    </div>
  )
}
