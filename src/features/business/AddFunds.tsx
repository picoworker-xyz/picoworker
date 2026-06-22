import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { usd } from '../../lib/format'
import { Page, CenteredPage } from '../../components/Page'
import { Check } from '../../components/icons'

const QUICK = [25, 50, 100, 250]

export function AddFunds() {
  const nav = useNavigate()
  const { wallet, profile, addFunds } = useStore()
  const [amount, setAmount] = useState('50.00')
  const [method, setMethod] = useState<'crypto' | 'card'>('crypto')
  const [copied, setCopied] = useState(false)
  const [done, setDone] = useState(false)
  if (!wallet || !profile) return null

  const amt = parseFloat(amount) || 0
  const depositAddr = profile.payout_wallet ?? '0x3F9c1bA2e7a4Fb2C0011d77a4F'

  function add() {
    if (amt <= 0) return
    addFunds(amt)
    setDone(true)
  }

  if (done) {
    return (
      <CenteredPage>
        <div className="rounded-[24px] bg-[#15161C] border border-white/7 p-8 text-center">
          <div className="flex flex-col items-center" style={{ animation: 'pico-pop .4s ease both' }}>
            <div className="w-[80px] h-[80px] rounded-full bg-[var(--accent)] flex items-center justify-center" style={{ boxShadow: 'var(--glow)' }}>
              <Check width={38} height={38} className="text-[var(--accent-ink)]" />
            </div>
            <div className="font-head font-bold text-[24px] text-white mt-6">Funds added</div>
            <div className="text-[#A9ABB6] text-[14px] font-semibold mt-2">{usd(amt)} added to your campaign escrow.</div>
            <div className="mt-4 font-head text-[20px] font-extrabold text-white">New balance {usd(wallet.business_escrow)}</div>
          </div>
          <button onClick={() => nav('/business', { replace: true })} className="w-full mt-8 font-head font-extrabold text-[16px] bg-[var(--accent)] text-[var(--accent-ink)] py-[15px] rounded-[15px]" style={{ boxShadow: 'var(--glow)' }}>Done</button>
        </div>
      </CenteredPage>
    )
  }

  return (
    <Page title="Add funds" subtitle="Top up your campaign escrow in USDC." back narrow>
      <div className="rounded-[var(--r)] p-5 bg-[#15161C] border border-white/6 mb-4 text-center">
        <div className="text-[#8B8D99] text-[12px] font-bold uppercase tracking-[.07em]">Campaign balance</div>
        <div className="font-head text-[36px] font-extrabold text-white mt-1">{usd(wallet.business_escrow)}</div>
      </div>

      <Label>Deposit amount</Label>
      <div className="rounded-[16px] p-4 bg-[#15161C] border border-white/8 mb-3 flex items-center gap-1">
        <span className="font-head text-[28px] font-bold text-white">$</span>
        <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" className="bg-transparent outline-none font-head text-[28px] font-bold text-white w-full" />
      </div>
      <div className="flex gap-2 mb-5">
        {QUICK.map((q) => (
          <button key={q} onClick={() => setAmount(q.toFixed(2))} className={`flex-1 py-[11px] rounded-[12px] text-[14px] font-extrabold font-head border ${amt === q ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-transparent' : 'bg-[#15161C] text-[#C2C4CE] border-white/8'}`}>${q}</button>
        ))}
      </div>

      <Label>How to pay</Label>
      <div className="flex flex-col gap-2 mb-5">
        <Method active={method === 'crypto'} onClick={() => setMethod('crypto')} title="Send USDC / USDT" sub="From any wallet · no fees" />
        <Method active={method === 'card'} onClick={() => setMethod('card')} title="Card / Apple Pay" sub="Buy USDC instantly · 2% fee" />
      </div>

      {method === 'crypto' && (
        <>
          <Label>Your deposit address · Polygon</Label>
          <div className="flex items-center gap-2 rounded-[14px] bg-[#15161C] border border-white/8 p-2 pl-4">
            <div className="flex-1 text-[#C2C4CE] text-[13px] font-bold truncate font-head">{depositAddr}</div>
            <button onClick={() => { navigator.clipboard?.writeText(depositAddr).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500) }} className="px-4 py-[10px] rounded-[11px] bg-white/6 text-white text-[13px] font-bold">{copied ? 'Copied!' : 'Copy'}</button>
          </div>
        </>
      )}

      <button onClick={add} disabled={amt <= 0} className="w-full mt-6 font-head font-extrabold text-[16px] bg-[var(--accent)] text-[var(--accent-ink)] py-[16px] rounded-[16px] disabled:opacity-50" style={{ boxShadow: 'var(--glow)' }}>Add {usd(amt)}</button>
    </Page>
  )
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[#8B8D99] text-[12px] font-bold uppercase tracking-[.07em] mb-2">{children}</div>
)
function Method({ active, onClick, title, sub }: { active: boolean; onClick: () => void; title: string; sub: string }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-3 p-4 rounded-[14px] border text-left ${active ? 'bg-[rgba(194,249,77,.08)] border-[rgba(194,249,77,.3)]' : 'bg-[#15161C] border-white/8 hover:bg-white/[.06]'}`}>
      <span className="w-9 h-9 rounded-full bg-[var(--usdc)] flex items-center justify-center text-white text-[14px] font-extrabold">$</span>
      <div className="flex-1">
        <div className="text-white text-[14px] font-bold">{title}</div>
        <div className="text-[#767884] text-[12px] font-semibold mt-[1px]">{sub}</div>
      </div>
      <span className={`w-5 h-5 rounded-full border-2 ${active ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-white/20'}`} />
    </button>
  )
}
