import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { usd, timeAgo } from '../../lib/format'
import type { LedgerEntry } from '../../lib/types'
import { Page } from '../../components/Page'
import { ArrowDown, ArrowUp } from '../../components/icons'

export function Wallet() {
  const nav = useNavigate()
  const { profile, wallet, ledgerFor } = useStore()
  const [asset, setAsset] = useState<'USDC' | 'USDT'>('USDC')
  if (!profile || !wallet) return null

  const entries = ledgerFor(profile.id)
  const weekEarned = entries
    .filter((l) => l.amount > 0 && Date.now() - +new Date(l.created_at) < 7 * 864e5)
    .reduce((s, l) => s + l.amount, 0)

  return (
    <Page title="Wallet" subtitle="Your USDC balance, earnings and activity.">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* balance + stats */}
        <aside className="lg:col-span-1 flex flex-col gap-4">
          <div
            className="relative overflow-hidden rounded-[var(--r)] p-6 text-center border border-[rgba(194,249,77,.14)]"
            style={{ background: 'linear-gradient(150deg,#191B22,#121319)', boxShadow: 'var(--glow)' }}
          >
            <div className="absolute left-1/2 -top-10 -translate-x-1/2 w-[200px] h-[120px] rounded-full bg-[var(--accent)] opacity-10 blur-2xl" />
            <div className="relative inline-flex bg-black/35 rounded-full p-1 mb-4">
              {(['USDC', 'USDT'] as const).map((a) => (
                <button key={a} onClick={() => setAsset(a)} className={`px-[18px] py-[7px] rounded-full text-[13px] font-head ${asset === a ? 'bg-[var(--accent)] text-[var(--accent-ink)] font-extrabold' : 'text-[#9A9CA8] font-bold'}`}>
                  {a}
                </button>
              ))}
            </div>
            <div className="text-[#8B8D99] text-[12px] font-bold tracking-[.08em] uppercase relative">Total balance</div>
            <div className="font-head font-bold text-[44px] text-white tracking-[-.02em] leading-[1.1] relative">{usd(wallet.earner_balance)}</div>
            <button onClick={() => nav('/wallet/withdraw')} className="relative mt-5 w-full font-head font-extrabold text-[15px] bg-[var(--accent)] text-[var(--accent-ink)] py-[13px] rounded-[14px] flex items-center justify-center gap-2">
              <ArrowDown width={16} height={16} /> Withdraw
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Stat value={usd(weekEarned)} label="This week" accent />
            <Stat value={usd(wallet.lifetime_earned)} label="Lifetime" />
            <Stat value={String(profile.tasks_done)} label="Tasks" />
          </div>
        </aside>

        {/* activity */}
        <div className="lg:col-span-2">
          <div className="rounded-[var(--r)] bg-[#15161C] border border-white/6 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/6 text-white text-[15px] font-extrabold font-head">Activity</div>
            {entries.length === 0 ? (
              <div className="text-center text-[#767884] text-[14px] font-semibold py-12">No activity yet — complete a task to get paid.</div>
            ) : (
              <div>{entries.map((e, i) => <Row key={e.id} e={e} first={i === 0} />)}</div>
            )}
          </div>
        </div>
      </div>
    </Page>
  )
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="rounded-[16px] p-4 bg-[#15161C] border border-white/6">
      <div className={`font-head text-[16px] font-extrabold ${accent ? 'text-[var(--accent)]' : 'text-white'}`}>{value}</div>
      <div className="text-[#767884] text-[11px] font-semibold mt-1">{label}</div>
    </div>
  )
}

function Row({ e, first }: { e: LedgerEntry; first: boolean }) {
  const positive = e.amount > 0
  return (
    <div className={`flex items-center gap-3 px-5 py-[14px] ${first ? '' : 'border-t border-white/5'}`}>
      <div className={`w-[38px] h-[38px] flex-none rounded-[11px] flex items-center justify-center ${positive ? 'bg-[rgba(68,209,122,.14)] text-[var(--green)]' : 'bg-white/6 text-[#C2C4CE]'}`}>
        {positive ? <ArrowUp width={17} height={17} /> : <ArrowDown width={17} height={17} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white text-[14px] font-bold truncate">{e.title}</div>
        <div className="text-[#767884] text-[11.5px] font-semibold mt-[1px]">{timeAgo(e.created_at)}</div>
      </div>
      <div className={`font-head text-[15px] font-extrabold ${positive ? 'text-[var(--green)]' : 'text-white'}`}>{usd(e.amount, { sign: true })}</div>
    </div>
  )
}
