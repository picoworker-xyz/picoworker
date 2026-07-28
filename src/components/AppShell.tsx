import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { usd } from '../lib/format'
import { BrandMark } from './layout'
import { Avatar } from './ui'
import { Bolt, Check, Flame, Globe, Grid, Home, ListIcon, LogOut, Plus, Shield, Share, Trophy, User, Wallet as WalletIcon } from './icons'
import { ThemeToggle } from './ThemeToggle'
import { NotificationBell } from './NotificationBell'

interface NavItem {
  label: string
  path: string
  icon: typeof Bolt
}

const EARNER_NAV: NavItem[] = [
  { label: 'Earn', path: '/', icon: Bolt },
  { label: 'Offers', path: '/offers/taskwall', icon: Globe },
  // Wallet is not here on purpose: the balance pill in the header already
  // links to it on both breakpoints, so a nav entry would be the same
  // destination twice. Check-in takes the slot since it needs a daily visit.
  { label: 'Check in', path: '/rewards', icon: Flame },
  { label: 'Referral', path: '/refer', icon: Share },
  { label: 'Leaderboard', path: '/leaderboard', icon: Trophy },
  { label: 'My Submissions', path: '/submissions', icon: ListIcon },
  { label: 'More', path: '/more', icon: Grid },
]
const BUSINESS_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/business', icon: Home },
  { label: 'Create task', path: '/business/create', icon: Plus },
  { label: 'Review', path: '/business/review', icon: Check },
  { label: 'Wallet', path: '/business/add-funds', icon: WalletIcon },
  { label: 'More', path: '/more', icon: Grid },
]

