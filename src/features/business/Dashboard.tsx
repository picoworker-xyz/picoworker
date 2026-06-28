import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { supabase } from '../../lib/supabase'
import { usd, pct } from '../../lib/format'
import type { Task } from '../../lib/types'
import { Page } from '../../components/Page'
import { Plus } from '../../components/icons'

export function Dashboard() {
  const nav = useNavigate()
  const { profile, wallet, myCampaigns, ledgerFor } = useStore()
  const [available, setAvailable] = useState<number | null>(null)

  useEffect(() => {
    supabase!.rpc('business_balance').then(({ data }) => {
      if (data) setAvailable(Number((data as { available: number }).available))
    })
  }, [])

  if (!profile || !wallet) return null

  const campaigns = myCampaigns()
  const live = campaigns.filter((c) => c.status === 'live')
  // A live task is invisible to earners when its reward is above the available balance.
  const hiddenCount = available === null ? 0 : live.filter((c) => c.reward > available).length
  const doneTotal = useMemo(() => campaigns.reduce((s, c) => s + c.done_count, 0), [campaigns])
  const spentToday = useMemo(() => {
    const today = new Date().toDateString()
    return Math.abs(
      ledgerFor(profile.id)
        .filter((l) => l.type === 'escrow_release' && new Date(l.created_at).toDateString() === today)
        .reduce((s, l) => s + l.amount, 0),
    )
  }, [profile, ledgerFor])

  return (
    <Page
      title={profile.business_name ?? profile.display_name}
      subtitle="Your campaigns and results."
      actions={
        <button onClick={() => nav('/business/create')} className="font-head font-extrabold text-[14px] bg-[var(--accent)] text-[var(--accent-ink)] px-4 py-[11px] rounded-[12px] flex items-center gap-2">
          <Plus width={15} height={15} /> New task
        </button>
      }
    >
      {/* stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <BigStat
          value={usd(wallet.business_escrow)}
          label="Escrow balance"
          accent
          action={<button onClick={() => nav('/business/add-funds')} className="text-[var(--accent)] text-[12px] font-extrabold">Add funds</button>}
        />
        <BigStat value={String(live.length)} label="Active campaigns" />
        <BigStat value={String(doneTotal)} label="Completions" />
        <BigStat value={usd(spentToday)} label="Spent today" />
      </div>

      {/* out-of-balance warning */}
      {hiddenCount > 0 && (
        <div className="rounded-[16px] p-4 bg-[rgba(255,176,90,.08)] border border-[rgba(255,176,90,.25)] mb-4 flex items-start justify-between gap-3">
          <div className="text-[#F1D9B5] text-[13px] font-semibold leading-[1.5]">
            {hiddenCount === 1 ? '1 task is' : `${hiddenCount} tasks are`} hidden from earners because your available balance ({usd(available ?? 0)}) is below the reward. Add funds to make {hiddenCount === 1 ? 'it' : 'them'} visible again.
          </div>
          <button onClick={() => nav('/business/add-funds')} className="flex-none font-head font-extrabold text-[13px] bg-[#FFB05A] text-[#1A1206] px-3.5 py-2 rounded-[11px]">Add funds</button>
        </div>
      )}

      {/* campaigns table */}
      <div className="rounded-[var(--r)] bg-[#15161C] border border-white/6 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/6 flex items-center justify-between">
          <span className="text-white text-[15px] font-extrabold font-head">Campaigns</span>
          <span className="text-[#767884] text-[13px] font-semibold">{campaigns.length} total</span>
        </div>

        {campaigns.length === 0 ? (
          <div className="text-center text-[#767884] text-[14px] font-semibold py-12">No campaigns yet. Create your first task to start growing.</div>
        ) : (
          <>
            {/* table header (desktop) */}
            <div className="hidden md:grid grid-cols-[2fr_1fr_2fr_1fr_auto] gap-4 px-5 py-3 text-[#767884] text-[11px] font-bold uppercase tracking-[.06em] border-b border-white/5">
              <span>Campaign</span>
              <span>Reward</span>
              <span>Progress</span>
              <span>Status</span>
              <span />
            </div>
            {campaigns.map((c) => <Row key={c.id} c={c} hidden={available !== null && c.status === 'live' && c.reward > available} onClick={() => nav(`/business/campaign/${c.id}`)} />)}
          </>
        )}
      </div>
    </Page>
  )
}

function Row({ c, hidden, onClick }: { c: Task; hidden?: boolean; onClick: () => void }) {
  const { pauseCampaign } = useStore()
  return (
    <div onClick={onClick} role="button" tabIndex={0} className="cursor-pointer w-full text-left px-5 py-4 border-t border-white/5 hover:bg-white/[.04] md:grid grid-cols-1 md:grid-cols-[2fr_1fr_2fr_auto_auto] md:gap-4 md:items-center flex flex-col gap-2">
      <div className="text-white text-[14px] font-bold truncate">{c.title}</div>
      <div className="text-[var(--accent)] text-[14px] font-extrabold font-head">{usd(c.reward, { sign: true })}</div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-[6px] rounded-full bg-white/8 overflow-hidden min-w-[80px]">
          <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct(c.done_count, c.goal_count)}%` }} />
        </div>
        <span className="text-[#9A9CA8] text-[12px] font-semibold whitespace-nowrap">{c.done_count}/{c.goal_count}</span>
      </div>
      <div className="flex items-center gap-2">
        <StatusTag status={c.status} />
        {hidden && <span className="w-fit text-[10px] font-extrabold px-2 py-1 rounded-full uppercase text-[#FFB05A] bg-[rgba(255,176,90,.14)]">Low balance</span>}
        {c.status !== 'complete' && (
          <button
            onClick={(e) => { e.stopPropagation(); pauseCampaign(c.id) }}
            className="text-[11px] font-extrabold font-head px-2.5 py-1 rounded-full bg-white/8 text-white hover:bg-white/12"
          >
            {c.status === 'paused' ? 'Resume' : 'Pause'}
          </button>
        )}
      </div>
      <span className="hidden md:block text-[#5E606C] text-[18px]">›</span>
    </div>
  )
}

function StatusTag({ status }: { status: Task['status'] }) {
  const map = {
    live: 'text-[var(--green)] bg-[rgba(68,209,122,.14)]',
    paused: 'text-[#FFB05A] bg-[rgba(255,176,90,.14)]',
    complete: 'text-[#9A9CA8] bg-white/8',
  }
  return <span className={`w-fit text-[10px] font-extrabold px-2 py-1 rounded-full uppercase ${map[status]}`}>{status}</span>
}

function BigStat({ value, label, accent, action }: { value: string; label: string; accent?: boolean; action?: React.ReactNode }) {
  return (
    <div className="rounded-[18px] p-5 bg-[#15161C] border border-white/6">
      <div className="flex items-center justify-between">
        <div className="text-[#8B8D99] text-[11px] font-bold uppercase tracking-[.07em]">{label}</div>
        {action}
      </div>
      <div className={`font-head text-[26px] font-extrabold mt-2 ${accent ? 'text-[var(--accent)]' : 'text-white'}`}>{value}</div>
    </div>
  )
}
