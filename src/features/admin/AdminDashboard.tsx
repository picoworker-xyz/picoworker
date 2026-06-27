import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../../lib/store'
import { supabase } from '../../lib/supabase'
import { timeAgo, usd } from '../../lib/format'
import { Page } from '../../components/Page'
import { Send } from '../../components/icons'

const TABS = ['Overview', 'Users', 'Tasks', 'Proofs', 'Support', 'Appeals', 'Deposits', 'Withdrawals', 'Fraud'] as const
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
const PAGE_SIZE = 25

export function AdminDashboard() {
  const { profile } = useStore()
  const [tab, setTab] = useState<Tab>('Overview')
  const [data, setData] = useState<unknown>(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [detailId, setDetailId] = useState<string | null>(null)

  useEffect(() => {
    setErr('')
    setData(null) // drop the previous tab's data so it can't render into this tab
    setSearch('')
    setPage(0)
    if (tab === 'Support' || tab === 'Appeals' || tab === 'Withdrawals') { setLoading(false); return }
    let alive = true
    setLoading(true)
    supabase!.rpc(RPC[tab]!).then(({ data, error }) => {
      if (!alive) return
      setLoading(false)
      if (error) setErr(error.message)
      else setData(data)
    })
    return () => { alive = false }
  }, [tab])

  useEffect(() => setPage(0), [search])

  const allRows = Array.isArray(data) ? (data as Record<string, unknown>[]) : []
  const term = search.trim().toLowerCase()
  const filtered = useMemo(
    () => (term ? allRows.filter((r) => Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(term))) : allRows),
    [allRows, term],
  )
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

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

  const isTable = tab !== 'Overview' && tab !== 'Support' && tab !== 'Appeals' && tab !== 'Withdrawals'

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

      {isTable && !loading && !err && (
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === 'Users' ? 'Search name or email…' : `Search ${tab.toLowerCase()}…`}
            className="flex-1 min-w-[220px] bg-[#15161C] border border-white/10 rounded-[12px] px-4 py-2.5 text-white text-[14px] font-medium placeholder:text-[#6E6F7A] outline-none focus:border-[var(--accent)]/60"
          />
          <div className="text-[#767884] text-[12px] font-semibold">{filtered.length} {tab.toLowerCase()}</div>
        </div>
      )}

      {tab === 'Support' ? (
        <AdminSupport />
      ) : tab === 'Appeals' ? (
        <AdminAppeals />
      ) : tab === 'Withdrawals' ? (
        <AdminWithdrawals />
      ) : loading ? (
        <Loading />
      ) : err ? (
        <div className="rounded-[16px] p-4 bg-[rgba(255,107,90,.08)] border border-[rgba(255,107,90,.25)] text-[var(--coral)] text-[13px] font-semibold">{err}</div>
      ) : tab === 'Overview' ? (
        <Overview stats={data && !Array.isArray(data) ? (data as Record<string, number>) : null} />
      ) : (
        <>
          <DataTable rows={pageRows} tab={tab} onRowClick={tab === 'Users' ? (r) => setDetailId(String(r.id)) : undefined} />
          <Pagination page={page} pageCount={pageCount} onPage={setPage} />
        </>
      )}

      {detailId && <UserDetail id={detailId} onClose={() => setDetailId(null)} />}
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

