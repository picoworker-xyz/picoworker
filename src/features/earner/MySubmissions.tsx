import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { usd, timeAgo } from '../../lib/format'
import type { CompletionStatus } from '../../lib/types'
import { Page } from '../../components/Page'
import { ArrowRight, Check, Clock, X } from '../../components/icons'

const STATUS_TABS: { label: string; status: CompletionStatus | 'all' }[] = [
    { label: 'All', status: 'all' },
    { label: 'Pending', status: 'pending_proof' },
    { label: 'Approved', status: 'approved' },
    { label: 'Rejected', status: 'rejected' },
]

const STATUS_CONFIG: Record<CompletionStatus, { icon: typeof Check; color: string; bgColor: string; label: string }> = {
    verified: { icon: Check, color: 'text-[var(--green)]', bgColor: 'bg-[rgba(68,209,122,.14)]', label: 'Verified' },
    pending_proof: { icon: Clock, color: 'text-[#FFB05A]', bgColor: 'bg-[rgba(255,176,90,.14)]', label: 'Pending' },
    approved: { icon: Check, color: 'text-[var(--green)]', bgColor: 'bg-[rgba(68,209,122,.14)]', label: 'Approved' },
    rejected: { icon: X, color: 'text-[var(--coral)]', bgColor: 'bg-[rgba(255,107,90,.14)]', label: 'Rejected' },
}

export function MySubmissions() {
    const nav = useNavigate()
    const { myCompletions, task } = useStore()
    const [tab, setTab] = useState<CompletionStatus | 'all'>('all')

    const completions = myCompletions()
    const filtered = tab === 'all' ? completions : completions.filter((c) => c.status === tab)

    return (
        <Page title="My Submissions" subtitle="Track your task completion status and rewards.">
            {/* tabs */}
            <div className="inline-flex bg-black/30 rounded-full p-1 mb-5">
                {STATUS_TABS.map((t) => (
                    <button
                        key={t.label}
                        onClick={() => setTab(t.status)}
                        className={`px-4 py-2 rounded-full text-[13px] font-head capitalize ${tab === t.status ? 'bg-[var(--accent)] text-[var(--accent-ink)] font-extrabold' : 'text-[#9A9CA8] font-bold'
                            }`}
                    >
                        {t.label}
                        {t.status !== 'all' && ` · ${completions.filter((c) => c.status === t.status).length}`}
                    </button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <div className="rounded-[var(--r)] border border-white/6 bg-[#15161C] py-14 text-center">
                    <div className="text-white text-[15px] font-bold">No submissions yet</div>
                    <div className="text-[#767884] text-[13px] font-semibold mt-1">
                        {tab === 'all' ? 'Complete tasks to see your submissions here.' : `No ${tab} submissions.`}
                    </div>
                    {tab === 'all' && (
                        <button onClick={() => nav('/')} className="mt-4 font-head font-extrabold text-[14px] bg-[var(--accent)] text-[var(--accent-ink)] px-5 py-3 rounded-[12px]">
                            Browse tasks
                        </button>
                    )}
                </div>
            ) : (
                <div className="rounded-[var(--r)] border border-white/6 bg-[#15161C] overflow-hidden">
                    {filtered.map((c, i) => {
                        const tk = task(c.task_id)
                        const config = STATUS_CONFIG[c.status]
                        const Icon = config.icon
                        return (
                            <button
                                key={c.id}
                                onClick={() => nav(`/submissions/${c.id}`)}
                                className={`w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/[.04] ${i === 0 ? '' : 'border-t border-white/5'}`}
                            >
                                <div className={`w-[38px] h-[38px] flex-none rounded-[11px] flex items-center justify-center ${config.bgColor}`}>
                                    <Icon width={17} height={17} className={config.color} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-white text-[14px] font-bold truncate">{tk?.title ?? 'Task'}</div>
                                    <div className="text-[#767884] text-[11.5px] font-semibold mt-[1px]">{timeAgo(c.created_at)}</div>
                                </div>
                                <span className={`w-fit text-[10px] font-extrabold px-2 py-1 rounded-full uppercase ${config.bgColor} ${config.color}`}>
                                    {config.label}
                                </span>
                                <span className="font-head text-[14px] font-extrabold text-[var(--accent)]">{usd(c.reward, { sign: true })}</span>
                                <ArrowRight width={16} height={16} className="text-[#5E606C]" />
                            </button>
                        )
                    })}
                </div>
            )}
        </Page>
    )
}