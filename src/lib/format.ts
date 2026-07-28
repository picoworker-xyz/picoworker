// Money / display helpers. All amounts are stored as numbers (USD/USDC, simulated).

// Workers keep 80% of a task's reward. The other 20% splits into 5% referrer
// (or development when the worker has no referrer), 10% across the team, and
// 5% development. The business is not charged a fee, so task.reward is the
// gross amount the business pays; earners see and receive this net share.
// Mirrors distribute_platform_cut in supabase/revenue_split.sql.
export const WORKER_SHARE = 0.80

// Signup bonuses. Mirrors supabase/bonuses.sql; change both together.
export const WELCOME_BONUS = 0.05
export const REFERRAL_JOIN_BONUS = 0.01

// Ongoing cut a referrer earns from everything their invitee earns. Mirrors
// distribute_platform_cut in supabase/revenue_split.sql. Marketing copy reads
// this rather than hardcoding a number, which is how it drifted to 10% before.
export const REFERRAL_SHARE_PCT = 5
export const earnerNet = (reward: number): number => +(reward * WORKER_SHARE).toFixed(6)

export function usd(amount: number, opts: { sign?: boolean } = {}): string {
  const sign = opts.sign && amount > 0 ? '+' : ''
  const neg = amount < 0 ? '-' : ''
  const v = Math.abs(amount)
  // Sub-dollar amounts show up to 6 decimals, matching the 6dp the database
  // stores, so revenue-share amounts ($0.000125 per team member on a $0.01
  // offer) are shown exactly rather than rounded to a misleading $0.0001.
  // Trailing zeros past 2 places are trimmed. $1+ uses 2dp.
  const s = v > 0 && v < 1 ? v.toFixed(6).replace(/(\.\d{2}\d*?)0+$/, '$1') : v.toFixed(2)
  return `${neg}${sign}$${s}`
}

export function usdc(amount: number): string {
  return `${amount.toFixed(2)} USDC`
}

export function shortAddr(addr: string | null | undefined): string {
  if (!addr) return '—'
  if (addr.length <= 12) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

// Unreviewed proofs auto-approve in favour of the worker. Mirrors
// auto_approve_old_proofs() in supabase/task_features.sql.
export const AUTO_APPROVE_DAYS = 7

// The 7-day mark is when a submission becomes *eligible*, but the cron only
// runs at 02:00 UTC daily, so approval lands at the first 02:00 UTC after that.
// Counting down to the bare 7-day mark would leave the timer stuck at zero for
// up to 24 hours, so we count down to the run that will actually approve it.
export function autoApproveAt(createdAt: string): Date {
  const eligible = new Date(new Date(createdAt).getTime() + AUTO_APPROVE_DAYS * 86_400_000)
  const run = new Date(eligible)
  run.setUTCHours(2, 0, 0, 0)
  if (run.getTime() <= eligible.getTime()) run.setUTCDate(run.getUTCDate() + 1)
  return run
}

// Coarse "time remaining" label. Deliberately not second-by-second: this is a
// reassurance, not a stopwatch, and a ticking clock would need a re-render loop.
export function timeUntil(target: Date, now: number = Date.now()): string {
  const ms = target.getTime() - now
  if (ms <= 0) return 'any moment now'
  const mins = Math.floor(ms / 60_000)
  if (mins < 60) return `${Math.max(1, mins)} minute${mins === 1 ? '' : 's'}`
  const hours = Math.floor(mins / 60)
  if (hours < 48) return `${hours} hour${hours === 1 ? '' : 's'}`
  return `${Math.floor(hours / 24)} days`
}

export function pct(done: number, goal: number): number {
  if (goal <= 0) return 0
  return Math.min(100, Math.round((done / goal) * 100))
}

const ETA_LABELS: Record<number, string> = {}
export function etaLabel(seconds: number): string {
  if (ETA_LABELS[seconds]) return ETA_LABELS[seconds]
  if (seconds < 60) return `~${seconds}s`
  return `${Math.round(seconds / 60)} min`
}
