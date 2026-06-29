import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { Page } from '../components/Page'
import {
  Bell, Trophy, IdCard, Chat, Flame, Share, Wallet, ListIcon, User, Shield, Plus, Check, Home, Bolt, Gear, ArrowRight,
} from '../components/icons'

type Item = { label: string; path: string; icon: typeof Bell }
type Section = { title: string; items: Item[] }

const EARNER_SECTIONS: Section[] = [
  {
    title: 'Earning',
    items: [
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
      { label: 'Verify identity', path: '/verify', icon: IdCard },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Profile', path: '/profile', icon: User },
      { label: 'Notifications', path: '/notifications', icon: Bell },
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
      { label: 'New task', path: '/business/create', icon: Plus },
      { label: 'Review proofs', path: '/business/review', icon: Check },
      { label: 'Dashboard', path: '/business', icon: Home },
    ],
  },
  {
    title: 'Money',
    items: [
      { label: 'Add funds', path: '/business/add-funds', icon: Wallet },
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
    <Page title="More" subtitle="Everything else, in one place.">
      <div className="flex flex-col gap-7">
        {/* prominent mode switch */}
        {isBiz ? (
          <button
            onClick={toggleMode}
            className="w-full flex items-center justify-between gap-3 rounded-[var(--r)] p-5 border border-[rgba(194,249,77,.3)]"
            style={{ background: 'linear-gradient(135deg,rgba(194,249,77,.16),rgba(194,249,77,.04))' }}
          >
            <span className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-[14px] bg-[var(--accent)] flex items-center justify-center flex-none"><Bolt width={22} height={22} className="text-[var(--accent-ink)]" /></span>
              <span className="text-left">
                <span className="block text-white text-[15px] font-extrabold font-head">Switch to earning</span>
                <span className="block text-[#9DAA7E] text-[12px] font-semibold">Do tasks and earn USDC</span>
              </span>
            </span>
            <ArrowRight width={20} height={20} className="text-[var(--accent)] flex-none" />
          </button>
        ) : (
          <button
            onClick={toggleMode}
            className="w-full flex items-center justify-between gap-3 rounded-[var(--r)] p-5 border border-[rgba(139,108,255,.35)]"
            style={{ background: 'linear-gradient(135deg,rgba(139,108,255,.18),rgba(139,108,255,.05))' }}
          >
            <span className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-[14px] bg-[#8B6CFF] flex items-center justify-center flex-none"><Home width={22} height={22} className="text-white" /></span>
              <span className="text-left">
                <span className="block text-white text-[15px] font-extrabold font-head">Switch to business</span>
                <span className="block text-[#B0A6E6] text-[12px] font-semibold">Post a task and grow fast</span>
              </span>
            </span>
            <ArrowRight width={20} height={20} className="text-[#8B6CFF] flex-none" />
          </button>
        )}

        {sections.map((section) => (
          <div key={section.title}>
            <div className="text-white text-[15px] font-extrabold font-head mb-3">{section.title}</div>
            <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 gap-2">
              {section.items.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.label}
                    onClick={() => nav(item.path)}
                    className="flex flex-col items-center gap-2 py-3 px-1 rounded-[14px] hover:bg-white/[.04] active:scale-[.97] transition"
                  >
                    <span className="w-12 h-12 rounded-[14px] bg-[#15161C] border border-white/8 flex items-center justify-center text-[var(--accent)]">
                      <Icon width={22} height={22} />
                    </span>
                    <span className="text-[#C7C9D4] text-[11px] font-bold text-center leading-[1.25]">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        <button
          onClick={() => { signOut() }}
          className="self-start text-[var(--coral)] text-[13px] font-extrabold font-head flex items-center gap-2 mt-1"
        >
          <Gear width={16} height={16} /> Log out
        </button>
      </div>
    </Page>
  )
}
