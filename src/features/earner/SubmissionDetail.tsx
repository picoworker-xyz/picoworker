import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { usd, timeAgo } from '../../lib/format'
import type { CompletionStatus } from '../../lib/types'
import { Page } from '../../components/Page'
import { Check, Clock, X, Zoom, ExternalLink } from '../../components/icons'

const STATUS_CONFIG: Record<CompletionStatus, { icon: typeof Check; color: string; bgColor: string; label: string; description: string }> = {
    verified: { icon: Check, color: 'text-[var(--green)]', bgColor: 'bg-[rgba(68,209,122,.14)]', label: 'Verified', description: 'Your task was automatically verified and you received your reward.' },
    pending_proof: { icon: Clock, color: 'text-[#FFB05A]', bgColor: 'bg-[rgba(255,176,90,.14)]', label: 'Pending Review', description: 'Your submission is being reviewed by the business owner. This usually takes 24 hours or less.' },
    approved: { icon: Check, color: 'text-[var(--green)]', bgColor: 'bg-[rgba(68,209,122,.14)]', label: 'Approved', description: 'Your submission was approved and you received your reward!' },
    rejected: { icon: X, color: 'text-[var(--coral)]', bgColor: 'bg-[rgba(255,107,90,.14)]', label: 'Rejected', description: 'Your submission was rejected. Please check the task requirements and try again.' },
}

export function SubmissionDetail() {
    const { id } = useParams()
    const nav = useNavigate()
    const { myCompletions, task } = useStore()

    const completion = myCompletions().find((c) => c.id === id)

    if (!completion) {
        return (
            <Page title="Submission" back narrow>
                <div className="rounded-[var(--r)] border border-white/6 bg-[#15161C] py-14 text-center">
                    <X width={28} height={28} className="text-[var(--coral)] mx-auto" />
                    <div className="text-white text-[15px] font-bold mt-3">Submission not found</div>
                    <button onClick={() => nav('/submissions')} className="mt-5 font-head font-extrabold text-[14px] bg-white/6 text-white px-5 py-3 rounded-[13px]">Back to submissions</button>
                </div>
            </Page>
        )
    }

    const tk = task(completion.task_id)
    const config = STATUS_CONFIG[completion.status]
    const Icon = config.icon

    return (
        <Page title="Submission Details" back narrow>
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
                <p className="text-[13px] font-semibold leading-[1.5] opacity-90">{config.description}</p>
            </div>

            {/* task info */}
            <div className="rounded-[16px] p-4 bg-[#15161C] border border-white/6 mb-4">
                <div className="text-[#8B8D99] text-[11px] font-bold uppercase tracking-[.07em] mb-2">Task</div>
                <div className="text-white text-[16px] font-bold font-head">{tk?.title ?? 'Task'}</div>
                {tk?.subtitle && <div className="text-[#767884] text-[13px] font-semibold mt-1">{tk.subtitle}</div>}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                    <span className="text-[#767884] text-[12px] font-semibold">Reward</span>
                    <span className="font-head text-[18px] font-extrabold text-[var(--accent)]">{usd(completion.reward)}</span>
                </div>
            </div>

            {/* submitted username / handle */}
            {completion.proof_note && (
                <div className="rounded-[14px] p-4 bg-[#15161C] border border-white/6 mb-4">
                    <div className="text-[#8B8D99] text-[11px] font-bold uppercase tracking-[.07em] mb-2">Submitted username / handle</div>
                    <div className="text-white text-[16px] font-bold font-head break-all">{completion.proof_note}</div>
                </div>
            )}

            {/* proof screenshot */}
            {completion.proof_url?.startsWith('http') ? (
                <div className="rounded-[18px] overflow-hidden border border-white/8 mb-4">
                    <div className="text-[#8B8D99] text-[11px] font-bold uppercase tracking-[.07em] p-4 pb-2">Proof screenshot</div>
                    <a href={completion.proof_url} target="_blank" rel="noreferrer" className="block relative group">
                        <img src={completion.proof_url} alt="proof screenshot" className="w-full max-h-[420px] object-contain bg-black/40" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                            <ExternalLink width={20} height={20} className="text-white" />
                            <span className="text-white text-[13px] font-bold">Open full size</span>
                        </div>
                    </a>
                </div>
            ) : (
                <div className="rounded-[18px] border border-white/8 bg-[#15161C] p-8 mb-4 flex flex-col items-center justify-center gap-2 text-[#767884] text-[13px] font-semibold">
                    <Zoom width={24} height={24} />
                    No screenshot provided
                </div>
            )}

            {/* action buttons */}
            {tk && (
                <button onClick={() => nav(`/task/${tk.id}`)} className="w-full font-head font-extrabold text-[15px] bg-white/6 text-white border border-white/10 py-[15px] rounded-[15px] mt-2">
                    View task
                </button>
            )}
        </Page>
    )
}