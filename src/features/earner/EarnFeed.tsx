import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { usd } from '../../lib/format'
import { Page } from '../../components/Page'
import { TaskRow } from '../../components/blocks'
import { Chip } from '../../components/ui'
import { ArrowRight, Bell, Check, Flame } from '../../components/icons'

const CATS = ['All', 'Social', 'Surveys', 'Apps', 'Ads', 'Watch']

export function EarnFeed() {
  const nav = useNavigate()
  const { profile, wallet, liveTasks, ledgerFor } = useStore()
  const [cat, setCat] = useState('All')

  const tasks = liveTasks()
  const filtered = useMemo(() => (cat === 'All' ? tasks : tasks.filter((t) => t.category === cat)), [tasks, cat])

  const todayEarned = useMemo(() => {
    if (!profile) return 0
    const today = new Date().toDateString()
    return ledgerFor(profile.id)
      .filter((l) => l.amount > 0 && new Date(l.created_at).toDateString() === today)
      .reduce((s, l) => s + l.amount, 0)
  }, [profile, ledgerFor])

  if (!profile || !wallet) return null

  return (
    <Page title={`Welcome back, ${profile.display_name}`} subtitle="Pick a task and get paid in USDC.">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* main */}
        <div className="lg:col-span-2 order-2 lg:order-1">
          <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar">
            {CATS.map((c) => (
              <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Chip>
            ))}
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="text-white text-[18px] font-extrabold font-head">{cat === 'All' ? 'Hot right now' : cat}</div>
            <div className="text-[#767884] text-[13px] font-semibold">{filtered.length} tasks</div>
          </div>

          {filtered.length === 0 ? (
            <AllCaughtUp />
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {filtered.map((t) => <TaskRow key={t.id} task={t} />)}
            </div>
          )}
        </div>

        {/* sidebar */}
        <aside className="lg:col-span-1 order-1 lg:order-2 flex flex-col gap-4">
          {/* balance */}
          <div
            className="relative overflow-hidden rounded-[var(--r)] p-6 border border-[rgba(194,249,77,.14)]"
            style={{ background: 'linear-gradient(150deg,#191B22,#121319)', boxShadow: 'var(--glow)' }}
          >
            <div className="absolute -right-8 -top-8 w-[140px] h-[140px] rounded-full bg-[var(--accent)] opacity-10 blur-lg" />
            <div className="relative">
              <div className="text-[#8B8D99] text-[12px] font-bold tracking-[.08em] uppercase mb-2">Available balance</div>
              <div className="font-head font-bold text-[42px] text-white tracking-[-.02em] leading-none">{usd(wallet.earner_balance)}</div>
              <div className="text-[#A9ABB6] text-[13px] font-semibold mt-2">≈ {wallet.earner_balance.toFixed(2)} USDC</div>
              <button
                onClick={() => nav('/wallet/withdraw')}
                className="mt-4 w-full font-head font-extrabold text-[15px] bg-[var(--accent)] text-[var(--accent-ink)] py-[13px] rounded-[14px] flex items-center justify-center gap-2"
              >
                Withdraw <ArrowRight width={16} height={16} />
              </button>
            </div>
          </div>

          {/* quick stats */}
          <div className="grid grid-cols-3 gap-3">
            <MiniStat value={usd(todayEarned, { sign: true })} label="Today" accent />
            <MiniStat value={String(profile.tasks_done)} label="Tasks" />
            <MiniStat value={`${profile.streak_days}d`} label="Streak" />
          </div>

          {/* streak nudge */}
          <button
            onClick={() => nav('/rewards')}
            className="card-hover flex items-center gap-3 p-4 rounded-[16px] bg-[#15161C] border border-white/6 text-left"
          >
            <div className="w-10 h-10 rounded-[12px] bg-[rgba(255,107,90,.14)] flex items-center justify-center flex-none">
              <Flame width={18} height={18} className="text-[var(--coral)]" />
            </div>
            <div className="flex-1">
              <div className="text-white text-[14px] font-bold">{profile.streak_days}-day streak</div>
              <div className="text-[#767884] text-[12px] font-semibold">Claim today's +$0.05 bonus</div>
            </div>
            <ArrowRight width={16} height={16} className="text-[#5E606C]" />
          </button>

          {/* refer CTA */}
          <button
            onClick={() => nav('/refer')}
            className="card-hover flex items-center gap-3 p-4 rounded-[16px] border border-[rgba(194,249,77,.2)] text-left"
            style={{ background: 'linear-gradient(135deg,rgba(194,249,77,.1),rgba(194,249,77,.02))' }}
          >
            <div className="flex-1">
              <div className="text-white text-[14px] font-bold">Invite friends</div>
              <div className="text-[#9DAA7E] text-[12px] font-semibold">Earn $0.50 + 10% forever</div>
            </div>
            <ArrowRight width={16} height={16} className="text-[var(--accent)]" />
          </button>
        </aside>
      </div>
    </Page>
  )
}

function AllCaughtUp() {
  const nav = useNavigate()
  return (
    <div className="rounded-[20px] border border-white/6 bg-[#15161C] p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-[rgba(194,249,77,.12)] border border-[rgba(194,249,77,.3)] flex items-center justify-center mx-auto">
        <Check width={30} height={30} className="text-[var(--accent)]" />
      </div>
      <div className="font-head font-bold text-[22px] text-white mt-5">You're all caught up!</div>
      <div className="text-[#A9ABB6] text-[14px] font-semibold mt-2 leading-[1.5] max-w-[420px] mx-auto">
        You've done every task for now. Fresh ones drop every few hours.
      </div>
      <div className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-full bg-white/6 border border-white/10">
        <span className="w-2 h-2 rounded-full bg-[var(--accent)]" style={{ animation: 'pico-pulse 1.8s infinite' }} />
        <span className="text-[#C7C9D4] text-[13px] font-bold">Next batch in ~1h 42m</span>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
        <button onClick={() => nav('/notifications')} className="font-head font-extrabold text-[14px] bg-[var(--accent)] text-[var(--accent-ink)] px-5 py-3 rounded-[13px] flex items-center justify-center gap-2">
          <Bell width={16} height={16} /> Notify me when live
        </button>
        <button onClick={() => nav('/refer')} className="font-head font-extrabold text-[14px] bg-white/6 text-white border border-white/12 px-5 py-3 rounded-[13px]">
          Invite a friend, get $0.50
        </button>
      </div>
    </div>
  )
}

function MiniStat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="rounded-[16px] p-4 bg-[#15161C] border border-white/6">
      <div className={`font-head text-[18px] font-extrabold ${accent ? 'text-[var(--accent)]' : 'text-white'}`}>{value}</div>
      <div className="text-[#767884] text-[11px] font-semibold mt-1">{label}</div>
    </div>
  )
}
