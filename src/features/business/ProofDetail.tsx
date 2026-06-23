import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { usd } from '../../lib/format'
import { DEMO_EARNER_NAMES } from '../../data/seed'
import { Page } from '../../components/Page'
import { Avatar } from '../../components/ui'
import { Check, X, Zoom } from '../../components/icons'

export function ProofDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { pendingProofs, reviewProof, task } = useStore()

  const queue = pendingProofs()
  const idx = queue.findIndex((p) => p.completion.id === id)
  const item = idx >= 0 ? queue[idx] : undefined

  if (!item) {
    return (
      <Page title="Proof" back narrow>
        <div className="rounded-[var(--r)] border border-white/6 bg-[#15161C] py-14 text-center">
          <Check width={28} height={28} className="text-[var(--green)] mx-auto" />
          <div className="text-white text-[15px] font-bold mt-3">Nothing left to review</div>
          <button onClick={() => nav('/business/review')} className="mt-5 font-head font-extrabold text-[14px] bg-white/6 text-white px-5 py-3 rounded-[13px]">Back to queue</button>
        </div>
      </Page>
    )
  }

  const { completion } = item
  const tk = task(completion.task_id)
  const name = DEMO_EARNER_NAMES[completion.earner_id] ?? 'Earner'

  function decide(approve: boolean) {
    reviewProof(completion.id, approve)
    // go to the next pending proof, or back to the queue
    const rest = pendingProofs().filter((p) => p.completion.id !== completion.id)
    if (rest.length > 0) nav(`/business/review/${rest[0].completion.id}`, { replace: true })
    else nav('/business/review', { replace: true })
  }

  return (
    <Page title={`Proof · ${idx + 1} of ${queue.length}`} back narrow actions={<button onClick={() => nav('/business/review')} className="text-[#9A9CA8] text-[13px] font-bold">Skip</button>}>
      {/* earner */}
      <div className="flex items-center gap-3 rounded-[16px] p-4 bg-[#15161C] border border-white/6 mb-4">
        <Avatar name={name} size={44} gradient="linear-gradient(135deg,#5B8DEF,#8B6CFF)" />
        <div className="flex-1">
          <span className="text-white text-[15px] font-bold">{name}</span>
          <div className="text-[#767884] text-[12px] font-semibold mt-[1px]">{tk?.title ?? 'Manual proof'}</div>
        </div>
        <div className="text-right">
          <div className="text-[#767884] text-[11px] font-semibold uppercase">Reward</div>
          <div className="font-head text-[16px] font-extrabold text-[var(--accent)]">{usd(completion.reward)}</div>
        </div>
      </div>

      {/* submitted username / handle */}
      {completion.proof_note && (
        <div className="rounded-[14px] p-4 bg-[#15161C] border border-white/6 mb-4">
          <div className="text-[#8B8D99] text-[11px] font-bold uppercase tracking-[.07em]">Submitted username / handle</div>
          <div className="text-white text-[16px] font-bold font-head mt-1 break-all">{completion.proof_note}</div>
        </div>
      )}

      {/* proof screenshot (tap to open full size) */}
      {completion.proof_url?.startsWith('http') ? (
        <a href={completion.proof_url} target="_blank" rel="noreferrer" className="block rounded-[18px] overflow-hidden border border-white/8 mb-6">
          <img src={completion.proof_url} alt="proof screenshot" className="w-full max-h-[420px] object-contain bg-black/40" />
        </a>
      ) : (
        <div className="rounded-[18px] border border-white/8 bg-[#15161C] h-[180px] flex items-center justify-center gap-2 mb-6 text-[#767884] text-[13px] font-semibold">
          <Zoom width={22} height={22} /> No screenshot provided
        </div>
      )}

      <div className="text-[#9A9CA8] text-[12.5px] font-semibold mb-6 leading-[1.5]">
        Check the screenshot shows {tk?.title ?? 'the action'} completed by this username, then approve or reject.
      </div>

      <div className="flex gap-3">
        <button onClick={() => decide(false)} className="flex-1 font-head font-extrabold text-[15px] bg-[rgba(255,107,90,.12)] text-[var(--coral)] border border-[rgba(255,107,90,.3)] py-[15px] rounded-[15px] flex items-center justify-center gap-2">
          <X width={16} height={16} /> Reject
        </button>
        <button onClick={() => decide(true)} className="flex-[1.4] font-head font-extrabold text-[15px] bg-[var(--accent)] text-[var(--accent-ink)] py-[15px] rounded-[15px] flex items-center justify-center gap-2" style={{ boxShadow: 'var(--glow)' }}>
          <Check width={16} height={16} /> Approve &amp; pay {usd(completion.reward)}
        </button>
      </div>
    </Page>
  )
}
