import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { supabase } from '../../lib/supabase'
import { usd, timeAgo, earnerNet } from '../../lib/format'
import type { CompletionStatus } from '../../lib/types'
import { Page } from '../../components/Page'
import { Check, Clock, X, Zoom } from '../../components/icons'

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
    const [appealNote, setAppealNote] = useState('')
    const [sent, setSent] = useState(false)
    const [appealErr, setAppealErr] = useState('')

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
    const proofImages: string[] = (completion.proof_urls && completion.proof_urls.length > 0)
        ? completion.proof_urls
        : completion.proof_url?.startsWith('http') ? [completion.proof_url] : []
    const appealed = sent || completion.appeal_status === 'pending'
    const denied = completion.appeal_status === 'denied'

    async function submitAppeal() {
        if (!appealNote.trim()) { setAppealErr('Tell us why this should be approved.'); return }
        setAppealErr('')
        const { error } = await supabase!.rpc('appeal_completion', { p_completion: completion!.id, p_note: appealNote.trim() })
        if (error) { setAppealErr(error.message); return }
        setSent(true)
    }

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
                {completion.status === 'rejected' && completion.reject_reason && (
                    <div className="mt-2 text-[13px] font-semibold leading-[1.5]"><span className="opacity-70">Reason: </span>{completion.reject_reason}</div>
                )}
            </div>

            {/* task info */}
            <div className="rounded-[16px] p-4 bg-[#15161C] border border-white/6 mb-4">
                <div className="text-[#8B8D99] text-[11px] font-bold uppercase tracking-[.07em] mb-2">Task</div>
                <div className="text-white text-[16px] font-bold font-head">{tk?.title ?? 'Task'}</div>
                {tk?.subtitle && <div className="text-[#767884] text-[13px] font-semibold mt-1">{tk.subtitle}</div>}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                    <span className="text-[#767884] text-[12px] font-semibold">Reward</span>
                    <span className="font-head text-[18px] font-extrabold text-[var(--accent)]">{usd(earnerNet(completion.reward))}</span>
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
                <div className="rounded-[18px] border border-white/8 bg-[#15161C] p-4 mb-4">
                    <div className="text-[#8B8D99] text-[11px] font-bold uppercase tracking-[.07em] mb-3">Proof screenshot{proofImages.length > 1 ? 's' : ''}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {proofImages.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noreferrer" className="block rounded-[12px] overflow-hidden border border-white/8">
                                <img src={url} alt={`proof ${i + 1}`} className="w-full max-h-[280px] object-contain bg-black/40" />
                            </a>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="rounded-[18px] border border-white/8 bg-[#15161C] p-8 mb-4 flex flex-col items-center justify-center gap-2 text-[#767884] text-[13px] font-semibold">
                    <Zoom width={24} height={24} />
                    No screenshot provided
                </div>
            )}

            {/* redo after rejection */}
            {completion.status === 'rejected' && (
                <button onClick={() => nav(`/task/${completion.task_id}/proof`)} className="w-full font-head font-extrabold text-[15px] bg-[var(--accent)] text-[var(--accent-ink)] py-[14px] rounded-[14px] mb-3" style={{ boxShadow: 'var(--glow)' }}>
                    Redo the task
                </button>
            )}

            {/* appeal (rejected only) */}
            {completion.status === 'rejected' && (
                <div className="rounded-[16px] p-4 bg-[#15161C] border border-white/6 mb-4">
                    <div className="text-[#8B8D99] text-[11px] font-bold uppercase tracking-[.07em] mb-2">Appeal this decision</div>
                    {appealed ? (
                        <div className="text-[var(--green)] text-[13.5px] font-semibold leading-[1.5]">Appeal submitted. Our team will review it and get back to you.</div>
                    ) : denied ? (
                        <div className="text-[#9A9CA8] text-[13.5px] font-semibold leading-[1.5]">Your appeal was reviewed and the rejection stands.</div>
                    ) : (
                        <>
                            <div className="text-[#A9ABB6] text-[13px] font-semibold mb-3 leading-[1.5]">If you think this was rejected by mistake, tell us why and our team will review it.</div>
                            <textarea value={appealNote} onChange={(e) => setAppealNote(e.target.value)} rows={3} placeholder="Explain why your proof meets the task requirements…" className="w-full bg-white/4 border border-white/8 rounded-[12px] px-4 py-3 text-white text-[14px] font-medium placeholder:text-[#6E6F7A] outline-none resize-none" />
                            {appealErr && <div className="text-[var(--coral)] text-[12.5px] font-semibold mt-2">{appealErr}</div>}
                            <button onClick={submitAppeal} className="w-full mt-3 font-head font-extrabold text-[14px] bg-[var(--accent)] text-[var(--accent-ink)] py-3 rounded-[12px]">Submit appeal</button>
                        </>
                    )}
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