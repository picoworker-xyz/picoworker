import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { usd } from '../lib/format'
import { BrandMark } from './layout'
import { Avatar } from './ui'
import { Bolt, Flame, Home, ListIcon, Plus, User, Wallet as WalletIcon } from './icons'

interface NavItem {
  label: string
  path: string
  icon: typeof Bolt
}

const EARNER_NAV: NavItem[] = [
  { label: 'Earn', path: '/', icon: Bolt },
  { label: 'Rewards', path: '/rewards', icon: Flame },
  { label: 'Wallet', path: '/wallet', icon: WalletIcon },
  { label: 'Refer', path: '/refer', icon: User },
]
const BUSINESS_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/business', icon: Home },
  { label: 'New task', path: '/business/create', icon: Plus },
  { label: 'Wallet', path: '/business/add-funds', icon: WalletIcon },
  { label: 'Campaigns', path: '/business', icon: ListIcon },
]

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, wallet, switchMode } = useStore()
  const nav = useNavigate()
  const loc = useLocation()
  if (!profile || !wallet) return null

  const isBiz = profile.mode === 'business'
  const items = isBiz ? BUSINESS_NAV : EARNER_NAV
  const balance = isBiz ? wallet.business_escrow : wallet.earner_balance

  const active = (path: string) =>
    path === '/' || path === '/business' ? loc.pathname === path : loc.pathname.startsWith(path)

  return (
    <div className="min-h-svh flex">
      {/* ===== Desktop sidebar ===== */}
      <aside className="hidden lg:flex flex-col w-[260px] flex-none border-r border-white/7 bg-[rgba(12,13,17,.7)] backdrop-blur sticky top-0 h-svh px-5 py-7">
        <button onClick={() => nav(isBiz ? '/business' : '/')} className="mb-8 text-left">
          <BrandMark size={40} />
        </button>

        <nav className="flex flex-col gap-1">
          {items.map((it) => {
            const on = active(it.path)
            const Icon = it.icon
            return (
              <button
                key={it.label}
                onClick={() => nav(it.path)}
                className={`flex items-center gap-3 px-3 py-[11px] rounded-[12px] text-[14px] font-bold transition-colors ${
                  on ? 'bg-[var(--accent)]/12 text-[var(--accent)]' : 'text-[#9A9CA8] hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon width={19} height={19} />
                {it.label}
              </button>
            )
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-3">
          {/* balance card */}
          <div className="rounded-[16px] p-4 bg-[#15161C] border border-white/7">
            <div className="text-[#8B8D99] text-[11px] font-bold uppercase tracking-[.08em]">
              {isBiz ? 'Escrow' : 'Balance'}
            </div>
            <div className="font-head text-[24px] font-extrabold text-white mt-1">{usd(balance)}</div>
            <button
              onClick={() => nav(isBiz ? '/business/add-funds' : '/wallet/withdraw')}
              className="mt-3 w-full py-[9px] rounded-[10px] bg-[var(--accent)] text-[var(--accent-ink)] text-[13px] font-extrabold font-head"
            >
              {isBiz ? 'Add funds' : 'Withdraw'}
            </button>
          </div>

          {/* account */}
          <button
            onClick={() => nav('/profile')}
            className="flex items-center gap-3 p-2 rounded-[12px] hover:bg-white/5"
          >
            <Avatar name={profile.business_name ?? profile.display_name} size={36} />
            <div className="text-left min-w-0">
              <div className="text-white text-[13px] font-bold truncate">{profile.business_name ?? profile.display_name}</div>
              <div className="text-[#767884] text-[11px] font-semibold">{profile.level}</div>
            </div>
          </button>

          <button
            onClick={() => {
              switchMode()
              nav(isBiz ? '/' : '/business', { replace: true })
            }}
            className="text-[12px] font-bold text-[#767884] hover:text-white px-2 text-left"
          >
            Switch to {isBiz ? 'Earner' : 'Business'} →
          </button>
        </div>
      </aside>

      {/* ===== Main column ===== */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 border-b border-white/7 bg-[rgba(12,13,17,.85)] backdrop-blur">
          <button onClick={() => nav(isBiz ? '/business' : '/')}>
            <BrandMark size={30} />
          </button>
          <button
            onClick={() => nav(isBiz ? '/business/add-funds' : '/wallet')}
            className="flex items-center gap-2 px-3 py-[6px] rounded-full bg-white/6 border border-white/10"
          >
            <span className="w-4 h-4 rounded-full bg-[var(--usdc)] flex items-center justify-center text-[9px] text-white font-extrabold">$</span>
            <span className="font-head text-[13px] font-extrabold text-white">{usd(balance)}</span>
          </button>
        </header>

        <main className="flex-1 pb-24 lg:pb-12">{children}</main>

        {/* Mobile bottom tabs */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 h-[68px] bg-[rgba(12,13,17,.95)] border-t border-white/7 backdrop-blur flex items-center justify-around px-2">
          {[...items.slice(0, 3), { label: 'Profile', path: '/profile', icon: User }].map((it) => {
            const on = active(it.path)
            const Icon = it.icon
            return (
              <button
                key={it.label}
                onClick={() => nav(it.path)}
                className="flex flex-col items-center gap-1 flex-1"
                style={{ color: on ? 'var(--accent)' : '#6E6F7A' }}
              >
                <Icon width={21} height={21} />
                <span className={`text-[10px] ${on ? 'font-extrabold' : 'font-bold'}`}>{it.label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
