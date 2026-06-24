import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { usd, timeAgo } from '../../lib/format'
import { DEMO_EARNER_NAMES } from '../../data/seed'
import type { CompletionStatus } from '../../lib/types'
import { Page } from '../../components/Page'
import { Avatar } from '../../components/ui'
import { ArrowRight, Check, Clock, X } from '../../components/icons'

const STATUS_CONFIG: Record<CompletionStatus, { icon: typeof Check; color: string; bgColor: string; label: string }> = {
  verified: { icon: Check, color: 'text-[var(--green)]', bgColor: 'bg-[rgba(68,209,122,.14)]', label: 'Verified' },
  pending_proof: { icon: Clock, color: 'text-[#FFB05A]', bgColor: 'bg-[rgba(255,176,90,.14)]', label: 'Pending' },
  approved: { icon: Check, color: 'text-[var(--green)]', bgColor: 'bg-[rgba(68,209,122,.14)]', label: 'Approved' },
  rejected: { icon: X, color: 'text-[var(--coral)]', bgColor: 'bg-[rgba(255,107,90,.14)]', label: 'Rejected' },
}

export function ReviewQueue() {
  const nav = useNavigate()
  const { pendingProofs, allProofs, reviewProof } = useStore()
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [, force] = useState(0)

  const pending = pendingProofs()
  const all = allProofs()
  const filtered = tab === 'pending' ? pending : all.filter((p) => p.completion.status === tab)

  function approveAll() {
    pending.forEach((p) => reviewProof(p.completion.id, true))
    force((n) => n + 1)
  }

  const payTotal = pending.reduce((s, p) => s + p.completion.reward, 0)

  return (
    <Page title="Review proofs" subtitle="Approve manual submissions — you only pay for verified work." back>
      <div className="max-w-[760px]">
        {/* tabs */}
        <div className="inline-flex bg-black/30 rounded-full p-1 mb-5">
          {(['pending', 'approved', 'rejected'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-full text-[13px] font-head capitalize ${tab === t ? 'bg-[var(--accent)] text-[var(--accent-ink)] font-extrabold' : 'text-[#9A9CA8] font-bold'}`}>
              {t}{t === 'pending' && pending.length > 0 ? ` · ${pending.length}` : ''}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-[var(--r)] border border-white/6 bg-[#15161C] py-14 text-center">
            {tab === 'pending' && (
              <>
                <Check width={28} height={28} className="text-[var(--green)] mx-auto" />
                <div className="text-white text-[15px] font-bold mt-3">All caught up</div>
                <div className="text-[#767884] text-[13px] font-semibold mt-1">No proofs waiting on review.</div>
              </>
            )}
            {tab !== 'pending' && (
              <>
                <div className="text-white text-[15px] font-bold">No {tab} proofs</div>
                <div className="text-[#767884] text-[13px] font-semibold mt-1">No {tab} submissions found.</div>
              </>
            )}
          </div>
        ) : (
          <>
            {tab === 'pending' && (
              <div className="flex items-center gap-2 mb-3 text-[#767884] text-[12.5px] font-semibold">
                Unreviewed proofs auto-approve in 24h so earners aren't left waiting.
              </div>
            )}
            <div className="rounded-[var(--r)] border border-white/6 bg-[#15161C] overflow-hidden">
              {filtered.map((p, i) => {
                const name = DEMO_EARNER_NAMES[p.completion.earner_id] ?? 'Earner'
                const config = STATUS_CONFIG[p.completion.status]
                const Icon = config.icon
                return (
                  <button key={p.completion.id} onClick={() => nav(`/business/review/${p.completion.id}`)} className={`w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/[.04] ${i === 0 ? '' : 'border-t border-white/5'}`}>
                    <Avatar name={name} size={40} gradient="linear-gradient(135deg,#5B8DEF,#8B6CFF)" />
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-[14px] font-bold truncate">{name}</div>
                      <div className="text-[#767884] text-[12px] font-semibold mt-[1px] truncate">{p.task.title} · {timeAgo(p.completion.created_at)}</div>
                    </div>
                    <div className={`w-[28px] h-[28px] flex-none rounded-[8px] flex items-center justify-center ${config.bgColor}`}>
                      <Icon width={14} height={14} className={config.color} />
                    </div>
                    <span className="font-head text-[14px] font-extrabold text-[var(--accent)]">{usd(p.completion.reward, { sign: true })}</span>
                    <ArrowRight width={16} height={16} className="text-[#5E606C]" />
                  </button>
                )
              })}
            </div>

            {tab === 'pending' && (
              <button onClick={approveAll} className="w-full mt-5 font-head font-extrabold text-[16px] bg-[var(--accent)] text-[var(--accent-ink)] py-[15px] rounded-[15px]" style={{ boxShadow: 'var(--glow)' }}>
                Approve all · pay {usd(payTotal)}
              </button>
            )}
          </>
        )}
      </div>
    </Page>
  )
}
