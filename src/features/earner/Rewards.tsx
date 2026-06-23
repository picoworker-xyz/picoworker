import { useState } from 'react'
import { useStore } from '../../lib/store'
import { usd } from '../../lib/format'
import { Page } from '../../components/Page'
import { Check, Flame } from '../../components/icons'

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const LEVEL_PERKS = ['Up to 2× higher task payouts', 'Instant withdraws, no minimum', 'Access to exclusive high-pay tasks']

export function Rewards() {
  const { profile, claimDailyBonus } = useStore()
  const [claimed, setClaimed] = useState(false)
  const [flash, setFlash] = useState('')
  if (!profile) return null

  const streak = profile.streak_days
  const goal = 200
  const progress = Math.min(100, Math.round((profile.tasks_done / goal) * 100))

  async function claim() {
    if (claimed) return
    try {
      const res = await claimDailyBonus()
      setClaimed(true)
      setFlash(res.claimed ? `+${usd(res.amount).slice(1)} added!` : 'Already claimed today')
      setTimeout(() => setFlash(''), 2200)
    } catch {
      setClaimed(true)
    }
  }

  return (
    <Page title="Rewards" subtitle="Keep your streak alive and level up.">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* streak */}
        <div className="rounded-[var(--r)] p-6 bg-[#15161C] border border-white/6">
          <div className="flex items-center gap-2 mb-5">
            <Flame width={16} height={18} className="text-[var(--coral)]" />
            <span className="text-white text-[16px] font-extrabold font-head">{streak}-day streak — keep it alive!</span>
          </div>
          <div className="flex justify-between mb-5">
            {DAYS.map((d, i) => {
              const active = i < streak % 7 || (streak >= 7 && true)
              const today = i === Math.min(streak % 7, 6)
              return (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-extrabold font-head ${today ? 'bg-[rgba(255,107,90,.16)] text-[var(--coral)] border border-[var(--coral)]' : active ? 'bg-[var(--accent)] text-[var(--accent-ink)]' : 'bg-white/6 text-[#6E6F7A]'}`}>
                    {active && !today ? <Check width={15} height={15} /> : today ? '!' : ''}
                  </div>
                  <span className="text-[#767884] text-[11px] font-bold">{d}</span>
                </div>
              )
            })}
          </div>
          <button onClick={claim} disabled={claimed} className="w-full font-head font-extrabold text-[15px] bg-[var(--accent)] text-[var(--accent-ink)] py-[13px] rounded-[14px] disabled:opacity-60">
            {flash || (claimed ? 'Claimed today ✓' : "Claim today's +$0.05 bonus")}
          </button>
        </div>

        {/* level */}
        <div className="rounded-[var(--r)] p-6 bg-[#15161C] border border-white/6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-[#8B8D99] text-[12px] font-bold uppercase tracking-[.07em]">Your level</div>
              <div className="font-head text-[26px] font-extrabold text-white mt-1">{profile.level.toUpperCase()}</div>
            </div>
            <div className="text-right">
              <div className="font-head text-[26px] font-extrabold text-[var(--accent)]">{progress}%</div>
              <div className="text-[#767884] text-[11px] font-semibold">{profile.tasks_done} / {goal} tasks to Gold</div>
            </div>
          </div>
          <div className="h-[10px] rounded-full bg-white/8 overflow-hidden mb-5">
            <div className="h-full rounded-full bg-gradient-to-r from-[#7ec900] to-[var(--accent)]" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex flex-col gap-[10px]">
            {LEVEL_PERKS.map((p) => (
              <div key={p} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[rgba(194,249,77,.14)] flex items-center justify-center flex-none">
                  <Check width={14} height={14} className="text-[var(--accent)]" />
                </div>
                <span className="text-[#D9DAE2] text-[14px] font-semibold">{p}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Page>
  )
}
