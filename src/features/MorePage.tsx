import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { Page } from '../components/Page'
import { WhatsAppJoin } from '../components/WhatsAppJoin'
import { TASKWALL_PAUSED } from '../lib/taskwall'
import {
  Bell, Trophy, IdCard, Chat, Flame, Share, Wallet, ListIcon, User, Shield, Plus, Check, Home, Bolt, LogOut, ArrowRight, Globe,
} from '../components/icons'

type Item = { label: string; path: string; icon: typeof Bell; disabled?: boolean }
type Section = { title: string; items: Item[] }

const EARNER_SECTIONS: Section[] = [
  {
    title: 'Earning',
    items: [
      { label: 'Offers', path: '/offers/lootably', icon: Globe },
      { label: 'Featured offers', path: '/offers/taskwall', icon: Globe },
      { label: 'Worldwide offers', path: '/offers/worldwide', icon: Globe },
      { label: 'Paid surveys', path: '/offers/surveys', icon: Globe },
      { label: 'Paymentwall · Soon', path: '/offers/paymentwall', icon: Globe, disabled: true },
      { label: 'My submissions', path: '/submissions', icon: ListIcon },
      { label: 'Streak & rewards', path: '/rewards', icon: Flame },
      { label: 'Leaderboard', path: '/leaderboard', icon: Trophy },
      { label: 'Refer & earn', path: '/refer', icon: Share },
    ],
  },
  {
    title: 'Money',
    items: [
      { label: 'Wallet', path: '/wallet', icon: Wallet },
      { label: 'Payout address', path: '/payout-address', icon: Wallet },
      { label: 'Proof of income', path: '/proof-of-income', icon: IdCard },
      { label: 'Verify identity', path: '/verify', icon: IdCard },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Profile', path: '/profile', icon: User },
      { label: 'Notifications', path: '/notifications', icon: Bell },
      { label: 'Install app', path: '/app', icon: Plus },
      { label: 'Post a task', path: '/switch', icon: Home },
      { label: 'Support', path: '/support', icon: Chat },
      { label: 'Terms', path: '/terms', icon: Shield },
      { label: 'Privacy', path: '/privacy', icon: Shield },
    ],
  },
]

const BUSINESS_SECTIONS: Section[] = [
  {
    title: 'Campaigns',
    items: [
      { label: 'Create task', path: '/business/create', icon: Plus },
      { label: 'Review proofs', path: '/business/review', icon: Check },
      { label: 'Dashboard', path: '/business', icon: Home },
    ],
  },
  {
    title: 'Money',
    items: [
      { label: 'Add funds', path: '/business/add-funds', icon: Wallet },
      { label: 'Agent API', path: '/developers', icon: Bolt },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Profile', path: '/profile', icon: User },
      { label: 'Notifications', path: '/notifications', icon: Bell },
      { label: 'Earn instead', path: '/switch', icon: Bolt },
      { label: 'Support', path: '/support', icon: Chat },
      { label: 'Terms', path: '/terms', icon: Shield },
      { label: 'Privacy', path: '/privacy', icon: Shield },
    ],
  },
]

export function MorePage() {
  const nav = useNavigate()
  const { profile, switchMode, signOut } = useStore()
  const isBiz = profile?.mode === 'business'
  const sections = isBiz ? BUSINESS_SECTIONS : EARNER_SECTIONS

  function toggleMode() {
    switchMode()
    nav(isBiz ? '/' : '/business', { replace: true })
  }

  return (
    <Page>
      <div className="flex flex-col gap-4">
        {/* mode switch + community, side by side on desktop to save space */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {isBiz ? (
          <button
            onClick={toggleMode}
            className="w-full flex items-center justify-between gap-3 rounded-[16px] p-4 border border-[rgba(46,224,110,.3)]"
            style={{ background: 'linear-gradient(135deg,rgba(46,224,110,.16),rgba(46,224,110,.04))' }}
          >
            <span className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-[12px] bg-[var(--accent)] flex items-center justify-center flex-none"><Bolt width={20} height={20} className="text-[var(--accent-ink)]" /></span>
              <span className="text-left">
                <span className="block text-[var(--ink)] text-[15px] font-extrabold font-head">Switch to earning</span>
                <span className="block text-[#9DAA7E] text-[12px] font-semibold">Do tasks and earn USDC</span>
              </span>
            </span>
            <ArrowRight width={18} height={18} className="text-[var(--accent-strong)] flex-none" />
          </button>
        ) : (
          <button
            onClick={toggleMode}
            className="w-full flex items-center justify-between gap-3 rounded-[16px] p-4 border border-[rgba(139,108,255,.35)]"
            style={{ background: 'linear-gradient(135deg,rgba(139,108,255,.18),rgba(139,108,255,.05))' }}
          >
            <span className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-[12px] bg-[#8B6CFF] flex items-center justify-center flex-none"><Home width={20} height={20} className="text-[#fff]" /></span>
              <span className="text-left">
                <span className="block text-[var(--ink)] text-[15px] font-extrabold font-head">Switch to business</span>
                <span className="block text-[#B0A6E6] text-[12px] font-semibold">Post a task and grow fast</span>
              </span>
            </span>
            <ArrowRight width={18} height={18} className="text-[#8B6CFF] flex-none" />
          </button>
        )}

        <WhatsAppJoin />
        </div>

        {/* all shortcuts together in one grid — no section headers eating space */}
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-1.5">
          {sections.flatMap((s) => s.items).filter((item) => !(TASKWALL_PAUSED && item.path === '/offers/taskwall')).map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.label}
                type="button"
                disabled={item.disabled}
                onClick={() => nav(item.path)}
                className="flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-[12px] hover:bg-[var(--fill)] active:scale-[.97] transition disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100"
              >
                <span className="w-10 h-10 rounded-[12px] bg-[var(--card)] border border-[var(--line)] flex items-center justify-center text-[var(--accent-strong)]">
                  <Icon width={19} height={19} />
                </span>
                <span className="text-[var(--ink-2)] text-[10.5px] font-bold text-center leading-[1.2]">{item.label}</span>
              </button>
            )
          })}
        </div>

        <button
          onClick={() => { signOut() }}
          className="w-full mt-1 flex items-center justify-center gap-2 py-[11px] rounded-[12px] bg-[var(--fill)] border border-[var(--line-2)] text-[var(--coral)] text-[13.5px] font-extrabold font-head hover:bg-[var(--fill-2)]"
        >
          <LogOut width={16} height={16} /> Log out
        </button>
      </div>
    </Page>
  )
}
