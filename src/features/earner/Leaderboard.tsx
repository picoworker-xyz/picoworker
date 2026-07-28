import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { usd } from '../../lib/format'
import { Page } from '../../components/Page'
import { Avatar } from '../../components/ui'
import { Trophy } from '../../components/icons'

type Row = { display_name: string; lifetime: number; is_me: boolean }

export function Leaderboard() {
  const [rows, setRows] = useState<Row[] | null>(null)

  useEffect(() => {
    supabase!
      .rpc('leaderboard', { p_limit: 20 })
      .then(({ data }) => setRows((data ?? []).map((r: Row) => ({ ...r, lifetime: Number(r.lifetime) }))))
  }, [])

  return (
    <Page>
      <div className="max-w-[760px] mx-auto">
        {rows === null ? (
          <div className="rounded-[var(--r)] border border-[var(--line)] bg-[var(--card)] py-14 text-center text-[var(--ink-4)] text-[14px] font-semibold">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="rounded-[var(--r)] border border-[var(--line)] bg-[var(--card)] py-14 text-center">
            <Trophy width={28} height={28} className="text-[var(--ink-5)] mx-auto" />
            <div className="text-[var(--ink)] text-[15px] font-bold mt-3">No earners yet</div>
            <div className="text-[var(--ink-4)] text-[13px] font-semibold mt-1">Be the first — complete a task to top the board.</div>
          </div>
        ) : (
          <div className="rounded-[var(--r)] bg-[var(--card)] border border-[var(--line)] overflow-hidden">
            {rows.map((r, i) => (
              <div key={i} className={`flex items-center gap-3 px-5 py-[14px] ${r.is_me ? 'bg-[rgba(46,224,110,.06)]' : i === 0 ? '' : 'border-t border-[var(--line)]'}`}>
                <span className={`w-7 flex-none text-center font-head text-[15px] font-extrabold ${i < 3 ? 'text-[var(--accent-strong)]' : r.is_me ? 'text-[var(--accent-strong)]' : 'text-[var(--ink-4)]'}`}>{i + 1}</span>
                <Avatar name={r.display_name} size={34} gradient={r.is_me ? 'linear-gradient(135deg,#3ee87e,#12924a)' : 'linear-gradient(135deg,#5B8DEF,#8B6CFF)'} />
                <div className={`flex-1 min-w-0 truncate text-[14px] font-bold ${r.is_me ? 'text-[var(--accent-strong)]' : 'text-[var(--ink)]'}`}>
                  {r.display_name}{r.is_me ? ' · You' : ''}
                </div>
                <div className="flex-none font-head text-[14px] font-extrabold text-[var(--ink)]">{usd(r.lifetime)}</div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center gap-3 px-4 py-4 rounded-[16px] bg-[rgba(46,224,110,.08)] border border-[rgba(46,224,110,.2)]">
          <Trophy width={20} height={20} className="text-[var(--accent-strong)] flex-none" />
          <span className="text-[var(--ink-2)] text-[13.5px] font-semibold">Top earners each week share a <span className="text-[var(--accent-strong)] font-bold">USDC</span> bonus pool.</span>
        </div>
      </div>
    </Page>
  )
}
