import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { usd, shortAddr } from '../../lib/format'
import { estimateWithdrawal } from '../../lib/payments'
import { Page, CenteredPage } from '../../components/Page'
import { Check } from '../../components/icons'

const NETWORKS = ['Solana', 'Base', 'Polygon']

export function CashOut() {
  const nav = useNavigate()
  const { wallet, profile, withdraw } = useStore()
  const [amount, setAmount] = useState('10.00')
  const [asset, setAsset] = useState<'USDC' | 'USDT'>('USDC')
  const [network, setNetwork] = useState('Solana')
  const [address, setAddress] = useState(profile?.payout_wallet ?? '')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<{ net: number } | null>(null)
  const [err, setErr] = useState('')

  if (!wallet) return null
  const amt = parseFloat(amount) || 0
  const { fee, netReceived } = estimateWithdrawal(amt)

  async function confirm() {
    setErr('')
    if (amt <= 0) return setErr('Enter an amount.')
    if (amt > wallet!.earner_balance) return setErr('Amount exceeds your balance.')
    if (!address.trim()) return setErr('Enter a wallet address.')
    setBusy(true)
    try {
      const res = await withdraw({ amount: amt, asset, network, address: address.trim() })
      setDone({ net: res.netReceived })
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <CenteredPage>
        <div className="rounded-[24px] bg-[#15161C] border border-white/7 p-8 text-center">
          <div className="flex flex-col items-center" style={{ animation: 'pico-pop .4s ease both' }}>
            <div className="w-[80px] h-[80px] rounded-full bg-[var(--accent)] flex items-center justify-center" style={{ boxShadow: 'var(--glow)' }}>
              <Check width={38} height={38} className="text-[var(--accent-ink)]" />
            </div>
            <div className="font-head font-bold text-[24px] text-white mt-6">Withdrawal sent</div>
            <div className="text-[#A9ABB6] text-[14px] font-semibold mt-2 leading-[1.5]">
              {usd(done.net)} {asset} is on its way. Arrives in ~30 sec on {network}.
            </div>
          </div>
          <button onClick={() => nav('/wallet', { replace: true })} className="w-full mt-8 font-head font-extrabold text-[16px] bg-[var(--accent)] text-[var(--accent-ink)] py-[15px] rounded-[15px]" style={{ boxShadow: 'var(--glow)' }}>
            Done
          </button>
        </div>
      </CenteredPage>
    )
  }

  return (
    <Page title="Withdraw" back narrow>
      <div className="rounded-[var(--r)] p-5 bg-[#15161C] border border-white/6 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[#8B8D99] text-[12px] font-bold uppercase tracking-[.07em]">Amount to withdraw</div>
          <button onClick={() => setAmount(wallet.earner_balance.toFixed(2))} className="text-[var(--accent)] text-[12px] font-extrabold">MAX</button>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-head text-[34px] font-bold text-white">$</span>
          <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" className="bg-transparent outline-none font-head text-[34px] font-bold text-white w-full" />
        </div>
        <div className="text-[#767884] text-[12px] font-semibold mt-1">Available {usd(wallet.earner_balance)}</div>
      </div>

      <Label>Asset</Label>
      <div className="flex gap-2 mb-4">
        {(['USDC', 'USDT'] as const).map((a) => <Selectable key={a} active={asset === a} onClick={() => setAsset(a)}>{a}</Selectable>)}
      </div>

      <Label>Network</Label>
      <div className="flex flex-wrap gap-2 mb-4">
        {NETWORKS.map((n) => <Selectable key={n} active={network === n} onClick={() => setNetwork(n)}>{n}</Selectable>)}
      </div>

      <Label>Wallet address</Label>
      <div className="flex gap-2 mb-5">
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x… or paste address" className="flex-1 bg-[#15161C] border border-white/10 rounded-[14px] px-4 py-[14px] text-white text-[14px] font-semibold placeholder:text-[#6E6F7A] outline-none focus:border-[var(--accent)]/60" />
        <button onClick={() => profile?.payout_wallet && setAddress(profile.payout_wallet)} className="px-4 rounded-[14px] bg-white/6 text-white text-[13px] font-bold">Paste</button>
      </div>

      <div className="rounded-[16px] p-4 bg-white/4 border border-white/7 flex flex-col gap-2 mb-3">
        <Line label="You send" value={`${usd(amt)} ${asset}`} />
        <Line label="Network fee" value={`~${usd(fee)}`} />
        <div className="h-px bg-white/8 my-1" />
        <Line label="You receive" value={`${netReceived.toFixed(2)} ${asset}`} strong />
      </div>
      {address && <div className="text-[#767884] text-[12px] font-semibold px-1">To {shortAddr(address)} · {network}</div>}
      {err && <div className="text-[var(--coral)] text-[13px] font-semibold mt-3 px-1">{err}</div>}

      <button onClick={confirm} disabled={busy} className="w-full mt-6 font-head font-extrabold text-[16px] bg-[var(--accent)] text-[var(--accent-ink)] py-[16px] rounded-[16px] disabled:opacity-60" style={{ boxShadow: 'var(--glow)' }}>
        {busy ? 'Sending…' : 'Confirm withdrawal'}
      </button>
      <div className="text-center text-[#767884] text-[13px] font-semibold mt-3">Arrives in ~30 sec on {network}</div>
    </Page>
  )
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[#8B8D99] text-[12px] font-bold uppercase tracking-[.07em] mb-2">{children}</div>
)
function Selectable({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`px-[18px] py-[11px] rounded-[12px] text-[14px] font-head font-extrabold border ${active ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-transparent' : 'bg-[#15161C] text-[#C2C4CE] border-white/8'}`}>
      {children}
    </button>
  )
}
function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[#9A9CA8] text-[13px] font-semibold">{label}</span>
      <span className={`font-head ${strong ? 'text-white text-[15px] font-extrabold' : 'text-[#D9DAE2] text-[14px] font-bold'}`}>{value}</span>
    </div>
  )
}
