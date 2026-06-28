import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { usd, timeAgo } from '../../lib/format'
import { DEMO_EARNER_NAMES } from '../../data/seed'
import type { CompletionStatus } from '../../lib/types'
import { Page } from '../../components/Page'
import { Avatar } from '../../components/ui'
import { Check, Clock, X, Zoom } from '../../components/icons'

const STATUS_CONFIG: Record<CompletionStatus, { icon: typeof Check; color: string; bgColor: string; label: string }> = {
  verified: { icon: Check, color: 'text-[var(--green)]', bgColor: 'bg-[rgba(68,209,122,.14)]', label: 'Verified' },
  pending_proof: { icon: Clock, color: 'text-[#FFB05A]', bgColor: 'bg-[rgba(255,176,90,.14)]', label: 'Pending' },
  approved: { icon: Check, color: 'text-[var(--green)]', bgColor: 'bg-[rgba(68,209,122,.14)]', label: 'Approved' },
  rejected: { icon: X, color: 'text-[var(--coral)]', bgColor: 'bg-[rgba(255,107,90,.14)]', label: 'Rejected' },
}

export function ProofDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { pendingProofs, allProofs, reviewProof, task } = useStore()
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')

  const all = allProofs()
  const item = all.find((p) => p.completion.id === id)

  if (!item) {
    return (
      <Page title="Proof" back narrow>
        <div className="rounded-[var(--r)] border border-white/6 bg-[#15161C] py-14 text-center">
          <X width={28} height={28} className="text-[var(--coral)] mx-auto" />
          <div className="text-white text-[15px] font-bold mt-3">Proof not found</div>
          <button onClick={() => nav('/business/review')} className="mt-5 font-head font-extrabold text-[14px] bg-white/6 text-white px-5 py-3 rounded-[13px]">Back to queue</button>
        </div>
      </Page>
    )
  }

  const { completion } = item
  const tk = task(completion.task_id)
  const name = DEMO_EARNER_NAMES[completion.earner_id] ?? 'Earner'
  const isPending = completion.status === 'pending_proof'
  const config = STATUS_CONFIG[completion.status]
  const Icon = config.icon

  const proofImages: string[] = (completion.proof_urls && completion.proof_urls.length > 0)
    ? completion.proof_urls
    : completion.proof_url?.startsWith('http') ? [completion.proof_url] : []

  function decide(approve: boolean, rsn?: string) {
    reviewProof(completion.id, approve, rsn)
    // go to the next pending proof, or back to the queue
    const rest = pendingProofs().filter((p) => p.completion.id !== completion.id)
    if (rest.length > 0) nav(`/business/review/${rest[0].completion.id}`, { replace: true })
    else nav('/business/review', { replace: true })
  }

  return (
    <Page title="Proof Details" back narrow>
      {/* status banner */}
      <div className={`rounded-[16px] p-5 border ${config.bgColor} ${config.color.replace('text-', 'border-')} mb-6`}>
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-[36px] h-[36px] rounded-[10px] flex items-center justify-center ${config.bgColor}`}>
            <Icon width={20} height={20} className={config.color} />
          </div>
          <div>
            <div className="text-[15px] font-bold font-head">{config.label}</div>
            <div className="text-[11px] font-semibold opacity-80">{timeAgo(completion.created_at)}</div>
          </div>
        </div>
      </div>

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
          <div className="text-[#8B8D99] text-[11px] font-bold uppercase tracking-[.07em] mb-2">Submitted username / handle</div>
          <div className="text-white text-[16px] font-bold font-head break-all">{completion.proof_note}</div>
        </div>
      )}

      {/* proof screenshots */}
      {proofImages.length > 0 ? (
        <div className="rounded-[18px] border border-white/8 bg-[#15161C] p-4 mb-6">
          <div className="text-[#8B8D99] text-[11px] font-bold uppercase tracking-[.07em] mb-3">Proof screenshot{proofImages.length > 1 ? 's' : ''}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {proofImages.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noreferrer" className="block rounded-[12px] overflow-hidden border border-white/8">
                <img src={url} alt={`proof ${i + 1}`} className="w-full max-h-[300px] object-contain bg-black/40" />
              </a>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-[18px] border border-white/8 bg-[#15161C] p-8 mb-6 flex flex-col items-center justify-center gap-2 text-[#767884] text-[13px] font-semibold">
          <Zoom width={24} height={24} />
          No screenshot provided
        </div>
      )}

      {/* review actions (only for pending) */}
      {isPending ? (
        <>
          <div className="text-[#9A9CA8] text-[12.5px] font-semibold mb-6 leading-[1.5]">
            Check the screenshot shows {tk?.title ?? 'the action'} completed by this username, then approve or reject.
          </div>
          {rejecting ? (
            <div className="flex flex-col gap-3">
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Reason for rejection (the worker will see this), e.g. the screenshot doesn't clearly show the follow." className="w-full bg-white/4 border border-white/8 rounded-[14px] px-4 py-3 text-white text-[14px] font-semibold placeholder:text-[#6E6F7A] outline-none resize-none" />
              <div className="flex gap-3">
                <button onClick={() => setRejecting(false)} className="flex-1 font-head font-extrabold text-[15px] bg-white/6 text-white py-[15px] rounded-[15px]">Cancel</button>
                <button onClick={() => decide(false, reason.trim() || undefined)} className="flex-[1.4] font-head font-extrabold text-[15px] bg-[var(--coral)] text-white py-[15px] rounded-[15px]">Confirm rejection</button>
              </div>
            </div>
          ) : (
          <div className="flex gap-3">
            <button onClick={() => setRejecting(true)} className="flex-1 font-head font-extrabold text-[15px] bg-[rgba(255,107,90,.12)] text-[var(--coral)] border border-[rgba(255,107,90,.3)] py-[15px] rounded-[15px] flex items-center justify-center gap-2">
              <X width={16} height={16} /> Reject
            </button>
            <button onClick={() => decide(true)} className="flex-[1.4] font-head font-extrabold text-[15px] bg-[var(--accent)] text-[var(--accent-ink)] py-[15px] rounded-[15px] flex items-center justify-center gap-2" style={{ boxShadow: 'var(--glow)' }}>
              <Check width={16} height={16} /> Approve & pay {usd(completion.reward)}
            </button>
          </div>
          )}
        </>
      ) : (
        <div className="text-[#9A9CA8] text-[12.5px] font-semibold text-center py-4">
          This submission has been {completion.status === 'approved' ? 'approved' : completion.status === 'rejected' ? 'rejected' : 'verified'}.
        </div>
      )}
    </Page>
  )
}
