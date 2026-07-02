import { useTheme } from '../lib/theme'
import { Sun, Moon } from './icons'

// Light/dark switch, styled to sit inline next to the notification bell.
export function ThemeToggle({ className = '', round = false }: { className?: string; round?: boolean }) {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'
  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className={`w-9 h-9 ${round ? 'rounded-full border border-[var(--line-2)]' : 'rounded-[11px]'} bg-[var(--fill)] flex items-center justify-center text-[var(--ink-2)] hover:text-[var(--ink)] ${className}`}
    >
      {isDark ? <Sun width={17} height={17} /> : <Moon width={16} height={16} />}
    </button>
  )
}
