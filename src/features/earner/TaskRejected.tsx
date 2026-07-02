import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { usd } from '../../lib/format'
import { Page } from '../../components/Page'
import { X } from '../../components/icons'

export function TaskRejected() {
  const { id } = useParams()
  const nav = useNavigate()
  const { task } = useStore()
  const t = id ? task(id) : undefined

  return (
    <Page title="Task review" back narrow>
      <div className="rounded-[var(--r)] bg-[var(--card)] border border-[var(--line)] p-6 text-center">
        <div className="w-[72px] h-[72px] rounded-full bg-[rgba(255,107,90,.14)] border border-[rgba(255,107,90,.35)] flex items-center justify-center mx-auto">
          <X width={34} height={34} className="text-[var(--coral)]" />
        </div>
        <div className="font-head font-bold text-[22px] text-[var(--ink)] mt-5">Proof not approved</div>
        <div className="text-[var(--ink-3)] text-[14px] font-semibold mt-2 leading-[1.5]">
          Don't worry — no strike, and the task is still open to retry.
        </div>
      </div>

      <div className="flex items-center justify-between rounded-[16px] p-4 bg-[var(--card)] border border-[var(--line)] mt-4">
        <div>
          <div className="text-[var(--ink)] text-[15px] font-bold">{t?.title ?? '5★ Play Store review'}</div>
          <div className="text-[var(--ink-4)] text-[12px] font-semibold mt-1">Submitted 18 min ago</div>
        </div>
        <div className="font-head text-[16px] font-extrabold text-[var(--ink-3)]">{usd(t?.reward ?? 0.2)}</div>
      </div>

      <div className="rounded-[16px] p-4 bg-[rgba(255,107,90,.06)] border border-[rgba(255,107,90,.2)] mt-4">
        <div className="text-[var(--coral)] text-[12px] font-extrabold uppercase tracking-[.06em] mb-1">Why it was rejected</div>
        <div className="text-[var(--ink-2)] text-[14px] font-semibold leading-[1.5]">
          The screenshot didn't clearly show a published 5-star rating. Make sure your review is live and all 5 stars are visible.
        </div>
      </div>

      <button onClick={() => nav(t ? `/task/${t.id}/proof` : '/')} className="w-full mt-6 font-head font-extrabold text-[16px] bg-[var(--accent)] text-[var(--accent-ink)] py-[16px] rounded-[16px]" style={{ boxShadow: 'var(--glow)' }}>
        Resubmit proof
      </button>
      <button onClick={() => nav('/support')} className="w-full mt-2 text-[var(--ink-3)] text-[14px] font-bold py-2">Appeal this decision</button>
    </Page>
  )
}
