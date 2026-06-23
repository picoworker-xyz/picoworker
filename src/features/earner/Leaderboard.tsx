import { useState } from 'react'
import { useStore } from '../../lib/store'
import { usd } from '../../lib/format'
import { Page } from '../../components/Page'
import { Avatar } from '../../components/ui'
import { Trophy } from '../../components/icons'

const WEEK = [
  { name: 'Bilal', amount: 24.8 },
  { name: 'Priya', amount: 18.4 },
  { name: 'Rahul', amount: 15.1 },
  { name: 'Sana_k', amount: 13.6 },
  { name: 'Ahmed.r', amount: 11.9 },
  { name: 'Zoya', amount: 10.2 },
  { name: 'Imran', amount: 9.7 },
]

export function Leaderboard() {
  const { profile, wallet } = useStore()
  const [tab, setTab] = useState<'week' | 'all'>('week')
  if (!profile || !wallet) return null

  const you = { name: `You · ${profile.display_name}`, amount: tab === 'week' ? 8.4 : wallet.lifetime_earned, you: true }
  const rows = [...WEEK.map((r) => ({ ...r, you: false }))].sort((a, b) => b.amount - a.amount)
  const yourRank = rows.filter((r) => r.amount > you.amount).length + 1

  const [first, second, third] = rows

  return (
    <Page title="Leaderboard" subtitle="Top earners — climb the ranks for bonus rewards.">
      <div className="max-w-[760px]">
        {/* tabs */}
        <div className="inline-flex bg-black/30 rounded-full p-1 mb-6">
          {(['week', 'all'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-5 py-2 rounded-full text-[13px] font-head ${tab === t ? 'bg-[var(--accent)] text-[var(--accent-ink)] font-extrabold' : 'text-[#9A9CA8] font-bold'}`}>
              {t === 'week' ? 'This week' : 'All time'}
            </button>
          ))}
        </div>

        {/* podium */}
        <div className="grid grid-cols-3 gap-3 mb-6 items-end">
          <Podium rank={2} row={second} h={120} />
          <Podium rank={1} row={first} h={150} />
          <Podium rank={3} row={third} h={100} />
        </div>

        {/* rest */}
        <div className="rounded-[var(--r)] bg-[#15161C] border border-white/6 overflow-hidden">
          {rows.slice(3).map((r, i) => (
            <Row key={r.name} rank={i + 4} name={r.name} amount={r.amount} />
          ))}
          <div className="border-t-2 border-[var(--accent)]/30" />
          <Row rank={yourRank} name={you.name} amount={you.amount} you />
        </div>

        <div className="mt-4 flex items-center gap-3 px-4 py-4 rounded-[16px] bg-[rgba(194,249,77,.08)] border border-[rgba(194,249,77,.2)]">
          <Trophy width={20} height={20} className="text-[var(--accent)] flex-none" />
          <span className="text-[#D9DAE2] text-[13.5px] font-semibold">Top 10 this week split a <span className="text-[var(--accent)] font-bold">$50 USDC</span> bonus pool.</span>
        </div>
      </div>
    </Page>
  )
}

function Podium({ rank, row, h }: { rank: number; row: { name: string; amount: number }; h: number }) {
  const medal = rank === 1 ? '#FFD24A' : rank === 2 ? '#C0C6D0' : '#E08A4A'
  return (
    <div className="flex flex-col items-center">
      <Avatar name={row.name} size={rank === 1 ? 56 : 46} gradient="linear-gradient(135deg,#8B6CFF,#5B8DEF)" />
      <div className="text-white text-[13px] font-bold mt-2 truncate max-w-full">{row.name}</div>
      <div className="font-head text-[15px] font-extrabold text-[var(--accent)]">{usd(row.amount)}</div>
      <div className="w-full rounded-t-[14px] mt-2 flex items-start justify-center pt-2 border border-white/6 border-b-0" style={{ height: h, background: 'linear-gradient(180deg,#191B22,#121319)' }}>
        <span className="font-head text-[22px] font-extrabold" style={{ color: medal }}>#{rank}</span>
      </div>
    </div>
  )
}

function Row({ rank, name, amount, you }: { rank: number; name: string; amount: number; you?: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-5 py-[14px] ${you ? 'bg-[rgba(194,249,77,.06)]' : 'border-t border-white/5'}`}>
      <span className={`w-7 text-center font-head text-[14px] font-extrabold ${you ? 'text-[var(--accent)]' : 'text-[#767884]'}`}>{rank}</span>
      <Avatar name={name} size={34} gradient={you ? 'linear-gradient(135deg,#C2F94D,#7ec900)' : 'linear-gradient(135deg,#5B8DEF,#8B6CFF)'} />
      <div className={`flex-1 text-[14px] font-bold ${you ? 'text-[var(--accent)]' : 'text-white'}`}>{name}</div>
      <div className="font-head text-[14px] font-extrabold text-white">{usd(amount)}</div>
    </div>
  )
}
