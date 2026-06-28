import { useNavigate } from 'react-router-dom'
import type { Task } from '../lib/types'
import { usd, etaLabel, earnerNet } from '../lib/format'
import { ArrowRight } from './icons'
import { TaskTypeIcon } from './layout'
import { Pill } from './ui'

// ---- Balance hero card (earn feed) ----
export function BalanceHero({
  balance,
  today,
  tasksDone,
  streak,
}: {
  balance: number
  today: number
  tasksDone: number
  streak: number
}) {
  const nav = useNavigate()
  return (
    <div
      className="relative overflow-hidden rounded-[var(--r)] p-5 mb-[18px] border border-[rgba(194,249,77,.14)]"
      style={{ background: 'linear-gradient(150deg,#191B22,#121319)', boxShadow: 'var(--glow)' }}
    >
      <div className="absolute -right-[30px] -top-[30px] w-[140px] h-[140px] rounded-full bg-[var(--accent)] opacity-10 blur-lg" />
      <div className="flex justify-between items-start relative">
        <div>
          <div className="text-[#8B8D99] text-[12px] font-bold tracking-[.08em] uppercase mb-[7px]">Available balance</div>
          <div className="font-head font-bold text-[42px] text-white tracking-[-.02em] leading-none">{usd(balance)}</div>
          <div className="flex items-center gap-[6px] mt-[9px]">
            <span className="w-4 h-4 rounded-full bg-[var(--usdc)] flex items-center justify-center text-[9px] text-white font-extrabold">$</span>
            <span className="text-[#A9ABB6] text-[13px] font-semibold">≈ {balance.toFixed(2)} USDC</span>
          </div>
        </div>
        <button
          onClick={() => nav('/wallet/withdraw')}
          className="font-head font-extrabold text-[14px] bg-[var(--accent)] text-[var(--accent-ink)] px-4 py-[11px] rounded-[14px] flex items-center gap-[6px]"
        >
          Withdraw
          <ArrowRight width={14} height={14} />
        </button>
      </div>
      <div className="flex gap-[18px] mt-[18px] pt-[15px] border-t border-white/7 relative">
        <Stat value={usd(today, { sign: true })} label="Today" accent />
        <Divider />
        <Stat value={String(tasksDone)} label="Tasks done" />
        <Divider />
        <Stat value={`${streak} days`} label="Streak" />
      </div>
    </div>
  )
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div>
      <div className={`font-head text-[15px] font-extrabold ${accent ? 'text-[var(--accent)]' : 'text-white'}`}>{value}</div>
      <div className="text-[#74757F] text-[11px] font-semibold mt-[1px]">{label}</div>
    </div>
  )
}
const Divider = () => <div className="w-px bg-white/8" />

// ---- Task row (feed) ----
export function TaskRow({ task }: { task: Task }) {
  const nav = useNavigate()
  const left = task.goal_count - task.done_count
  const meta = [
    capitalize(categoryWord(task)),
    task.est_seconds ? etaLabel(task.est_seconds) : null,
    left < 5000 ? `${left.toLocaleString()} left` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const done = task.done_count
  const goal = task.goal_count
  const pct = goal > 0 ? Math.min(100, Math.round((done / goal) * 100)) : 0

  return (
    <button
      onClick={() => nav(`/task/${task.id}`)}
      className={`w-full text-left flex flex-col gap-2.5 p-[14px] rounded-[18px] border transition-[transform] active:scale-[.99] ${
        task.featured
          ? 'border-[rgba(139,108,255,.28)]'
          : 'bg-[#15161C] border-white/6'
      }`}
      style={task.featured ? { background: 'linear-gradient(135deg,rgba(139,108,255,.16),rgba(139,108,255,.05))' } : undefined}
    >
      <div className="flex items-start gap-[13px] w-full">
        <TaskTypeIcon type={task.type} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-[7px]">
            <span className="text-white text-[15px] font-bold leading-[1.25] line-clamp-2">{task.title}</span>
            {task.featured && <Pill tone="violet">FEATURED</Pill>}
          </div>
          <div className="text-[#8A8C98] text-[12px] font-semibold mt-[3px]">{meta}</div>
        </div>
        <div className="text-right flex-none">
          <div className="font-head text-[17px] font-extrabold text-[var(--accent)]">{usd(earnerNet(task.reward), { sign: true })}</div>
        </div>
      </div>
      {goal > 0 && (
        <div>
          <div className="h-[5px] rounded-full bg-white/8 overflow-hidden">
            <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
          </div>
          <div className="text-[#767884] text-[10.5px] font-semibold mt-1">{done.toLocaleString()} of {goal.toLocaleString()} done</div>
        </div>
      )}
    </button>
  )
}

function categoryWord(t: Task) {
  return t.category
}
function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
