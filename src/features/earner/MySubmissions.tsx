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
            {/* tabs — full width so they always fit on mobile; count shows as a small badge only when > 0 */}
            <div className="flex w-full bg-[var(--fill-2)] rounded-full p-1 mb-5">
                {STATUS_TABS.map((t) => {
                    const active = tab === t.status
                    const count = t.status === 'all' ? 0 : completions.filter((c) => c.status === t.status).length
                    return (
                        <button
                            key={t.label}
                            onClick={() => setTab(t.status)}
                            className={`flex-1 min-w-0 flex items-center justify-center gap-1 px-1 py-[7px] rounded-full text-[12.5px] font-head ${active ? 'bg-[var(--accent)] text-[var(--accent-ink)] font-extrabold' : 'text-[var(--ink-3)] font-bold'
                                }`}
                        >
                            <span className="truncate">{t.label}</span>
                            {count > 0 && (
                                <span className={`text-[10px] font-extrabold leading-none px-1.5 py-[3px] rounded-full flex-none ${active ? 'bg-black/15' : 'bg-[var(--fill-2)] text-[var(--ink-2)]'}`}>{count}</span>
                            )}
                        </button>
                    )
                })}
            </div>

            {filtered.length === 0 ? (
                <div className="rounded-[var(--r)] border border-[var(--line)] bg-[var(--card)] py-14 text-center">
                    <div className="text-[var(--ink)] text-[15px] font-bold">No submissions yet</div>
                    <div className="text-[var(--ink-4)] text-[13px] font-semibold mt-1">
                        {tab === 'all' ? 'Complete tasks to see your submissions here.' : `No ${tab} submissions.`}
                    </div>
                    {tab === 'all' && (
                        <button onClick={() => nav('/')} className="mt-4 font-head font-extrabold text-[14px] bg-[var(--accent)] text-[var(--accent-ink)] px-5 py-3 rounded-[12px]">
                            Browse tasks
                        </button>
                    )}
                </div>
            ) : (
                <div className="rounded-[var(--r)] border border-[var(--line)] bg-[var(--card)] overflow-hidden">
                    {filtered.map((c, i) => {
                        const tk = task(c.task_id)
                        const config = STATUS_CONFIG[c.status]
                        const Icon = config.icon
                        return (
                            <button
                                key={c.id}
                                onClick={() => nav(`/submissions/${c.id}`)}
                                className={`w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[var(--fill)] ${i === 0 ? '' : 'border-t border-[var(--line)]'}`}
                            >
                                <div className={`w-[38px] h-[38px] flex-none rounded-[11px] flex items-center justify-center ${config.bgColor}`}>
                                    <Icon width={17} height={17} className={config.color} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[var(--ink)] text-[14px] font-bold truncate">{tk?.title ?? 'Task'}</div>
                                    <div className="text-[var(--ink-4)] text-[11.5px] font-semibold mt-[1px]">{timeAgo(c.created_at)}</div>
                                </div>
                                <span className={`w-fit text-[10px] font-extrabold px-2 py-1 rounded-full uppercase ${config.bgColor} ${config.color}`}>
                                    {config.label}
                                </span>
                                <span className="font-head text-[14px] font-extrabold text-[var(--accent-strong)]">{usd(c.reward, { sign: true })}</span>
                                <ArrowRight width={16} height={16} className="text-[var(--ink-5)]" />
                            </button>
                        )
                    })}
                </div>
            )}
        </Page>
    )
}