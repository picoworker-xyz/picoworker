import { useEffect, useState } from 'react'
import { useStore } from '../lib/store'
import { usd } from '../lib/format'
import type { Task } from '../lib/types'
import { Clock, Shield } from './icons'

function remaining(iso: string, now: number): string {
  const ms = new Date(iso).getTime() - now
  if (ms <= 0) return 'expired'
  const mins = Math.floor(ms / 60_000)
  const secs = Math.floor((ms % 60_000) / 1000)
  return `${mins}:${String(secs).padStart(2, '0')}`
}

/**
 * Reserve a slot on a task with a refundable deposit.
 *
 * Only shown when holding actually protects the worker: on a campaign with
 * plenty of slots left, nobody is racing them for one, so charging a deposit
 * would take money for nothing.
 */
export function HoldPanel({ task }: { task: Task }) {
  const { myHold, holdsFor, holdTask, releaseHold, extendHold, wallet } = useStore()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  // Ticks once a second purely to re-render the countdown.
  const [now, setNow] = useState(() => Date.now())

  const mine = myHold(task.id)
  const othersHolding = holdsFor(task.id).filter((h) => h.earner_id !== mine?.earner_id).length
  const slotsLeft = Math.max(0, task.goal_count - task.done_count)
  const contested = slotsLeft <= 3

  useEffect(() => {
    if (!mine) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [mine])

  if (!contested && !mine) return null

  const deposit = Math.min(0.01, task.reward)
  const canAfford = (wallet?.earner_balance ?? 0) >= deposit

  async function act(fn: () => Promise<unknown>) {
    setErr('')
    setBusy(true)
    try { await fn() } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  if (mine) {
    const left = remaining(mine.expires_at, now)
    return (
      <div className="rounded-[16px] border border-[rgba(46,224,110,.3)] bg-[rgba(46,224,110,.07)] p-4">
        <div className="flex items-center gap-2">
          <Clock width={16} height={16} className="text-[var(--accent-strong)] flex-none" />
          <span className="text-[13px] font-extrabold text-[var(--accent-strong)]">
            {left === 'expired' ? 'Hold expired' : `This job is yours for ${left}`}
          </span>
        </div>
        <div className="mt-1 text-[11.5px] font-semibold leading-[1.45] text-[var(--ink-3)]">
          Your {usd(mine.deposit)} deposit comes back the moment you submit. If the timer
          runs out first, it is not returned.
          {mine.extended ? ' You have already used your one extension.' : ''}
        </div>
        {err && <div className="mt-2 text-[12px] font-semibold text-[var(--coral)]">{err}</div>}
        <div className="mt-2 flex items-center gap-4">
          {!mine.extended && (
            <button
              onClick={() => void act(() => extendHold(task.id))}
              disabled={busy}
              className="text-[12px] font-extrabold text-[var(--accent-strong)] disabled:opacity-50"
            >
              {busy ? '…' : 'Need more time'}
            </button>
          )}
          <button
            onClick={() => void act(() => releaseHold(task.id))}
            disabled={busy}
            className="text-[12px] font-extrabold text-[var(--ink-4)] disabled:opacity-50"
          >
            Give up this hold
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-[16px] border border-[var(--line)] bg-[var(--fill)] p-4">
      <div className="flex items-center gap-2">
        <Shield width={16} height={16} className="text-[var(--ink-3)] flex-none" />
        <span className="text-[13px] font-extrabold text-[var(--ink)]">
          {slotsLeft === 1 ? 'Only 1 slot left' : `Only ${slotsLeft} slots left`}
          {othersHolding > 0 ? ` · ${othersHolding} held` : ''}
        </span>
      </div>
      <div className="mt-1 text-[11.5px] font-semibold leading-[1.45] text-[var(--ink-4)]">
        Hold it for {task.hold_minutes ?? 30} minutes so nobody takes the slot while you work. The {usd(deposit)}{' '}
        deposit is returned when you submit, and kept if you run out of time.
      </div>
      {err && <div className="mt-2 text-[12px] font-semibold text-[var(--coral)]">{err}</div>}
      <button
        onClick={() => void act(() => holdTask(task.id))}
        disabled={busy || !canAfford}
        className="mt-3 w-full rounded-[12px] bg-[var(--card)] border border-[var(--line-2)] py-[11px] text-[13px] font-extrabold text-[var(--ink)] disabled:opacity-50"
      >
        {busy ? 'Holding…' : canAfford ? `Hold this job · ${usd(deposit)}` : `Need ${usd(deposit)} to hold`}
      </button>
    </div>
  )
}
