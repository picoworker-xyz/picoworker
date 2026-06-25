import { useState } from 'react'
import { useStore } from '../../lib/store'
import { Page } from '../../components/Page'
import { Check } from '../../components/icons'

const TIERS = ['Rookie', 'Hustler', 'Earner', 'Grinder', 'Veteran', 'Elite', 'Master', 'Legend', 'Champion', 'Titan']
const LEVEL_PERKS = ['Up to 2× higher task payouts', 'Instant withdraws, no minimum', 'Access to exclusive high-pay tasks']

// reward for a check-in day (1..100): linear $0.001..$0.010 for days 1-10,
// then exponential growth up to $1.00 on day 100.
function dayReward(day: number) {
  const d = Math.min(Math.max(day, 1), 100)
  return d <= 10 ? 0.001 * d : 0.01 * Math.pow(100, (d - 10) / 90)
}
function fmt(n: number) {
  return n >= 0.1 ? `$${n.toFixed(2)}` : `$${n.toFixed(3)}`
}
function ymd(offsetDays: number) {
  return new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10)
}

export function Rewards() {
  const { profile, claimDailyBonus } = useStore()
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState('')
  if (!profile) return null

  const last = profile.last_bonus_date ?? null
  const claimedDay = Math.min(100, profile.streak_days || 0)
  const claimedToday = last === ymd(0)
  const continuing = last === ymd(-1)
  // days shown as already done, and the single day claimable right now
  const completedThrough = claimedToday || continuing ? claimedDay : 0
  const claimableDay = claimedToday ? null : continuing ? Math.min(100, claimedDay + 1) : 1

  const goal = 200
  const progress = Math.min(100, Math.round((profile.tasks_done / goal) * 100))

  async function claim() {
    if (!claimableDay || busy) return
    setBusy(true)
    try {
      const res = await claimDailyBonus()
      setFlash(res.claimed ? `Day ${res.day} claimed · +${fmt(res.amount)}` : 'Already claimed today')
    } catch {
      setFlash('Could not claim, try again')
    }
    setBusy(false)
    setTimeout(() => setFlash(''), 2600)
  }

  return (
    <Page title="Daily check-in" subtitle="Claim every day. The longer your streak runs, the more you earn, up to $1 a day at day 100.">
      <div className="rounded-[var(--r)] p-5 sm:p-6 bg-[#15161C] border border-white/6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <div className="text-[#8B8D99] text-[12px] font-bold uppercase tracking-[.07em]">Your streak</div>
            <div className="font-head text-[28px] font-extrabold text-white mt-1">Day {completedThrough} of 100</div>
          </div>
          <button
            onClick={claim}
            disabled={!claimableDay || busy}
            className="font-head font-extrabold text-[15px] bg-[var(--accent)] text-[var(--accent-ink)] px-6 py-[14px] rounded-[14px] disabled:opacity-50"
            style={{ boxShadow: 'var(--glow)' }}
          >
            {flash || (busy ? 'Claiming…' : claimableDay ? `Claim Day ${claimableDay} · +${fmt(dayReward(claimableDay))}` : 'Claimed today')}
          </button>
        </div>

        <div className="flex flex-col gap-5">
          {TIERS.map((tier, ti) => {
            const start = ti * 10 + 1
            return (
              <div key={tier}>
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="h-px flex-1 bg-white/8" />
                  <span className="text-[#9A9CA8] text-[12px] font-extrabold font-head uppercase tracking-[.09em]">{tier}</span>
                  <div className="h-px flex-1 bg-white/8" />
                </div>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                  {Array.from({ length: 10 }, (_, k) => {
                    const day = start + k
                    const done = day <= completedThrough
                    const claimable = day === claimableDay
                    return (
                      <div
                        key={day}
                        className={`rounded-[12px] py-2 text-center border ${
                          done
                            ? 'bg-[var(--accent)] border-transparent text-[var(--accent-ink)]'
                            : claimable
                              ? 'bg-[#F0833A] border-transparent text-white animate-pulse'
                              : 'bg-white/4 border-white/8 text-[#9A9CA8]'
                        }`}
                      >
                        <div className="text-[10px] font-bold leading-none opacity-80">Day {day}</div>
                        <div className="text-[12px] font-extrabold font-head mt-1 flex items-center justify-center h-[16px]">
                          {done ? <Check width={14} height={14} /> : fmt(dayReward(day))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
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
    </Page>
  )
}