function Pagination({ page, pageCount, onPage }: { page: number; pageCount: number; onPage: (p: number) => void }) {
  if (pageCount <= 1) return null
  const start = Math.max(0, Math.min(page - 2, pageCount - 5))
  const end = Math.min(pageCount, start + 5)
  const nums: number[] = []
  for (let i = start; i < end; i++) nums.push(i)
  const btn = 'min-w-9 h-9 px-2 rounded-[10px] text-[13px] font-head font-extrabold'
  return (
    <div className="flex items-center justify-center gap-1.5 mt-5">
      <button disabled={page === 0} onClick={() => onPage(page - 1)} className={`${btn} bg-white/6 text-white disabled:opacity-40`}>Prev</button>
      {start > 0 && <span className="text-[#767884] px-1">…</span>}
      {nums.map((i) => (
        <button key={i} onClick={() => onPage(i)} className={`${btn} ${i === page ? 'bg-[var(--accent)] text-[var(--accent-ink)]' : 'bg-white/6 text-[#C2C4CE]'}`}>{i + 1}</button>
      ))}
      {end < pageCount && <span className="text-[#767884] px-1">…</span>}
      <button disabled={page >= pageCount - 1} onClick={() => onPage(page + 1)} className={`${btn} bg-white/6 text-white disabled:opacity-40`}>Next</button>
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

function DataTable({ rows, tab, onRowClick }: { rows: Record<string, unknown>[]; tab: Tab; onRowClick?: (r: Record<string, unknown>) => void }) {
  const cols = useMemo(() => (rows[0] ? Object.keys(rows[0]) : []), [rows])
  if (rows.length === 0) {
    return <div className="rounded-[16px] py-12 text-center bg-[#15161C] border border-white/6 text-[#767884] text-[14px] font-semibold">No {tab.toLowerCase()} found.</div>
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
            <tr
              key={i}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              className={`border-b border-white/4 hover:bg-white/[.03] ${onRowClick ? 'cursor-pointer' : ''}`}
            >
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
      <a href={value} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-[var(--accent)] font-bold">view ↗</a>
    ) : (
      <span className="text-[#767884]">{value}</span>
    )
  }
  if (col === 'signature' && typeof value === 'string') {
    return <a href={`https://solscan.io/tx/${value}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-[var(--accent)] font-mono">{value.slice(0, 8)}…↗</a>
  }
  if ((col === 'status' && value === 'pending_proof') || value === 'rejected') {
    return <span className="text-[#FFB05A] font-bold">{String(value)}</span>
  }
  if (col === 'is_admin' || col === 'identity_verified' || col === 'auto_verify') {
    return value ? <span className="text-[var(--green)] font-bold">yes</span> : <span className="text-[#5E606C]">no</span>
  }
  if (col.includes('balance') || col.includes('escrow') || col === 'amount' || col === 'reward' || col === 'lifetime_earned') {
    return <span className="font-head font-bold text-white">{usd(Number(value))}</span>
  }
  if (col === 'created_at' && typeof value === 'string') {
    return <span className="text-[#9A9CA8]">{new Date(value).toLocaleString()}</span>
  }
  if (col === 'address' && typeof value === 'string') return <span className="font-mono text-[#9A9CA8]">{value.slice(0, 10)}…</span>
  return <span>{String(value)}</span>
}

// ---- User detail modal ----
function UserDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const [d, setD] = useState<Record<string, unknown> | null>(null)
  const [err, setErr] = useState('')
  const [working, setWorking] = useState(false)

  const fetchDetail = useCallback(async () => {
    const { data, error } = await supabase!.rpc('admin_user_detail', { p_id: id })
    if (error) setErr(error.message)
    else setD(data as Record<string, unknown>)
  }, [id])

  useEffect(() => { fetchDetail() }, [fetchDetail])

  const p = (d?.profile ?? {}) as Record<string, unknown>
  const suspended = Boolean(p.suspended)

  async function toggleSuspend() {
    const reason = suspended ? null : window.prompt('Reason for suspension (optional):') ?? ''
    setWorking(true)
    await supabase!.rpc('admin_set_suspended', { p_profile: id, p_suspended: !suspended, p_reason: reason })
    await fetchDetail()
    setWorking(false)
  }
  const w = (d?.wallet ?? {}) as Record<string, unknown>
  const counts = (d?.counts ?? {}) as Record<string, unknown>
  const fmtDate = (v: unknown) => (v ? new Date(String(v)).toLocaleString() : '—')

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[760px] my-8 rounded-[22px] bg-[#15161C] border border-white/10 p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="font-head font-extrabold text-[22px] text-white">{String(p.display_name ?? 'User')}</div>
            <div className="text-[#9A9CA8] text-[13px] font-semibold">{String(p.email ?? '—')}</div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/8 text-white text-[18px] font-bold flex items-center justify-center">×</button>
        </div>

        {!d && !err && <Loading />}
        {err && <div className="text-[var(--coral)] text-[13px] font-semibold">{err}</div>}

        {d && (
          <div className="flex flex-col gap-5">
            <div className={`flex items-center justify-between gap-3 rounded-[14px] p-3.5 border ${suspended ? 'bg-[rgba(255,107,90,.08)] border-[rgba(255,107,90,.3)]' : 'bg-white/[.03] border-white/6'}`}>
              <div className={`text-[13px] font-bold ${suspended ? 'text-[var(--coral)]' : 'text-[#9A9CA8]'}`}>
                {suspended ? `Suspended${p.suspended_reason ? ' · ' + p.suspended_reason : ''}` : 'Account active'}
              </div>
              <button
                onClick={toggleSuspend}
                disabled={working}
                className={`px-4 py-2 rounded-[11px] text-[13px] font-extrabold font-head disabled:opacity-50 ${suspended ? 'bg-[var(--accent)] text-[var(--accent-ink)]' : 'bg-[var(--coral)] text-white'}`}
              >
                {working ? '…' : suspended ? 'Unsuspend' : 'Suspend'}
              </button>
            </div>

            {(Boolean(p.is_admin) || Number(d.shared_device) > 0 || Number(d.shared_ip) > 0) && (
              <div className="flex flex-wrap gap-2">
                {Boolean(p.is_admin) && <Tag tone="lime">Admin</Tag>}
                {Boolean(p.identity_verified) && <Tag tone="lime">Verified</Tag>}
                {Number(d.shared_device) > 0 && <Tag tone="warn">Shares device with {Number(d.shared_device)}</Tag>}
                {Number(d.shared_ip) > 0 && <Tag tone="warn">Shares IP with {Number(d.shared_ip)}</Tag>}
              </div>
            )}

            <Section title="Account">
              <Field label="Mode" value={String(p.mode ?? '—')} />
              <Field label="Level" value={String(p.level ?? '—')} />
              <Field label="Member since" value={String(p.member_since ?? '—')} />
              <Field label="KYC" value={String(p.kyc_status ?? 'none')} />
              <Field label="Referral code" value={String(p.referral_code ?? '—')} />
              <Field label="Invited by" value={String(d.referred_by_name ?? '—')} />
            </Section>

            <Section title="Login & security">
              <Field label="Last login" value={fmtDate(p.last_sign_in_at)} />
              <Field label="Email confirmed" value={fmtDate(p.email_confirmed_at)} />
              <Field label="Signed up" value={fmtDate(p.signed_up)} />
              <Field label="Last active" value={fmtDate(p.last_active)} />
              <Field label="Device ID" value={String(p.device_hash ?? '—')} mono />
              <Field label="Signup IP" value={String(p.signup_ip ?? '—')} mono />
            </Section>

            <Section title="Money">
              <Field label="Earner balance" value={usd(Number(w.earner_balance ?? 0))} />
              <Field label="Business escrow" value={usd(Number(w.business_escrow ?? 0))} />
              <Field label="Lifetime earned" value={usd(Number(w.lifetime_earned ?? 0))} />
              <Field label="Deposit address" value={String(d.deposit_address ?? '—')} mono />
              <Field label="Referral earnings" value={usd(Number(counts.ref_earnings ?? 0))} />
            </Section>

            <Section title="Activity">
              <Field label="Tasks done" value={String(p.tasks_done ?? 0)} />
              <Field label="Completions" value={String(counts.completions ?? 0)} />
              <Field label="Approved" value={String(counts.approved ?? 0)} />
              <Field label="Pending proofs" value={String(counts.pending ?? 0)} />
              <Field label="Check-in streak" value={`Day ${Number(p.streak_days ?? 0)}`} />
              <Field label="Referred users" value={String(counts.referred ?? 0)} />
            </Section>

            <MiniTable title="Recent completions" rows={d.recent_completions as Record<string, unknown>[]} cols={['title', 'status', 'reward', 'created_at']} />
            <MiniTable title="Deposits" rows={d.deposits as Record<string, unknown>[]} cols={['amount', 'status', 'signature', 'created_at']} />
            <MiniTable title="Withdrawals" rows={d.withdrawals as Record<string, unknown>[]} cols={['amount', 'status', 'address', 'created_at']} />
            <MiniTable title="Referred users" rows={d.referrals as Record<string, unknown>[]} cols={['display_name', 'status', 'earnings', 'tasks']} />
          </div>
        )}
      </div>
    </div>
  )
}

function Tag({ children, tone }: { children: React.ReactNode; tone: 'lime' | 'warn' }) {
  const cls = tone === 'lime' ? 'bg-[rgba(194,249,77,.14)] text-[var(--accent)]' : 'bg-[rgba(255,176,90,.14)] text-[#FFB05A]'
  return <span className={`px-3 py-1 rounded-full text-[12px] font-extrabold font-head ${cls}`}>{children}</span>
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[#8B8D99] text-[11px] font-bold uppercase tracking-[.07em] mb-2">{title}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 rounded-[14px] bg-white/[.03] border border-white/6 p-4">{children}</div>
    </div>
  )
}
function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[#767884] text-[12.5px] font-semibold flex-none">{label}</span>
      <span className={`text-[#E6E7EC] text-[13px] font-bold text-right break-all ${mono ? 'font-mono text-[11.5px]' : ''}`}>{value}</span>
    </div>
  )
}
function MiniTable({ title, rows, cols }: { title: string; rows: Record<string, unknown>[]; cols: string[] }) {
  const list = Array.isArray(rows) ? rows : []
  return (
    <div>
      <div className="text-[#8B8D99] text-[11px] font-bold uppercase tracking-[.07em] mb-2">{title}</div>
      {list.length === 0 ? (
        <div className="text-[#5E606C] text-[12.5px] font-semibold rounded-[14px] bg-white/[.03] border border-white/6 px-4 py-3">None</div>
      ) : (
        <div className="rounded-[14px] bg-white/[.03] border border-white/6 overflow-x-auto no-scrollbar">
          <table className="w-full text-[12px]">
            <tbody>
              {list.map((r, i) => (
                <tr key={i} className="border-b border-white/5 last:border-0">
                  {cols.map((c) => (
                    <td key={c} className="px-3 py-2 whitespace-nowrap text-[#D9DAE2]"><Cell col={c} value={r[c]} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---- Withdrawals: approve/reject the ones held over the $5/day limit ----
function AdminWithdrawals() {
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase!.rpc('admin_withdrawals')
    const list = Array.isArray(data) ? (data as Record<string, unknown>[]) : []
    list.sort((a, b) => (b.status === 'pending_review' ? 1 : 0) - (a.status === 'pending_review' ? 1 : 0))
    setRows(list)
  }, [])
  useEffect(() => { load() }, [load])

  async function approve(id: string) {
    setBusy(id); setMsg('')
    const { data, error } = await supabase!.functions.invoke('admin-withdraw-approve', { body: { id } })
    const e = (data as { error?: string } | null)?.error
    if (error || e) setMsg(e || 'Approval failed.')
    await load(); setBusy(null)
  }
  async function reject(id: string) {
    setBusy(id); setMsg('')
    await supabase!.rpc('admin_reject_withdrawal', { p_id: id })
    await load(); setBusy(null)
  }

  if (rows === null) return <Loading />
  if (rows.length === 0) return <div className="rounded-[16px] py-12 text-center bg-[#15161C] border border-white/6 text-[#767884] text-[14px] font-semibold">No withdrawals yet.</div>

  return (
    <>
      {msg && <div className="rounded-[12px] p-3 mb-3 bg-[rgba(255,107,90,.08)] border border-[rgba(255,107,90,.25)] text-[var(--coral)] text-[13px] font-semibold">{msg}</div>}
      <div className="rounded-[16px] border border-white/6 bg-[#15161C] overflow-x-auto no-scrollbar">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="text-[#767884] text-[11px] font-bold uppercase tracking-[.05em]">
              {['email', 'amount', 'source', 'address', 'status', 'date', 'action'].map((h) => (
                <th key={h} className="text-left font-bold px-3 py-3 whitespace-nowrap border-b border-white/6">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const id = String(r.id)
              const pending = r.status === 'pending_review'
              return (
                <tr key={id} className="border-b border-white/4">
                  <td className="px-3 py-2.5 text-[#D9DAE2]">{String(r.email ?? '—')}</td>
                  <td className="px-3 py-2.5"><span className="font-head font-bold text-white">{usd(Number(r.amount ?? 0))}</span></td>
                  <td className="px-3 py-2.5 text-[#9A9CA8]">{String(r.source ?? '')}</td>
                  <td className="px-3 py-2.5 font-mono text-[#9A9CA8]">{String(r.address ?? '').slice(0, 10)}…</td>
                  <td className="px-3 py-2.5"><span className={pending ? 'text-[#FFB05A] font-bold' : r.status === 'sent' ? 'text-[var(--green)] font-bold' : 'text-[#9A9CA8]'}>{String(r.status)}</span></td>
                  <td className="px-3 py-2.5 text-[#9A9CA8] whitespace-nowrap">{r.created_at ? timeAgo(String(r.created_at)) : ''}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {pending ? (
                      <span className="flex gap-1.5">
                        <button disabled={busy === id} onClick={() => approve(id)} className="px-3 py-1.5 rounded-[9px] bg-[var(--accent)] text-[var(--accent-ink)] text-[12px] font-extrabold disabled:opacity-50">Approve</button>
                        <button disabled={busy === id} onClick={() => reject(id)} className="px-3 py-1.5 rounded-[9px] bg-white/8 text-white text-[12px] font-extrabold disabled:opacity-50">Reject</button>
                      </span>
                    ) : typeof r.signature === 'string' ? (
                      <a href={`https://solscan.io/tx/${r.signature}`} target="_blank" rel="noreferrer" className="text-[var(--accent)] font-mono text-[12px]">tx ↗</a>
                    ) : (
                      <span className="text-[#5E606C]">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ---- Appeals: rejected proofs the earner is contesting ----
function AdminAppeals() {
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase!.rpc('admin_appeals')
    setRows(Array.isArray(data) ? (data as Record<string, unknown>[]) : [])
  }, [])
  useEffect(() => { load() }, [load])

  async function resolve(id: string, approve: boolean) {
    setBusy(id)
    await supabase!.rpc('admin_resolve_appeal', { p_completion: id, p_approve: approve })
    await load()
    setBusy(null)
  }

  if (rows === null) return <Loading />
  if (rows.length === 0) {
    return <div className="rounded-[16px] py-12 text-center bg-[#15161C] border border-white/6 text-[#767884] text-[14px] font-semibold">No appeals to review.</div>
  }
  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => (
        <div key={String(r.id)} className="rounded-[16px] border border-white/6 bg-[#15161C] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-white text-[15px] font-bold">{String(r.title ?? 'Task')}</div>
              <div className="text-[#9A9CA8] text-[12.5px] font-semibold truncate">{String(r.email ?? r.earner ?? '')} · {usd(Number(r.reward ?? 0))}</div>
            </div>
            {typeof r.proof_url === 'string' && r.proof_url.startsWith('http') && (
              <a href={r.proof_url} target="_blank" rel="noreferrer" className="text-[var(--accent)] text-[12px] font-bold flex-none">View proof ↗</a>
            )}
          </div>
          <div className="mt-3 rounded-[12px] bg-white/[.03] border border-white/6 p-3 text-[#D9DAE2] text-[13.5px] font-medium leading-[1.5]">
            {String(r.appeal_note ?? '—')}
          </div>
          <div className="flex gap-2 mt-3">
            <button disabled={busy === r.id} onClick={() => resolve(String(r.id), true)} className="flex-1 font-head font-extrabold text-[13px] bg-[var(--accent)] text-[var(--accent-ink)] py-2.5 rounded-[11px] disabled:opacity-50">Approve & pay</button>
            <button disabled={busy === r.id} onClick={() => resolve(String(r.id), false)} className="flex-1 font-head font-extrabold text-[13px] bg-white/6 text-white py-2.5 rounded-[11px] disabled:opacity-50">Deny</button>
          </div>
        </div>
      ))}
    </div>
  )
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
    setTickets(Array.isArray(data) ? (data as Ticket[]) : [])
  }, [])
  const loadThread = useCallback(async (id: string) => {
    const { data } = await supabase!.rpc('admin_ticket_messages', { p_ticket: id })
    setMsgs(Array.isArray(data) ? (data as TMsg[]) : [])
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