function Caret({ open }: { open: boolean }) {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`text-[var(--ink-4)] transition-transform ${open ? 'rotate-180' : ''}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, wallet, switchMode, signOut, userId } = useStore()
  const nav = useNavigate()
  const loc = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)
  const accountRef = useRef<HTMLDivElement>(null)

  // Close the top bar dropdowns on outside click, Escape, or route change.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!moreRef.current?.contains(t)) setMoreOpen(false)
      if (!accountRef.current?.contains(t)) setAccountOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setMoreOpen(false); setAccountOpen(false) }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])
  // Logged in but the profile/wallet rows didn't load (e.g. database schema not
  // set up, or account created before the schema). Show an actionable screen
  // instead of a blank page.
  if (userId && (!profile || !wallet)) {
    return (
      <div className="min-h-svh flex items-center justify-center p-6">
        <div className="w-full max-w-[420px] text-center rounded-[22px] bg-[var(--card)] border border-[var(--line)] p-8">
          <div className="w-14 h-14 rounded-full border-4 border-[var(--line-2)] border-t-[var(--accent)] mx-auto animate-spin mb-5" />
          <div className="font-head font-bold text-[20px] text-[var(--ink)]">Loading your account…</div>
          <div className="text-[var(--ink-3)] text-[13.5px] font-semibold mt-2 leading-[1.5]">
            If this doesn't clear in a few seconds, your account profile couldn't be loaded.
          </div>
          <div className="flex gap-2 mt-6">
            <button onClick={() => window.location.reload()} className="flex-1 font-head font-extrabold text-[14px] bg-[var(--accent)] text-[var(--accent-ink)] py-3 rounded-[12px]">
              Reload
            </button>
            <button onClick={() => { signOut(); nav('/login', { replace: true }) }} className="flex-1 font-head font-extrabold text-[14px] bg-[var(--fill)] text-[var(--ink)] border border-[var(--line-2)] py-3 rounded-[12px]">
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
        <div className="w-full max-w-[440px] text-center rounded-[22px] bg-[var(--card)] border border-[var(--line)] p-8">
          <div className="w-14 h-14 rounded-full bg-[rgba(255,107,90,.14)] border border-[rgba(255,107,90,.35)] flex items-center justify-center mx-auto mb-5">
            <Shield width={26} height={26} className="text-[var(--coral)]" />
          </div>
          <div className="font-head font-bold text-[22px] text-[var(--ink)]">Account suspended</div>
          <div className="text-[var(--ink-3)] text-[14px] font-semibold mt-2 leading-[1.5]">
            Your account has been suspended. If you think this is a mistake, reach our team at hello@picoworker.xyz and we'll help sort it out.
          </div>
          <a href="mailto:hello@picoworker.xyz" className="block w-full mt-6 font-head font-extrabold text-[15px] bg-[var(--accent)] text-[var(--accent-ink)] py-3 rounded-[13px]">Email hello@picoworker.xyz</a>
          <button onClick={() => nav('/support')} className="w-full mt-2 font-head font-extrabold text-[14px] bg-[var(--fill)] text-[var(--ink)] border border-[var(--line-2)] py-3 rounded-[13px]">Open support chat</button>
        </div>
      </div>
    )
  }

  const isBiz = profile.mode === 'business'
  const items = isBiz ? BUSINESS_NAV : EARNER_NAV
  const balance = isBiz ? wallet.business_escrow : wallet.earner_balance

  const active = (path: string) =>
    path === '/' || path === '/business' ? loc.pathname === path : loc.pathname.startsWith(path)

  // Top bar shows the first few destinations as pills; the rest live in a menu
  // so the bar never scrolls or wraps.
  const topNav: NavItem[] = [
    ...items.filter((it) => it.path !== '/more'),
    ...(profile.is_admin ? [{ label: 'Team admin', path: '/admin', icon: Shield }] : []),
    { label: 'All pages', path: '/more', icon: Grid },
  ]
  const primary = topNav.slice(0, 4)
  const overflow = topNav.slice(4)

  return (
    <div className="min-h-svh flex flex-col">
      {/* ===== Desktop top bar ===== */}
      <header className="hidden lg:block sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--bar)] backdrop-blur">
        <div className="app-container flex items-center gap-5 h-[64px]">
          <button onClick={() => nav(isBiz ? '/business' : '/')} className="flex-none text-left">
            <BrandMark size={32} withText={false} />
          </button>

          {/* Primary nav: a single segmented pill group, overflow tucked into a menu */}
          <nav className="flex-1 min-w-0 flex justify-center">
            <div className="flex items-center gap-0.5 p-1 rounded-full bg-[var(--fill)] border border-[var(--line)]">
              {primary.map((it) => {
                const on = active(it.path)
                return (
                  <button
                    key={it.label}
                    onClick={() => nav(it.path)}
                    className={`px-4 h-[36px] rounded-full text-[13.5px] font-bold whitespace-nowrap transition-colors ${on
                      ? 'bg-[var(--card)] text-[var(--accent-strong)] shadow-sm'
                      : 'text-[var(--ink-3)] hover:text-[var(--ink)]'
                      }`}
                  >
                    {it.label}
                  </button>
                )
              })}

              {overflow.length > 0 && (
                <div className="relative" ref={moreRef}>
                  <button
                    onClick={() => { setMoreOpen((v) => !v); setAccountOpen(false) }}
                    className={`flex items-center gap-1.5 px-3.5 h-[36px] rounded-full text-[13.5px] font-bold whitespace-nowrap transition-colors ${overflow.some((it) => active(it.path)) || moreOpen
                      ? 'bg-[var(--card)] text-[var(--accent-strong)] shadow-sm'
                      : 'text-[var(--ink-3)] hover:text-[var(--ink)]'
                      }`}
                  >
                    More <Caret open={moreOpen} />
                  </button>
                  {moreOpen && (
                    <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-[220px] p-1.5 rounded-[16px] bg-[var(--card)] border border-[var(--line-2)] shadow-xl">
                      {overflow.map((it) => (
                        <button
                          key={it.label}
                          onClick={() => { setMoreOpen(false); nav(it.path) }}
                          className={`w-full px-3 py-2.5 rounded-[11px] text-[13.5px] font-bold text-left transition-colors ${active(it.path) ? 'text-[var(--accent-strong)] bg-[var(--fill)]' : 'text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--fill)]'
                            }`}
                        >
                          {it.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </nav>

          {/* Right cluster: mode switch, money, alerts, account */}
          <div className="flex items-center gap-2 flex-none">
            {/* Kept out of the nav pill group so it doesn't read as a page */}
            <button
              onClick={() => {
                switchMode()
                nav(isBiz ? '/' : '/business', { replace: true })
              }}
              className="px-3.5 h-[38px] rounded-full text-[12.5px] font-bold whitespace-nowrap text-[var(--ink-3)] border border-[var(--line-2)] hover:text-[var(--ink)] hover:bg-[var(--fill)] transition-colors"
            >
              Switch to {isBiz ? 'Earner' : 'Business'}
            </button>

            <button
              onClick={() => nav(isBiz ? '/business/add-funds' : '/wallet')}
              title={isBiz ? 'Add funds' : 'Wallet'}
              className="flex items-center gap-2 pl-2.5 pr-3 h-[38px] rounded-full bg-[var(--card)] border border-[var(--line-2)] hover:border-[var(--accent)] transition-colors"
            >
              <span className="w-[18px] h-[18px] rounded-full bg-[var(--usdc)] flex items-center justify-center text-[10px] text-[#fff] font-extrabold">$</span>
              <span className="font-head text-[13.5px] font-extrabold text-[var(--ink)]">{usd(balance)}</span>
            </button>

            <ThemeToggle />
            <NotificationBell />

            <div className="relative" ref={accountRef}>
              <button
                onClick={() => { setAccountOpen((v) => !v); setMoreOpen(false) }}
                className="flex items-center gap-1.5 p-[3px] pr-2 rounded-full border border-[var(--line-2)] hover:bg-[var(--fill)] transition-colors"
              >
                <Avatar name={profile.business_name ?? profile.display_name} size={30} />
                <Caret open={accountOpen} />
              </button>

              {accountOpen && (
                <div className="absolute right-0 mt-2 w-[248px] p-1.5 rounded-[16px] bg-[var(--card)] border border-[var(--line-2)] shadow-xl">
                  <div className="px-3 pt-2 pb-3 border-b border-[var(--line)]">
                    <div className="text-[13.5px] font-bold text-[var(--ink)] truncate">{profile.business_name ?? profile.display_name}</div>
                    <div className="text-[11.5px] font-semibold text-[var(--ink-4)] mt-0.5">
                      {profile.level} · {isBiz ? 'Business' : 'Earner'} mode
                    </div>
                  </div>
                  <button
                    onClick={() => { setAccountOpen(false); nav('/profile') }}
                    className="w-full flex items-center gap-2.5 mt-1.5 px-3 py-2.5 rounded-[11px] text-[13.5px] font-bold text-left text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--fill)]"
                  >
                    <User width={17} height={17} /> Profile
                  </button>
                  <button
                    onClick={() => { setAccountOpen(false); signOut(); nav('/login', { replace: true }) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[11px] text-[13.5px] font-bold text-left text-[var(--coral)] hover:bg-[var(--fill)]"
                  >
                    <LogOut width={17} height={17} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ===== Main column ===== */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 border-b border-[var(--line)] bg-[var(--bar)] backdrop-blur">
          <button onClick={() => nav(isBiz ? '/business' : '/')}>
            <BrandMark size={30} withText={false} />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => nav(isBiz ? '/business/add-funds' : '/wallet')}
              className="flex items-center gap-2 px-3 py-[6px] rounded-full bg-[var(--fill)] border border-[var(--line-2)]"
            >
              <span className="w-4 h-4 rounded-full bg-[var(--usdc)] flex items-center justify-center text-[9px] text-[#fff] font-extrabold">$</span>
              <span className="font-head text-[13px] font-extrabold text-[var(--ink)]">{usd(balance)}</span>
            </button>
            <ThemeToggle round />
            <NotificationBell round />
          </div>
        </header>

        <main className="flex-1 pb-24 lg:pb-12">{children}</main>

        {/* Mobile bottom tabs */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 h-[68px] bg-[var(--bar)] border-t border-[var(--line)] backdrop-blur flex items-center justify-around px-2">
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
                style={{ color: on ? 'var(--accent-strong)' : 'var(--ink-4)' }}
              >
                <Icon width={21} height={21} />
                <span className={`text-[11px] tracking-[.01em] ${on ? 'font-extrabold' : 'font-bold'}`}>{it.label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
