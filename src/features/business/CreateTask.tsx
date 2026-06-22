import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { usd } from '../../lib/format'
import type { TaskType } from '../../lib/types'
import { Page } from '../../components/Page'
import { TaskTypeIcon } from '../../components/layout'

const TYPES: { type: TaskType; label: string; category: string; needsTarget: 'handle' | 'url' | null; auto: boolean; reward: number }[] = [
  { type: 'follow_x', label: 'Follow X', category: 'Social', needsTarget: 'handle', auto: true, reward: 0.04 },
  { type: 'yt_views', label: 'YT views', category: 'Watch', needsTarget: 'url', auto: true, reward: 0.02 },
  { type: 'app_install', label: 'App install', category: 'Apps', needsTarget: 'url', auto: false, reward: 0.35 },
  { type: 'survey', label: 'Survey', category: 'Surveys', needsTarget: null, auto: false, reward: 0.18 },
  { type: 'visit_site', label: 'Visit site', category: 'Ads', needsTarget: 'url', auto: true, reward: 0.03 },
  { type: 'custom', label: 'Custom', category: 'Apps', needsTarget: null, auto: false, reward: 0.2 },
]

export function CreateTask() {
  const nav = useNavigate()
  const { createTask } = useStore()
  const [typeIdx, setTypeIdx] = useState(0)
  const [target, setTarget] = useState('')
  const [reward, setReward] = useState('0.04')
  const [count, setCount] = useState('500')

  const t = TYPES[typeIdx]
  const r = parseFloat(reward) || 0
  const n = parseInt(count) || 0
  const rewards = r * n
  const fee = rewards * 0.1
  const budget = rewards + fee

  function pickType(i: number) {
    setTypeIdx(i)
    setReward(TYPES[i].reward.toFixed(2))
    setTarget('')
  }

  function review() {
    const titleMap: Record<TaskType, string> = {
      follow_x: `Follow ${target || '@yourhandle'} on X`,
      yt_views: 'Watch your video',
      app_install: 'Install & try your app',
      survey: 'Complete your survey',
      visit_site: 'Visit your site',
      custom: 'Custom task',
    }
    const task = createTask({
      type: t.type,
      title: titleMap[t.type],
      subtitle: t.label,
      target: target.trim(),
      reward: r,
      goal_count: n,
      auto_verify: t.auto,
      category: t.category,
    })
    nav(`/business/fund?task=${task.id}`)
  }

  return (
    <Page title="New task" subtitle="Step 1 of 2 · Set up your campaign" back>
      <div className="grid lg:grid-cols-3 gap-6 items-start">
        {/* form */}
        <div className="lg:col-span-2 rounded-[var(--r)] bg-[#15161C] border border-white/6 p-6">
          <Label>Task type</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
            {TYPES.map((x, i) => (
              <button key={x.type} onClick={() => pickType(i)} className={`py-[14px] rounded-[14px] text-[13px] font-extrabold font-head border ${i === typeIdx ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-transparent' : 'bg-white/4 text-[#C2C4CE] border-white/8 hover:bg-white/8'}`}>
                {x.label}
              </button>
            ))}
          </div>

          {t.needsTarget && (
            <>
              <Label>{t.needsTarget === 'handle' ? 'Your handle to follow' : 'Link'}</Label>
              <div className="flex items-center bg-white/4 border border-white/8 rounded-[14px] px-4 mb-6">
                {t.needsTarget === 'handle' && <span className="text-[#9A9CA8] text-[16px] font-bold">@</span>}
                <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder={t.needsTarget === 'handle' ? 'yourhandle' : 'https://…'} className="flex-1 bg-transparent outline-none py-[14px] px-2 text-white text-[15px] font-semibold placeholder:text-[#6E6F7A]" />
              </div>
            </>
          )}

          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div>
              <Label>Reward each</Label>
              <Stepper value={reward} prefix="$" onStep={(d) => setReward(Math.max(0.01, r + d * 0.01).toFixed(2))} onChange={setReward} />
            </div>
            <div>
              <Label>How many</Label>
              <Stepper value={count} onStep={(d) => setCount(String(Math.max(1, n + d * 50)))} onChange={(v) => setCount(v.replace(/[^0-9]/g, ''))} />
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-[14px] bg-[rgba(68,209,122,.08)] border border-[rgba(68,209,122,.2)] p-4">
            <span className="text-[var(--green)] text-[13px] font-bold">
              {t.auto ? 'Auto-verified — you only pay for real results' : 'Manual review — you only pay for approved proofs'}
            </span>
          </div>
        </div>

        {/* summary */}
        <aside className="lg:sticky lg:top-6 rounded-[var(--r)] bg-[#15161C] border border-white/6 p-6">
          <div className="flex items-center gap-3 mb-5">
            <TaskTypeIcon type={t.type} size={46} />
            <div>
              <div className="text-white text-[15px] font-bold">{t.label}</div>
              <div className="text-[#767884] text-[12px] font-semibold">{t.category}</div>
            </div>
          </div>
          <div className="flex flex-col gap-[10px] mb-5">
            <Line label="Reward each" value={usd(r)} />
            <Line label="Quantity" value={String(n)} />
            <Line label="Rewards total" value={usd(rewards)} />
            <Line label="Platform fee (10%)" value={usd(fee)} />
            <div className="h-px bg-white/8 my-1" />
            <Line label="Est. budget" value={usd(budget)} strong />
          </div>
          <button onClick={review} disabled={n <= 0 || r <= 0} className="w-full font-head font-extrabold text-[16px] bg-[var(--accent)] text-[var(--accent-ink)] py-[15px] rounded-[15px] disabled:opacity-50" style={{ boxShadow: 'var(--glow)' }}>
            Review &amp; fund
          </button>
        </aside>
      </div>
    </Page>
  )
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[#8B8D99] text-[12px] font-bold uppercase tracking-[.07em] mb-2">{children}</div>
)
function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[#9A9CA8] text-[13px] font-semibold">{label}</span>
      <span className={`font-head ${strong ? 'text-white text-[18px] font-extrabold' : 'text-[#D9DAE2] text-[14px] font-bold'}`}>{value}</span>
    </div>
  )
}
function Stepper({ value, prefix, onStep, onChange }: { value: string; prefix?: string; onStep: (dir: number) => void; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center bg-white/4 border border-white/8 rounded-[14px] overflow-hidden">
      <button onClick={() => onStep(-1)} className="w-11 h-[50px] text-white text-[20px] font-bold hover:bg-white/6">−</button>
      <div className="flex-1 flex items-center justify-center">
        {prefix && <span className="text-white text-[16px] font-bold font-head">{prefix}</span>}
        <input value={value} onChange={(e) => onChange(e.target.value)} inputMode="decimal" className="w-full bg-transparent outline-none text-center text-white text-[16px] font-extrabold font-head" />
      </div>
      <button onClick={() => onStep(1)} className="w-11 h-[50px] text-white text-[20px] font-bold hover:bg-white/6">+</button>
    </div>
  )
}
