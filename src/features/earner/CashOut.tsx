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
        <div className="rounded-[24px] bg-[var(--card)] border border-[var(--line)] p-8 text-center">
          <div className="flex flex-col items-center" style={{ animation: 'pico-pop .4s ease both' }}>
            <div className="w-[80px] h-[80px] rounded-full bg-[var(--accent)] flex items-center justify-center" style={{ boxShadow: 'var(--glow)' }}>
              <ArrowUp width={34} height={34} className="text-[var(--accent-ink)]" />
            </div>
            <div className="font-head font-bold text-[24px] text-[var(--ink)] mt-6">{result.review ? 'Pending approval' : 'Withdrawal sent'}</div>
            <div className="font-head font-bold text-[32px] text-[var(--accent-strong)] mt-2">{result.net.toFixed(2)} USDC</div>
            {result.review ? (
              <div className="text-[var(--ink-3)] text-[14px] font-semibold mt-2 leading-[1.5]">This is above the $5 daily limit, so our team will review and approve it. You'll be paid once approved. Your balance is already on hold.</div>
            ) : (
              <>
                <div className="text-[var(--ink-3)] text-[14px] font-semibold mt-2">Sent to your Solana address.</div>
                <a href={`https://solscan.io/tx/${result.sig}`} target="_blank" rel="noreferrer" className="text-[var(--accent-strong)] text-[13px] font-bold mt-3 inline-block">View on Solscan</a>
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
      <div className="rounded-[var(--r)] p-5 bg-[var(--card)] border border-[var(--line)] mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[var(--ink-4)] text-[12px] font-bold uppercase tracking-[.07em]">Amount to withdraw</div>
          <button onClick={() => setAmount(avail.toFixed(2))} className="text-[var(--accent-strong)] text-[12px] font-extrabold">MAX</button>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-head text-[34px] font-bold text-[var(--ink)]">$</span>
          <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" className="bg-transparent outline-none font-head text-[34px] font-bold text-[var(--ink)] w-full" />
        </div>
        <div className="text-[var(--ink-4)] text-[12px] font-semibold mt-1">{isBiz ? 'Leftover available' : 'Available'} {usd(avail)}</div>
        {isBiz && <div className="text-[var(--ink-4)] text-[11px] font-semibold mt-1">Funds committed to live campaigns are held and cannot be withdrawn.</div>}
      </div>

      {/* USDC on Solana, fixed */}
      <div className="flex items-center gap-3 rounded-[14px] p-4 bg-[var(--fill)] border border-[var(--line)] mb-4">
        <span className="w-9 h-9 rounded-full bg-[var(--usdc)] flex items-center justify-center text-[#fff] text-[14px] font-extrabold flex-none">$</span>
        <div className="flex-1">
          <div className="text-[var(--ink)] text-[14px] font-bold">USDC on Solana</div>
          <div className="text-[var(--ink-4)] text-[12px] font-semibold">Only USDC on the Solana network is supported.</div>
        </div>
      </div>

      <Label>Payout address</Label>
      {address ? (
        <div className="flex items-center justify-between gap-2 mb-5 rounded-[14px] bg-[var(--card)] border border-[var(--line-2)] px-4 py-[14px]">
          <span className="font-mono text-[13px] text-[var(--ink)] break-all">{shortAddr(address)}</span>
          <button onClick={() => nav('/payout-address')} className="text-[var(--accent-strong)] text-[13px] font-bold flex-none">Change</button>
        </div>
      ) : (
        <button onClick={() => nav('/payout-address')} className="w-full mb-5 rounded-[14px] bg-[var(--fill)] text-[var(--ink)] py-[14px] text-[14px] font-bold">
          Add a confirmed payout address
        </button>
      )}

      <div className="rounded-[16px] p-4 bg-[var(--fill)] border border-[var(--line)] flex flex-col gap-2 mb-2">
        <Line label="You send" value={`${usd(amt)} USDC`} />
        <Line label="Fee" value={usd(FEE)} />
        <div className="h-px bg-[var(--fill)] my-1" />
        <Line label="You receive" value={`${netReceived.toFixed(2)} USDC`} strong />
      </div>
      <div className="flex items-start gap-2 text-[var(--ink-4)] text-[12px] font-semibold px-1 mb-1">
        <Shield width={14} height={14} className="text-[var(--accent-strong)] flex-none mt-[1px]" />
        A fixed $0.20 fee covers creating your USDC token account (PDA) on Solana. USDC only.
      </div>
      {address && <div className="text-[var(--ink-4)] text-[12px] font-semibold px-1">To {shortAddr(address)} on Solana</div>}
      {err && <div className="text-[var(--coral)] text-[13px] font-semibold mt-3 px-1">{err}</div>}

      <button onClick={confirm} disabled={busy} className="w-full mt-6 font-head font-extrabold text-[16px] bg-[var(--accent)] text-[var(--accent-ink)] py-[16px] rounded-[16px] disabled:opacity-60" style={{ boxShadow: 'var(--glow)' }}>
        {busy ? 'Sending…' : 'Confirm withdrawal'}
      </button>
    </Page>
  )
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[var(--ink-4)] text-[12px] font-bold uppercase tracking-[.07em] mb-2">{children}</div>
)
function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--ink-3)] text-[13px] font-semibold">{label}</span>
      <span className={`font-head ${strong ? 'text-[var(--ink)] text-[15px] font-extrabold' : 'text-[var(--ink-2)] text-[14px] font-bold'}`}>{value}</span>
    </div>
  )
}
