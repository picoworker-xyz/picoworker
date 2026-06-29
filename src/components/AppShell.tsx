import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { usd } from '../lib/format'
import { BrandMark } from './layout'
import { Avatar } from './ui'
import { Bell, Bolt, Check, Flame, Grid, Home, ListIcon, Plus, Shield, Share, Trophy, Wallet as WalletIcon } from './icons'

interface NavItem {
  label: string
  path: string
  icon: typeof Bolt
}

const EARNER_NAV: NavItem[] = [
  { label: 'Earn', path: '/', icon: Bolt },
  { label: 'Wallet', path: '/wallet', icon: WalletIcon },
  { label: 'Rewards', path: '/rewards', icon: Flame },
  { label: 'Leaderboard', path: '/leaderboard', icon: Trophy },
  { label: 'Referral', path: '/refer', icon: Share },
  { label: 'My Submissions', path: '/submissions', icon: ListIcon },
]
const BUSINESS_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/business', icon: Home },
  { label: 'New task', path: '/business/create', icon: Plus },
  { label: 'Review', path: '/business/review', icon: Check },
  { label: 'Wallet', path: '/business/add-funds', icon: WalletIcon },
]

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, wallet, switchMode, signOut, userId } = useStore()
  const nav = useNavigate()
  const loc = useLocation()
  // Logged in but the profile/wallet rows didn't load (e.g. database schema not
  // set up, or account created before the schema). Show an actionable screen
  // instead of a blank page.
  if (userId && (!profile || !wallet)) {
    return (
      <div className="min-h-svh flex items-center justify-center p-6">
        <div className="w-full max-w-[420px] text-center rounded-[22px] bg-[#15161C] border border-white/8 p-8">
          <div className="w-14 h-14 rounded-full border-4 border-white/10 border-t-[var(--accent)] mx-auto animate-spin mb-5" />
          <div className="font-head font-bold text-[20px] text-white">Loading your account…</div>
          <div className="text-[#9A9CA8] text-[13.5px] font-semibold mt-2 leading-[1.5]">
            If this doesn't clear in a few seconds, your account profile couldn't be loaded.
          </div>
          <div className="flex gap-2 mt-6">
            <button onClick={() => window.location.reload()} className="flex-1 font-head font-extrabold text-[14px] bg-[var(--accent)] text-[var(--accent-ink)] py-3 rounded-[12px]">
              Reload
            </button>
            <button onClick={() => { signOut(); nav('/login', { replace: true }) }} className="flex-1 font-head font-extrabold text-[14px] bg-white/6 text-white border border-white/10 py-3 rounded-[12px]">
              Sign out
            </button>
          </div>
        </div>
      </div>
    )
  }
  if (!profile || !wallet) return null

  // Suspended accounts are locked out of everything except the support chat.
  if (profile.suspended && loc.pathname !== '/support') {
    return (
      <div className="min-h-svh flex items-center justify-center p-6">
        <div className="w-full max-w-[440px] text-center rounded-[22px] bg-[#15161C] border border-white/8 p-8">
          <div className="w-14 h-14 rounded-full bg-[rgba(255,107,90,.14)] border border-[rgba(255,107,90,.35)] flex items-center justify-center mx-auto mb-5">
            <Shield width={26} height={26} className="text-[var(--coral)]" />
          </div>
          <div className="font-head font-bold text-[22px] text-white">Account suspended</div>
          <div className="text-[#9A9CA8] text-[14px] font-semibold mt-2 leading-[1.5]">
            Your account has been suspended. If you think this is a mistake, reach our team at hello@picoworker.xyz and we'll help sort it out.
          </div>
          <a href="mailto:hello@picoworker.xyz" className="block w-full mt-6 font-head font-extrabold text-[15px] bg-[var(--accent)] text-[var(--accent-ink)] py-3 rounded-[13px]">Email hello@picoworker.xyz</a>
          <button onClick={() => nav('/support')} className="w-full mt-2 font-head font-extrabold text-[14px] bg-white/6 text-white border border-white/10 py-3 rounded-[13px]">Open support chat</button>
        </div>
      </div>
    )
  }

  const isBiz = profile.mode === 'business'
  const items = isBiz ? BUSINESS_NAV : EARNER_NAV
  const balance = isBiz ? wallet.business_escrow : wallet.earner_balance

  const active = (path: string) =>
    path === '/' || path === '/business' ? loc.pathname === path : loc.pathname.startsWith(path)

  return (
    <div className="min-h-svh flex">
      {/* ===== Desktop sidebar ===== */}
      <aside className="hidden lg:flex flex-col w-[260px] flex-none border-r border-white/7 bg-[rgba(12,13,17,.7)] backdrop-blur sticky top-0 h-svh px-5 py-7">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => nav(isBiz ? '/business' : '/')} className="text-left">
            <BrandMark size={40} />
          </button>
          <button onClick={() => nav('/notifications')} className="w-9 h-9 rounded-[11px] bg-white/6 flex items-center justify-center text-[#C2C4CE] hover:text-white" title="Notifications">
            <Bell width={18} height={18} />
          </button>
        </div>

        <nav className="flex flex-col gap-1">
          {items.map((it) => {
            const on = active(it.path)
            const Icon = it.icon
            return (
              <button
                key={it.label}
                onClick={() => nav(it.path)}
                className={`flex items-center gap-3 px-3 py-[11px] rounded-[12px] text-[14px] font-bold transition-colors ${on ? 'bg-[var(--accent)]/12 text-[var(--accent)]' : 'text-[#9A9CA8] hover:text-white hover:bg-white/5'
                  }`}
              >
                <Icon width={19} height={19} />
                {it.label}
              </button>
            )
          })}
          {profile.is_admin && (
            <button
              onClick={() => nav('/admin')}
              className={`flex items-center gap-3 px-3 py-[11px] rounded-[12px] text-[14px] font-bold transition-colors ${active('/admin') ? 'bg-[var(--accent)]/12 text-[var(--accent)]' : 'text-[#9A9CA8] hover:text-white hover:bg-white/5'
                }`}
            >
              <Shield width={19} height={19} /> Team admin
            </button>
          )}
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => nav(isBiz ? '/business/add-funds' : '/wallet')}
              className="flex items-center gap-2 px-3 py-[6px] rounded-full bg-white/6 border border-white/10"
            >
              <span className="w-4 h-4 rounded-full bg-[var(--usdc)] flex items-center justify-center text-[9px] text-white font-extrabold">$</span>
              <span className="font-head text-[13px] font-extrabold text-white">{usd(balance)}</span>
            </button>
            <button onClick={() => nav('/notifications')} className="w-9 h-9 rounded-full bg-white/6 border border-white/10 flex items-center justify-center text-[#C2C4CE]" title="Notifications">
              <Bell width={17} height={17} />
            </button>
          </div>
        </header>

        <main className="flex-1 pb-24 lg:pb-12">{children}</main>

        {/* Mobile bottom tabs */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 h-[68px] bg-[rgba(12,13,17,.95)] border-t border-white/7 backdrop-blur flex items-center justify-around px-2">
          {(isBiz
            ? [items[0], items[1], items[2], items[3], { label: 'More', path: '/more', icon: Grid }]
            : [items[0], items[1], items[2], { label: 'Refer', path: '/refer', icon: Share }, { label: 'More', path: '/more', icon: Grid }]
          ).map((it) => {
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
