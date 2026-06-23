import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../../lib/store'
import { supabase } from '../../lib/supabase'
import { Page } from '../../components/Page'

const TABS = ['Overview', 'Users', 'Tasks', 'Proofs', 'Deposits', 'Withdrawals', 'Fraud'] as const
type Tab = (typeof TABS)[number]
const RPC: Record<Tab, string> = {
  Overview: 'admin_stats',
  Users: 'admin_users',
  Tasks: 'admin_tasks',
  Proofs: 'admin_completions',
  Deposits: 'admin_deposits',
  Withdrawals: 'admin_withdrawals',
  Fraud: 'admin_fraud',
}

export function AdminDashboard() {
  const { profile } = useStore()
  const [tab, setTab] = useState<Tab>('Overview')
  const [data, setData] = useState<unknown>(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setErr('')
    supabase!.rpc(RPC[tab]).then(({ data, error }) => {
      if (!alive) return
      setLoading(false)
      if (error) setErr(error.message)
      else setData(data)
    })
    return () => {
      alive = false
    }
  }, [tab])

  if (!profile) return null
  if (!profile.is_admin) {
    return (
      <Page title="Admin">
        <div className="rounded-[var(--r)] border border-white/6 bg-[#15161C] py-16 text-center text-[#9A9CA8] text-[14px] font-semibold">
          You don't have admin access.
        </div>
      </Page>
    )
  }

  return (
    <Page title="Team dashboard" subtitle="Everything across the platform — users, tasks, money, fraud.">
      <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-none px-4 py-2 rounded-full text-[13px] font-head font-extrabold ${
              tab === t ? 'bg-[var(--accent)] text-[var(--accent-ink)]' : 'bg-white/6 text-[#C2C4CE]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <Loading />
      ) : err ? (
        <div className="rounded-[16px] p-4 bg-[rgba(255,107,90,.08)] border border-[rgba(255,107,90,.25)] text-[var(--coral)] text-[13px] font-semibold">{err}</div>
      ) : tab === 'Overview' ? (
        <Overview stats={data as Record<string, number>} />
      ) : (
        <DataTable rows={(data as Record<string, unknown>[]) ?? []} tab={tab} />
      )}
    </Page>
  )
}

function Loading() {
  return (
    <div className="rounded-[16px] p-8 bg-[#15161C] border border-white/6 flex items-center justify-center gap-3 text-[#9A9CA8]">
      <div className="w-5 h-5 rounded-full border-2 border-white/15 border-t-[var(--accent)] animate-spin" /> Loading…
    </div>
  )
}

const STAT_LABELS: Record<string, string> = {
  users: 'Total users',
  earners: 'Earners',
  businesses: 'Businesses',
  verified: 'KYC verified',
  tasks: 'Tasks',
  live_tasks: 'Live tasks',
  completions: 'Completions',
  pending_proofs: 'Pending proofs',
  total_escrow: 'Escrow (Σ)',
  total_earner_balance: 'Earner balances (Σ)',
  deposits_total: 'Deposits (Σ USDC)',
  withdrawals_total: 'Withdrawals (Σ)',
}
function Overview({ stats }: { stats: Record<string, number> | null }) {
  if (!stats) return null
  const money = new Set(['total_escrow', 'total_earner_balance', 'deposits_total', 'withdrawals_total'])
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {Object.keys(STAT_LABELS).map((k) => (
        <div key={k} className="rounded-[16px] p-5 bg-[#15161C] border border-white/6">
          <div className="text-[#8B8D99] text-[11px] font-bold uppercase tracking-[.06em]">{STAT_LABELS[k]}</div>
          <div className="font-head text-[24px] font-extrabold text-white mt-1">
            {money.has(k) ? `$${Number(stats[k] ?? 0).toFixed(2)}` : Number(stats[k] ?? 0)}
          </div>
        </div>
      ))}
    </div>
  )
}

function DataTable({ rows, tab }: { rows: Record<string, unknown>[]; tab: Tab }) {
  const cols = useMemo(() => (rows[0] ? Object.keys(rows[0]) : []), [rows])
  if (rows.length === 0) {
    return <div className="rounded-[16px] py-12 text-center bg-[#15161C] border border-white/6 text-[#767884] text-[14px] font-semibold">No {tab.toLowerCase()} yet.</div>
  }
  return (
    <div className="rounded-[16px] border border-white/6 bg-[#15161C] overflow-x-auto no-scrollbar">
      <table className="w-full text-[12.5px]">
        <thead>
          <tr className="text-[#767884] text-[11px] font-bold uppercase tracking-[.05em]">
            {cols.map((c) => (
              <th key={c} className="text-left font-bold px-3 py-3 whitespace-nowrap border-b border-white/6">{c.replace(/_/g, ' ')}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-white/4 hover:bg-white/[.03]">
              {cols.map((c) => (
                <td key={c} className="px-3 py-[10px] whitespace-nowrap text-[#D9DAE2] font-medium">
                  <Cell col={c} value={r[c]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Cell({ col, value }: { col: string; value: unknown }) {
  if (value === null || value === undefined) return <span className="text-[#5E606C]">—</span>
  if (col === 'proof_url' && typeof value === 'string') {
    return value.startsWith('http') ? (
      <a href={value} target="_blank" rel="noreferrer" className="text-[var(--accent)] font-bold">view ↗</a>
    ) : (
      <span className="text-[#767884]">{value}</span>
    )
  }
  if (col === 'signature' && typeof value === 'string') {
    return <a href={`https://solscan.io/tx/${value}?cluster=devnet`} target="_blank" rel="noreferrer" className="text-[var(--accent)] font-mono">{value.slice(0, 8)}…↗</a>
  }
  if ((col === 'status' && value === 'pending_proof') || value === 'rejected') {
    return <span className="text-[#FFB05A] font-bold">{String(value)}</span>
  }
  if (col === 'is_admin' || col === 'identity_verified' || col === 'auto_verify') {
    return value ? <span className="text-[var(--green)] font-bold">yes</span> : <span className="text-[#5E606C]">no</span>
  }
  if (col.includes('balance') || col.includes('escrow') || col === 'amount' || col === 'reward' || col === 'lifetime_earned') {
    return <span className="font-head font-bold text-white">${Number(value).toFixed(2)}</span>
  }
  if (col === 'created_at' && typeof value === 'string') {
    return <span className="text-[#9A9CA8]">{new Date(value).toLocaleString()}</span>
  }
  if (col === 'address' && typeof value === 'string') return <span className="font-mono text-[#9A9CA8]">{value.slice(0, 10)}…</span>
  return <span>{String(value)}</span>
}
