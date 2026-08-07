import { useNavigate, useLocation } from 'react-router-dom'
import { TASKWALL_PAUSED } from '../lib/taskwall'

// Both offerwalls sit behind the single "Offers" nav entry. Adding a nav item
// per provider does not scale — we already have a third (Paymentwall) waiting.
// Offers leads. It is the only wall on a direct integration: the user id we
// send is the one the network tracks, and device targeting comes from the real
// user agent rather than being pinned to one slot by an intermediary. The other
// two go through a reseller whose redirector rotates the downstream id on every
// click, which its anti-fraud layer reads as multi-accounting and eventually
// blocks the worker's device on.
const TABS: { label: string; path: string }[] = [
  { label: 'Offers', path: '/offers/lootably' },
  { label: 'Surveys', path: '/offers/surveys' },
  { label: 'Worldwide', path: '/offers/worldwide' },
  { label: 'Featured', path: '/offers/taskwall' },
]

export function OfferTabs() {
  const nav = useNavigate()
  const loc = useLocation()
  return (
    <div className="mb-5 inline-flex rounded-full bg-[var(--fill-2)] p-1">
      {TABS.filter((t) => !(TASKWALL_PAUSED && t.path === '/offers/taskwall')).map((t) => {
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
