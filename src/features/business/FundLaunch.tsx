import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { usd } from '../../lib/format'
import { Page, CenteredPage } from '../../components/Page'
import { Check, Shield } from '../../components/icons'

export function FundLaunch() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const taskId = params.get('task') ?? ''
  const { task, wallet, fundAndLaunch } = useStore()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [launched, setLaunched] = useState(false)

  const t = task(taskId)
  if (!t || !wallet) {
    return <Page title="Review & fund" back><div className="text-center text-[#767884] text-[14px] font-semibold py-16">Task not found.</div></Page>
  }

  const rewards = +(t.reward * t.goal_count).toFixed(2)
  const fee = +(rewards * 0.1).toFixed(2)
  const total = +(rewards + fee).toFixed(2)
  const enough = total <= wallet.business_escrow

  function launch() {
    setBusy(true)
    setErr('')
    const res = fundAndLaunch(t!.id)
    setBusy(false)
    if (res.ok) setLaunched(true)
    else setErr(res.reason ?? 'Could not launch.')
  }

  if (launched) {
    return (
      <CenteredPage>
        <div className="rounded-[24px] bg-[#15161C] border border-white/7 p-8 text-center">
          <div className="flex flex-col items-center" style={{ animation: 'pico-pop .4s ease both' }}>
            <div className="w-[80px] h-[80px] rounded-full bg-[var(--accent)] flex items-center justify-center" style={{ boxShadow: 'var(--glow)' }}>
              <Check width={38} height={38} className="text-[var(--accent-ink)]" />
            </div>
            <div className="font-head font-bold text-[24px] text-white mt-6">Campaign is live!</div>
            <div className="text-[#A9ABB6] text-[14px] font-semibold mt-2 leading-[1.5]">"{t.title}" is now visible to thousands of earners.</div>
          </div>
          <div className="flex flex-col gap-3 mt-8">
            <button onClick={() => nav(`/business/campaign/${t.id}`, { replace: true })} className="w-full font-head font-extrabold text-[16px] bg-[var(--accent)] text-[var(--accent-ink)] py-[15px] rounded-[15px]" style={{ boxShadow: 'var(--glow)' }}>View campaign</button>
            <button onClick={() => nav('/business', { replace: true })} className="text-[#9A9CA8] text-[14px] font-bold">Back to dashboard</button>
          </div>
        </div>
      </CenteredPage>
    )
  }

  return (
    <Page title="Review & fund" subtitle="Step 2 of 2 · Confirm and launch" back narrow>
      <div className="rounded-[var(--r)] p-5 bg-[#15161C] border border-white/6 mb-4">
        <div className="text-white text-[17px] font-bold">{t.title}</div>
        <div className="text-[#8A8C98] text-[13px] font-semibold mt-1">
          {t.goal_count} {t.type === 'follow_x' ? 'follows' : 'completions'} · {usd(t.reward)} each · {t.auto_verify ? 'auto-verified' : 'manual review'}
        </div>
      </div>

      <div className="text-white text-[15px] font-extrabold font-head mb-3">Cost breakdown</div>
      <div className="rounded-[16px] p-4 bg-white/4 border border-white/7 flex flex-col gap-[10px] mb-4">
        <Line label="Rewards to earners" value={usd(rewards)} />
        <Line label="Platform fee (10%)" value={usd(fee)} />
        <div className="h-px bg-white/8 my-1" />
        <Line label="Total to fund" value={usd(total)} strong />
      </div>

      <Label>Pay from</Label>
      <div className="flex items-center justify-between rounded-[14px] p-4 bg-[#15161C] border border-white/8 mb-4">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-[var(--usdc)] flex items-center justify-center text-white text-[14px] font-extrabold">$</span>
          <div>
            <div className="text-white text-[14px] font-bold">USDC balance</div>
            <div className="text-[#767884] text-[12px] font-semibold">{usd(wallet.business_escrow)} available</div>
          </div>
        </div>
        {enough ? <Check width={20} height={20} className="text-[var(--green)]" /> : <button onClick={() => nav('/business/add-funds')} className="text-[var(--accent)] text-[13px] font-extrabold">Add funds</button>}
      </div>

      <div className="flex items-center gap-3 px-4 py-4 rounded-[14px] bg-white/4 border border-white/7 mb-2">
        <Shield width={18} height={18} className="text-[var(--green)] flex-none" />
        <span className="text-[#B6B8C2] text-[12.5px] font-semibold">Funds sit in escrow. You only pay per verified completion — pause and refund unused budget anytime.</span>
      </div>
      {err && <div className="text-[var(--coral)] text-[13px] font-semibold text-center mt-3">{err}</div>}

      <button onClick={launch} disabled={busy || !enough} className="w-full mt-6 font-head font-extrabold text-[16px] bg-[var(--accent)] text-[var(--accent-ink)] py-[16px] rounded-[16px] disabled:opacity-50" style={{ boxShadow: 'var(--glow)' }}>
        {busy ? 'Launching…' : `Launch campaign · ${usd(total)}`}
      </button>
      <div className="text-center text-[#767884] text-[13px] font-semibold mt-3">Goes live instantly to thousands of earners</div>
    </Page>
  )
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[#8B8D99] text-[12px] font-bold uppercase tracking-[.07em] mb-2">{children}</div>
)
function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[#9A9CA8] text-[13px] font-semibold">{label}</span>
      <span className={`font-head ${strong ? 'text-white text-[16px] font-extrabold' : 'text-[#D9DAE2] text-[14px] font-bold'}`}>{value}</span>
    </div>
  )
}
