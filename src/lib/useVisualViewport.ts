import { useEffect } from 'react'

export function useVisualViewportVars() {
  useEffect(() => {
    const sync = () => {
      const vv = window.visualViewport
      const height = Math.round(vv?.height ?? window.innerHeight)
      const top = Math.round(vv?.offsetTop ?? 0)
      const root = document.documentElement
      root.style.setProperty('--app-height', `${height}px`)
      root.style.setProperty('--app-top', `${top}px`)
    }
    sync()
    const vv = window.visualViewport
    vv?.addEventListener('resize', sync)
    vv?.addEventListener('scroll', sync)
    window.addEventListener('orientationchange', sync)
    return () => {
      vv?.removeEventListener('resize', sync)
      vv?.removeEventListener('scroll', sync)
      window.removeEventListener('orientationchange', sync)
    }
  }, [])
}
