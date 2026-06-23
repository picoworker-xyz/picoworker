import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { Page } from '../../components/Page'
import { TaskRow } from '../../components/blocks'
import { Chip } from '../../components/ui'
import { Bell, Check } from '../../components/icons'

const CATS = ['All', 'Social', 'Surveys', 'Apps', 'Ads', 'Watch']

export function EarnFeed() {
  const { profile, liveTasks } = useStore()
  const [cat, setCat] = useState('All')

  const tasks = liveTasks()
  const filtered = useMemo(() => (cat === 'All' ? tasks : tasks.filter((t) => t.category === cat)), [tasks, cat])

  if (!profile) return null

  return (
    <Page title={`Welcome back, ${profile.display_name}`} subtitle="Pick a task and get paid in USDC.">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((t) => <TaskRow key={t.id} task={t} />)}
        </div>
      )}
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
          Invite a friend, earn 10%
        </button>
      </div>
    </div>
  )
}
