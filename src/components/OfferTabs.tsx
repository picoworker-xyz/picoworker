import { useNavigate, useLocation } from 'react-router-dom'

// Both offerwalls sit behind the single "Offers" nav entry. Adding a nav item
// per provider does not scale — we already have a third (Paymentwall) waiting.
const TABS: { label: string; path: string }[] = [
  { label: 'Featured', path: '/offers/taskwall' },
  { label: 'Worldwide', path: '/offers/worldwide' },
]

export function OfferTabs() {
  const nav = useNavigate()
  const loc = useLocation()
  return (
    <div className="mb-5 inline-flex rounded-full bg-[var(--fill-2)] p-1">
      {TABS.map((t) => {
        const on = loc.pathname === t.path
        return (
          <button
            key={t.path}
            onClick={() => nav(t.path)}
            className={`rounded-full px-4 py-2 font-head text-[13px] ${
              on ? 'bg-[var(--accent)] font-extrabold text-[var(--accent-ink)]' : 'font-bold text-[var(--ink-3)]'
            }`}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
