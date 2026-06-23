import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { Mode, TaskType } from '../lib/types'
import {
  Bolt,
  ChevronLeft,
  Home,
  ListIcon,
  PicoLogo,
  Play,
  Shield,
  User,
  Wallet as WalletIcon,
  XLogo,
} from './icons'

// Anti-fraud notice shown on signup forms — wording adapts to the role.
export function FraudNotice({ mode = 'earner' }: { mode?: Mode }) {
  return (
    <div className="mt-3 flex items-start gap-2 rounded-[12px] bg-[rgba(255,107,90,.06)] border border-[rgba(255,107,90,.18)] p-3">
      <Shield width={16} height={16} className="text-[var(--coral)] flex-none mt-[1px]" />
      <p className="text-[#B6B8C2] text-[11.5px] font-semibold leading-[1.5]">
        {mode === 'business' ? (
          <>One account per business. Multiple accounts, fake engagement, or hiding behind a VPN/proxy violate our advertiser policy and can suspend your campaigns.</>
        ) : (
          <>One account per person. Creating duplicate accounts or using a VPN/proxy to do so is detected — it means forfeited earnings and a permanent ban.</>
        )}
      </p>
    </div>
  )
}

// ---- Brand mark ----
export function BrandMark({ size = 48, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <div className="flex items-center gap-[14px]">
      <div
        className="rounded-[14px] bg-[var(--accent)] flex items-center justify-center text-[var(--accent-ink)]"
        style={{ width: size, height: size, boxShadow: 'var(--glow)' }}
      >
        <PicoLogo width={size * 0.55} height={size * 0.55} />
      </div>
      {withText && (
        <div className="font-head font-bold text-[21px] tracking-[-.02em] text-white">
          picoworker<span className="text-[#5E606C]">.xyz</span>
        </div>
      )}
    </div>
  )
}

// ---- Screen header (back / title / action) ----
export function ScreenHeader({
  title,
  right,
  onBack,
  back = true,
}: {
  title?: ReactNode
  right?: ReactNode
  onBack?: () => void
  back?: boolean
}) {
  const nav = useNavigate()
  return (
    <div className="flex items-center justify-between px-5 pt-[6px] pb-4 flex-none">
      {back ? (
        <button
          onClick={onBack ?? (() => nav(-1))}
          className="w-10 h-10 rounded-[12px] bg-white/6 flex items-center justify-center text-white"
        >
          <ChevronLeft width={18} height={18} />
        </button>
      ) : (
        <div className="w-10" />
      )}
      {title && <div className="font-head text-[17px] font-extrabold text-white">{title}</div>}
      <div className="min-w-10 flex justify-end">{right}</div>
    </div>
  )
}

// ---- Bottom tab bar ----
const EARNER_TABS = [
  { key: 'earn', label: 'Earn', path: '/', icon: Bolt },
  { key: 'tasks', label: 'Tasks', path: '/rewards', icon: ListIcon },
  { key: 'wallet', label: 'Wallet', path: '/wallet', icon: WalletIcon },
  { key: 'profile', label: 'Profile', path: '/profile', icon: User },
] as const

const BUSINESS_TABS = [
  { key: 'home', label: 'Home', path: '/business', icon: Home },
  { key: 'campaigns', label: 'Campaigns', path: '/business', icon: ListIcon },
  { key: 'wallet', label: 'Wallet', path: '/business/add-funds', icon: WalletIcon },
  { key: 'profile', label: 'Profile', path: '/profile', icon: User },
] as const

export function TabBar({ mode }: { mode: Mode }) {
  const nav = useNavigate()
  const loc = useLocation()
  const tabs = mode === 'business' ? BUSINESS_TABS : EARNER_TABS
  return (
    <div className="flex-none h-[78px] bg-[rgba(12,13,17,.92)] border-t border-white/7 backdrop-blur flex items-center justify-around px-[14px] pb-4">
      {tabs.map((t) => {
        const active = loc.pathname === t.path
        const Icon = t.icon
        return (
          <button
            key={t.key}
            onClick={() => nav(t.path)}
            className="flex flex-col items-center gap-[5px]"
            style={{ color: active ? 'var(--accent)' : '#6E6F7A' }}
          >
            <Icon width={22} height={22} />
            <span className={`text-[10px] ${active ? 'font-extrabold' : 'font-bold'}`}>{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ---- Task type icon (colored tile) ----
const TYPE_STYLE: Record<TaskType, { bg: string; icon: ReactNode }> = {
  follow_x: { bg: '#000', icon: <XLogo width={18} height={18} className="text-white" /> },
  yt_views: { bg: '#FF0033', icon: <Play width={20} height={20} className="text-white" /> },
  app_install: {
    bg: '#5B8DEF',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
        <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
        <path d="M10 18.5h4" />
      </svg>
    ),
  },
  survey: {
    bg: '#26A17B',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
        <path d="M5 6h14M5 12h14M5 18h9" />
      </svg>
    ),
  },
  visit_site: {
    bg: '#8B6CFF',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18" />
      </svg>
    ),
  },
  custom: {
    bg: '#F2A33C',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="#fff">
        <path d="M12 2l2.9 6.3 6.9.6-5.2 4.5 1.6 6.7L12 16.9 5.8 20.6l1.6-6.7L2.2 9.4l6.9-.6L12 2z" />
      </svg>
    ),
  },
}

export function TaskTypeIcon({ type, size = 46 }: { type: TaskType; size?: number }) {
  const s = TYPE_STYLE[type]
  return (
    <div
      className="flex-none rounded-[13px] flex items-center justify-center"
      style={{ width: size, height: size, background: s.bg, border: type === 'follow_x' ? '1px solid rgba(255,255,255,.14)' : 'none' }}
    >
      {s.icon}
    </div>
  )
}
