import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../../lib/store'
import { supabase } from '../../lib/supabase'
import { timeAgo } from '../../lib/format'
import { Page } from '../../components/Page'
import { Send } from '../../components/icons'

const TABS = ['Overview', 'Users', 'Tasks', 'Proofs', 'Support', 'Deposits', 'Withdrawals', 'Fraud'] as const
type Tab = (typeof TABS)[number]
const RPC: Partial<Record<Tab, string>> = {
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
    setErr('')
    if (tab === 'Support') { setLoading(false); return }
    let alive = true
    setLoading(true)
    supabase!.rpc(RPC[tab]!).then(({ data, error }) => {
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
    <Page title="Team dashboard" subtitle="Everything across the platform: users, tasks, money, support, fraud.">
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

      {tab === 'Support' ? (
        <AdminSupport />
      ) : loading ? (
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
    return <a href={`https://solscan.io/tx/${value}`} target="_blank" rel="noreferrer" className="text-[var(--accent)] font-mono">{value.slice(0, 8)}…↗</a>
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

// ---- Support: ticket list + reply thread ----
type Ticket = { id: string; email: string | null; name: string | null; status: string; last_message: string | null; messages: number; updated_at: string }
type TMsg = { from_admin: boolean; body: string; created_at: string }

function AdminSupport() {
  const [tickets, setTickets] = useState<Ticket[] | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<TMsg[]>([])
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const loadTickets = useCallback(async () => {
    const { data } = await supabase!.rpc('admin_tickets')
    setTickets((data as Ticket[]) ?? [])
  }, [])
  const loadThread = useCallback(async (id: string) => {
    const { data } = await supabase!.rpc('admin_ticket_messages', { p_ticket: id })
    setMsgs((data as TMsg[]) ?? [])
  }, [])

  useEffect(() => { loadTickets() }, [loadTickets])
  useEffect(() => { endRef.current?.scrollIntoView() }, [msgs])

  function openTicket(id: string) { setOpenId(id); loadThread(id) }

  async function sendReply() {
    if (!reply.trim() || !openId || sending) return
    setSending(true)
    await supabase!.rpc('admin_reply', { p_ticket: openId, p_body: reply })
    setReply('')
    await loadThread(openId)
    await loadTickets()
    setSending(false)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* ticket list */}
      <div className="lg:col-span-1 rounded-[16px] border border-white/6 bg-[#15161C] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/6 text-white text-[14px] font-extrabold font-head">Tickets</div>
        <div className="max-h-[560px] overflow-y-auto no-scrollbar">
          {tickets === null ? (
            <Loading />
          ) : tickets.length === 0 ? (
            <div className="py-10 text-center text-[#767884] text-[13px] font-semibold">No tickets yet.</div>
          ) : (
            tickets.map((t) => (
              <button key={t.id} onClick={() => openTicket(t.id)} className={`w-full text-left px-4 py-3 border-t border-white/5 hover:bg-white/[.04] ${openId === t.id ? 'bg-white/[.06]' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-white text-[13px] font-bold truncate">{t.email ?? t.name ?? 'User'}</span>
                  <span className="text-[#5E606C] text-[10px] font-semibold whitespace-nowrap">{timeAgo(t.updated_at)}</span>
                </div>
                <div className="text-[#767884] text-[12px] font-semibold truncate mt-[2px]">{t.last_message ?? '...'}</div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* thread */}
      <div className="lg:col-span-2 rounded-[16px] border border-white/6 bg-[#15161C] flex flex-col h-[600px]">
        {!openId ? (
          <div className="m-auto text-[#767884] text-[13px] font-semibold">Select a ticket to read and reply.</div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto no-scrollbar p-4 flex flex-col gap-3">
              {msgs.map((m, i) =>
                m.from_admin ? (
                  <div key={i} className="self-end max-w-[80%] rounded-[14px] rounded-br-[4px] bg-[var(--accent)] text-[var(--accent-ink)] px-4 py-2.5 text-[14px] font-semibold">{m.body}</div>
                ) : (
                  <div key={i} className="max-w-[80%] rounded-[14px] rounded-bl-[4px] bg-white/6 text-[#E6E7EC] px-4 py-2.5 text-[14px] font-medium">{m.body}</div>
                ),
              )}
              <div ref={endRef} />
            </div>
            <div className="flex items-center gap-2 p-3 border-t border-white/6">
              <input value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendReply()} placeholder="Reply to the user…" className="flex-1 bg-white/4 border border-white/8 rounded-[12px] px-4 py-2.5 text-white text-[14px] font-medium placeholder:text-[#6E6F7A] outline-none focus:border-[var(--accent)]/60" />
              <button onClick={sendReply} disabled={sending} className="w-10 h-10 flex-none rounded-[12px] bg-[var(--accent)] text-[var(--accent-ink)] flex items-center justify-center disabled:opacity-50">
                <Send width={17} height={17} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
