import { useCallback, useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'
const KEY = 'pico-theme'

function stored(): Theme {
  if (typeof localStorage === 'undefined') return 'dark'
  return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark'
}

export function applyTheme(t: Theme) {
  document.documentElement.setAttribute('data-theme', t)
}

// Called once at startup (in main.tsx) so the theme is set before first paint.
export function initTheme() {
  applyTheme(stored())
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(stored)
  useEffect(() => {
    applyTheme(theme)
    try { localStorage.setItem(KEY, theme) } catch { /* ignore */ }
  }, [theme])
  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), [])
  return { theme, toggle }
}
