// Money / display helpers. All amounts are stored as numbers (USD/USDC, simulated).

export function usd(amount: number, opts: { sign?: boolean } = {}): string {
  const sign = opts.sign && amount > 0 ? '+' : ''
  const neg = amount < 0 ? '-' : ''
  const v = Math.abs(amount)
  // tiny rewards need more precision (e.g. $0.04), balances 2dp
  const dp = v > 0 && v < 1 ? 2 : 2
  return `${neg}${sign}$${v.toFixed(dp)}`
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
