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
    <Page title="Leaderboard" subtitle="Top earners — climb the ranks for bonus rewards.">
      <div className="max-w-[760px]">
        {rows === null ? (
          <div className="rounded-[var(--r)] border border-white/6 bg-[#15161C] py-14 text-center text-[#767884] text-[14px] font-semibold">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="rounded-[var(--r)] border border-white/6 bg-[#15161C] py-14 text-center">
            <Trophy width={28} height={28} className="text-[#5E606C] mx-auto" />
            <div className="text-white text-[15px] font-bold mt-3">No earners yet</div>
            <div className="text-[#767884] text-[13px] font-semibold mt-1">Be the first — complete a task to top the board.</div>
          </div>
        ) : (
          <div className="rounded-[var(--r)] bg-[#15161C] border border-white/6 overflow-hidden">
            {rows.map((r, i) => (
              <div key={i} className={`flex items-center gap-3 px-5 py-[14px] ${r.is_me ? 'bg-[rgba(194,249,77,.06)]' : i === 0 ? '' : 'border-t border-white/5'}`}>
                <span className={`w-7 text-center font-head text-[15px] font-extrabold ${i < 3 ? 'text-[var(--accent)]' : r.is_me ? 'text-[var(--accent)]' : 'text-[#767884]'}`}>{i + 1}</span>
                <Avatar name={r.display_name} size={34} gradient={r.is_me ? 'linear-gradient(135deg,#C2F94D,#7ec900)' : 'linear-gradient(135deg,#5B8DEF,#8B6CFF)'} />
                <div className={`flex-1 text-[14px] font-bold ${r.is_me ? 'text-[var(--accent)]' : 'text-white'}`}>
                  {r.display_name}{r.is_me ? ' · You' : ''}
                </div>
                <div className="font-head text-[14px] font-extrabold text-white">{usd(r.lifetime)}</div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center gap-3 px-4 py-4 rounded-[16px] bg-[rgba(194,249,77,.08)] border border-[rgba(194,249,77,.2)]">
          <Trophy width={20} height={20} className="text-[var(--accent)] flex-none" />
          <span className="text-[#D9DAE2] text-[13.5px] font-semibold">Top earners each week share a <span className="text-[var(--accent)] font-bold">USDC</span> bonus pool.</span>
        </div>
      </div>
    </Page>
  )
}
