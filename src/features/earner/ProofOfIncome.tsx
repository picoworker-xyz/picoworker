import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../../lib/store'
import { supabase } from '../../lib/supabase'
import { usd } from '../../lib/format'
import { Page } from '../../components/Page'
import { ArrowDown } from '../../components/icons'
import { Chip } from '../../components/ui'
import type { LedgerEntry } from '../../lib/types'

// Earnings that count toward income: task rewards, referral and welcome/check-in bonuses.
const EARNING_TYPES = new Set(['task_reward', 'referral_bonus', 'welcome_bonus'])

type Period = 'this_month' | 'last_month' | 'last_3_months' | 'all'
const PERIODS: { key: Period; label: string }[] = [
  { key: 'this_month', label: 'This month' },
  { key: 'last_month', label: 'Last month' },
  { key: 'last_3_months', label: 'Last 3 months' },
  { key: 'all', label: 'All time' },
]

function fmtDate(iso: string | number | Date): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

// [start, end] millisecond range for the chosen period. `earliest` anchors "all time".
function rangeFor(period: Period, earliest: number): [number, number] {
  const now = new Date()
  const end = Date.now()
  if (period === 'this_month') return [+new Date(now.getFullYear(), now.getMonth(), 1), end]
  if (period === 'last_month') {
    const start = +new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const last = +new Date(now.getFullYear(), now.getMonth(), 1) - 1 // last ms of previous month
    return [start, last]
  }
  if (period === 'last_3_months') return [+new Date(now.getFullYear(), now.getMonth() - 2, 1), end]
  return [earliest, end]
}

export function ProofOfIncome() {
  const { profile, wallet, ledgerFor } = useStore()
  const [email, setEmail] = useState('')
  const [period, setPeriod] = useState<Period>('last_month')

  useEffect(() => {
    supabase?.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''))
  }, [])

  const entries = useMemo<LedgerEntry[]>(() => (profile ? ledgerFor(profile.id) : []), [profile, ledgerFor])

  if (!profile || !wallet) return null

  const name = profile.business_name ?? profile.display_name
  const allDates = entries.map((e) => +new Date(e.created_at))
  const earliest = allDates.length ? Math.min(...allDates) : +new Date(profile.created_at)
  const [start, end] = rangeFor(period, earliest)
  const inRange = (e: LedgerEntry) => {
    const t = +new Date(e.created_at)
    return t >= start && t <= end
  }

  const payouts = entries
    .filter((e) => inRange(e) && EARNING_TYPES.has(e.type) && e.amount > 0)
    .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))
  const grossEarned = payouts.reduce((s, e) => s + e.amount, 0)
  const tasksCompleted = payouts.filter((e) => e.type === 'task_reward').length
  const withdrawalsPaid = entries
    .filter((e) => inRange(e) && e.type === 'withdrawal')
    .reduce((s, e) => s + Math.abs(e.amount), 0)

  const statementId = `${profile.id.slice(0, 8).toUpperCase()}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`

  return (
    <Page
      title="Proof of income"
      subtitle="An official statement of your PicoWorker earnings. Print or save as PDF to share with landlords, lenders or agencies."
      back
      actions={
        <button
          onClick={() => window.print()}
          className="font-head font-extrabold text-[14px] bg-[var(--accent)] text-[var(--accent-ink)] px-5 py-3 rounded-[12px] flex items-center gap-2"
        >
          <ArrowDown width={16} height={16} /> Download PDF
        </button>
      }
    >
      {/* Print rules: only the statement is sent to the printer. */}
      <style>{`@media print {
        body * { visibility: hidden !important; }
        #income-statement, #income-statement * { visibility: visible !important; }
        #income-statement { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; }
      }`}</style>

      {/* Period selector (not printed) */}
      <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar max-w-[720px] mx-auto">
        {PERIODS.map((p) => (
          <Chip key={p.key} active={period === p.key} onClick={() => setPeriod(p.key)}>{p.label}</Chip>
        ))}
      </div>

      <div
        id="income-statement"
        className="max-w-[720px] mx-auto bg-white text-[#111] rounded-[var(--r)] border border-black/10 p-8 lg:p-10 font-mono text-[13.5px] leading-[1.7]"
      >
        <div className="text-center border-b border-black/15 pb-5 mb-6">
          <div className="font-head font-extrabold text-[22px] tracking-[.04em]">PROOF OF INCOME STATEMENT</div>
        </div>

        <Section>
          <Line label="Issued by" value="PicoWorker (picoworker.xyz)" />
          <Line label="Issue date" value={fmtDate(Date.now())} />
          <Line label="Statement ID" value={statementId} />
        </Section>

        <Section>
          <Line label="Recipient" value={name} />
          <Line label="Account email" value={email || '—'} />
          <Line label="Account ID" value={profile.id} />
          <Line label="Period covered" value={`${fmtDate(start)} to ${fmtDate(end)}`} />
        </Section>

        <Heading>Earnings summary</Heading>
        <Section>
          <Line label="Tasks completed" value={String(tasksCompleted)} indent />
          <Line label="Gross earned" value={`${usd(grossEarned)} USDC`} indent />
          <Line label="Withdrawals paid" value={usd(withdrawalsPaid)} indent />
        </Section>

        <Heading>Itemized payouts</Heading>
        {payouts.length === 0 ? (
          <div className="text-black/50 pl-2">No payouts recorded for this period.</div>
        ) : (
          <div>
            {payouts.map((e) => (
              <div key={e.id} className="flex items-baseline gap-3 py-[3px]">
                <span className="text-black/60 w-[92px] flex-none">{fmtDate(e.created_at)}</span>
                <span className="flex-1 min-w-0 truncate">{e.title}</span>
                <span className="font-bold tabular-nums flex-none">{usd(e.amount)}</span>
              </div>
            ))}
            <div className="flex items-baseline gap-3 py-2 mt-2 border-t border-black/15 font-bold">
              <span className="w-[92px] flex-none">Total</span>
              <span className="flex-1" />
              <span className="tabular-nums flex-none">{usd(grossEarned)}</span>
            </div>
          </div>
        )}

        <div className="mt-8 pt-5 border-t border-black/15 text-[11px] text-black/55 leading-[1.6]">
          This statement was generated automatically from PicoWorker's payment records for the account above.
          All amounts are in USDC. To verify authenticity, contact support at picoworker.xyz and quote statement ID {statementId}.
        </div>
      </div>
    </Page>
  )
}

function Section({ children }: { children: React.ReactNode }) {
  return <div className="mb-5">{children}</div>
}

function Heading({ children }: { children: React.ReactNode }) {
  return <div className="font-head font-extrabold text-[14px] tracking-[.03em] border-b border-black/15 pb-1 mb-2 mt-6">{children}</div>
}

function Line({ label, value, indent }: { label: string; value: string; indent?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className={`text-black/60 ${indent ? 'pl-4' : ''}`} style={{ minWidth: indent ? 150 : 130 }}>
        {label}
      </span>
      <span className="flex-1 min-w-0 break-words font-medium">{value}</span>
    </div>
  )
}
