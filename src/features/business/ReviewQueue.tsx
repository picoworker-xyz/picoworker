import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { usd, timeAgo } from '../../lib/format'
import { DEMO_EARNER_NAMES } from '../../data/seed'
import { Page } from '../../components/Page'
import { Avatar } from '../../components/ui'
import { ArrowRight, Check } from '../../components/icons'

export function ReviewQueue() {
  const nav = useNavigate()
  const { pendingProofs, reviewProof, task } = useStore()
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [, force] = useState(0)

  const pending = pendingProofs()

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

        {tab !== 'pending' ? (
          <div className="rounded-[var(--r)] border border-white/6 bg-[#15161C] py-14 text-center text-[#767884] text-[14px] font-semibold">
            No {tab} proofs to show.
          </div>
        ) : pending.length === 0 ? (
          <div className="rounded-[var(--r)] border border-white/6 bg-[#15161C] py-14 text-center">
            <Check width={28} height={28} className="text-[var(--green)] mx-auto" />
            <div className="text-white text-[15px] font-bold mt-3">All caught up</div>
            <div className="text-[#767884] text-[13px] font-semibold mt-1">No proofs waiting on review.</div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3 text-[#767884] text-[12.5px] font-semibold">
              Unreviewed proofs auto-approve in 24h so earners aren't left waiting.
            </div>
            <div className="rounded-[var(--r)] border border-white/6 bg-[#15161C] overflow-hidden">
              {pending.map((p, i) => {
                const name = DEMO_EARNER_NAMES[p.completion.earner_id] ?? 'Earner'
                const tk = task(p.completion.task_id)
                return (
                  <button key={p.completion.id} onClick={() => nav(`/business/review/${p.completion.id}`)} className={`w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/[.04] ${i === 0 ? '' : 'border-t border-white/5'}`}>
                    <Avatar name={name} size={40} gradient="linear-gradient(135deg,#5B8DEF,#8B6CFF)" />
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-[14px] font-bold truncate">{name}</div>
                      <div className="text-[#767884] text-[12px] font-semibold mt-[1px] truncate">{tk?.title ?? 'Manual proof'} · {timeAgo(p.completion.created_at)}</div>
                    </div>
                    <span className="font-head text-[14px] font-extrabold text-[var(--accent)]">{usd(p.completion.reward, { sign: true })}</span>
                    <ArrowRight width={16} height={16} className="text-[#5E606C]" />
                  </button>
                )
              })}
            </div>

            <button onClick={approveAll} className="w-full mt-5 font-head font-extrabold text-[16px] bg-[var(--accent)] text-[var(--accent-ink)] py-[15px] rounded-[15px]" style={{ boxShadow: 'var(--glow)' }}>
              Approve all · pay {usd(payTotal)}
            </button>
          </>
        )}
      </div>
    </Page>
  )
}
