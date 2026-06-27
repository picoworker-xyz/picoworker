import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { supabase } from '../../lib/supabase'
import { usd, shortAddr } from '../../lib/format'
import { Page, CenteredPage } from '../../components/Page'
import { ArrowUp, Shield } from '../../components/icons'

const FEE = 0.2 // fixed fee, covers creating the USDC token account (PDA) on Solana

export function CashOut() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const source = params.get('source') === 'business' ? 'business' : 'earner'
  const { wallet, profile, refresh } = useStore()
  const [amount, setAmount] = useState('10.00')
  const address = profile?.payout_wallet ?? '' // email-confirmed payout address only
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ net: number; sig?: string; review?: boolean } | null>(null)
  const [err, setErr] = useState('')

  if (!wallet) return null
  const isBiz = source === 'business'
  const avail = isBiz ? wallet.business_escrow : wallet.earner_balance
  const amt = parseFloat(amount) || 0
  const netReceived = Math.max(0, +(amt - FEE).toFixed(2))

  async function confirm() {
    setErr('')
    if (amt <= 0) return setErr('Enter an amount.')
    if (amt > avail) return setErr('Amount exceeds your balance.')
    if (amt <= FEE) return setErr('Amount must be more than the $0.20 fee.')
    if (!address) return setErr('Add a confirmed payout address first.')
    setBusy(true)
    const { data, error } = await supabase!.functions.invoke('solana-withdraw', { body: { amount: amt, address, source } })
    setBusy(false)
    if (error || data?.error) return setErr(data?.error || 'Withdrawal failed. Please try again.')
    await refresh()
    setResult({ net: data.net, sig: data.signature, review: data.review })
  }

  if (result) {
    return (
      <CenteredPage>
        <div className="rounded-[24px] bg-[#15161C] border border-white/7 p-8 text-center">
          <div className="flex flex-col items-center" style={{ animation: 'pico-pop .4s ease both' }}>
            <div className="w-[80px] h-[80px] rounded-full bg-[var(--accent)] flex items-center justify-center" style={{ boxShadow: 'var(--glow)' }}>
              <ArrowUp width={34} height={34} className="text-[var(--accent-ink)]" />
            </div>
            <div className="font-head font-bold text-[24px] text-white mt-6">{result.review ? 'Pending approval' : 'Withdrawal sent'}</div>
            <div className="font-head font-bold text-[32px] text-[var(--accent)] mt-2">{result.net.toFixed(2)} USDC</div>
            {result.review ? (
              <div className="text-[#A9ABB6] text-[14px] font-semibold mt-2 leading-[1.5]">This is above the $5 daily limit, so our team will review and approve it. You'll be paid once approved. Your balance is already on hold.</div>
            ) : (
              <>
                <div className="text-[#A9ABB6] text-[14px] font-semibold mt-2">Sent to your Solana address.</div>
                <a href={`https://solscan.io/tx/${result.sig}`} target="_blank" rel="noreferrer" className="text-[var(--accent)] text-[13px] font-bold mt-3 inline-block">View on Solscan</a>
              </>
            )}
          </div>
          <button onClick={() => nav('/wallet', { replace: true })} className="w-full mt-7 font-head font-extrabold text-[16px] bg-[var(--accent)] text-[var(--accent-ink)] py-[15px] rounded-[15px]" style={{ boxShadow: 'var(--glow)' }}>
            Done
          </button>
        </div>
      </CenteredPage>
    )
  }

  return (
    <Page title={isBiz ? 'Withdraw leftover' : 'Withdraw USDC'} back narrow>
      <div className="rounded-[var(--r)] p-5 bg-[#15161C] border border-white/6 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[#8B8D99] text-[12px] font-bold uppercase tracking-[.07em]">Amount to withdraw</div>
          <button onClick={() => setAmount(avail.toFixed(2))} className="text-[var(--accent)] text-[12px] font-extrabold">MAX</button>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-head text-[34px] font-bold text-white">$</span>
          <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" className="bg-transparent outline-none font-head text-[34px] font-bold text-white w-full" />
        </div>
        <div className="text-[#767884] text-[12px] font-semibold mt-1">{isBiz ? 'Leftover available' : 'Available'} {usd(avail)}</div>
        {isBiz && <div className="text-[#767884] text-[11px] font-semibold mt-1">Funds committed to live campaigns are held and cannot be withdrawn.</div>}
      </div>

      {/* USDC on Solana, fixed */}
      <div className="flex items-center gap-3 rounded-[14px] p-4 bg-white/4 border border-white/8 mb-4">
        <span className="w-9 h-9 rounded-full bg-[var(--usdc)] flex items-center justify-center text-white text-[14px] font-extrabold flex-none">$</span>
        <div className="flex-1">
          <div className="text-white text-[14px] font-bold">USDC on Solana</div>
          <div className="text-[#767884] text-[12px] font-semibold">Only USDC on the Solana network is supported.</div>
        </div>
      </div>

      <Label>Payout address</Label>
      {address ? (
        <div className="flex items-center justify-between gap-2 mb-5 rounded-[14px] bg-[#15161C] border border-white/10 px-4 py-[14px]">
          <span className="font-mono text-[13px] text-white break-all">{shortAddr(address)}</span>
          <button onClick={() => nav('/payout-address')} className="text-[var(--accent)] text-[13px] font-bold flex-none">Change</button>
        </div>
      ) : (
        <button onClick={() => nav('/payout-address')} className="w-full mb-5 rounded-[14px] bg-white/6 text-white py-[14px] text-[14px] font-bold">
          Add a confirmed payout address
        </button>
      )}

      <div className="rounded-[16px] p-4 bg-white/4 border border-white/7 flex flex-col gap-2 mb-2">
        <Line label="You send" value={`${usd(amt)} USDC`} />
        <Line label="Fee" value={usd(FEE)} />
        <div className="h-px bg-white/8 my-1" />
        <Line label="You receive" value={`${netReceived.toFixed(2)} USDC`} strong />
      </div>
      <div className="flex items-start gap-2 text-[#767884] text-[12px] font-semibold px-1 mb-1">
        <Shield width={14} height={14} className="text-[var(--accent)] flex-none mt-[1px]" />
        A fixed $0.20 fee covers creating your USDC token account (PDA) on Solana. USDC only.
      </div>
      {address && <div className="text-[#767884] text-[12px] font-semibold px-1">To {shortAddr(address)} on Solana</div>}
      {err && <div className="text-[var(--coral)] text-[13px] font-semibold mt-3 px-1">{err}</div>}

      <button onClick={confirm} disabled={busy} className="w-full mt-6 font-head font-extrabold text-[16px] bg-[var(--accent)] text-[var(--accent-ink)] py-[16px] rounded-[16px] disabled:opacity-60" style={{ boxShadow: 'var(--glow)' }}>
        {busy ? 'Sending…' : 'Confirm withdrawal'}
      </button>
    </Page>
  )
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[#8B8D99] text-[12px] font-bold uppercase tracking-[.07em] mb-2">{children}</div>
)
function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[#9A9CA8] text-[13px] font-semibold">{label}</span>
      <span className={`font-head ${strong ? 'text-white text-[15px] font-extrabold' : 'text-[#D9DAE2] text-[14px] font-bold'}`}>{value}</span>
    </div>
  )
}
