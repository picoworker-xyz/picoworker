import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { supabase } from '../../lib/supabase'
import { shortAddr } from '../../lib/format'
import { Page, CenteredPage } from '../../components/Page'
import { Shield, Check } from '../../components/icons'

export function PayoutAddress() {
  const nav = useNavigate()
  const { profile, refresh } = useStore()
  const [address, setAddress] = useState('')
  const [code, setCode] = useState('')
  const [stage, setStage] = useState<'enter' | 'code' | 'done'>('enter')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function sendCode() {
    setErr('')
    if (!address.trim()) return setErr('Enter your Solana USDC address.')
    setBusy(true)
    const { error } = await supabase!.rpc('request_payout_address', { p_address: address.trim() })
    setBusy(false)
    if (error) return setErr(error.message)
    setStage('code')
  }

  async function confirm() {
    setErr('')
    if (!code.trim()) return setErr('Enter the 6-digit code from your email.')
    setBusy(true)
    const { error } = await supabase!.rpc('confirm_payout_address', { p_code: code.trim() })
    setBusy(false)
    if (error) return setErr(error.message)
    await refresh()
    setStage('done')
  }

  if (stage === 'done') {
    return (
      <CenteredPage>
        <div className="rounded-[24px] bg-[#15161C] border border-white/7 p-8 text-center">
          <div className="w-[72px] h-[72px] rounded-full bg-[rgba(68,209,122,.16)] border border-[rgba(68,209,122,.4)] flex items-center justify-center mx-auto">
            <Check width={34} height={34} className="text-[var(--green)]" />
          </div>
          <div className="font-head font-bold text-[22px] text-white mt-5">Payout address saved</div>
          <div className="text-[#A9ABB6] text-[14px] font-semibold mt-2 leading-[1.5]">Your withdrawals will go to this confirmed address.</div>
          <button onClick={() => nav('/wallet/withdraw', { replace: true })} className="w-full mt-7 font-head font-extrabold text-[16px] bg-[var(--accent)] text-[var(--accent-ink)] py-[15px] rounded-[15px]" style={{ boxShadow: 'var(--glow)' }}>
            Done
          </button>
        </div>
      </CenteredPage>
    )
  }

  return (
    <Page title="Payout address" subtitle="For your security, the withdrawal address is confirmed by email." back narrow>
      {profile?.payout_wallet && (
        <div className="rounded-[14px] bg-[#15161C] border border-white/6 p-4 mb-5">
          <div className="text-[#8B8D99] text-[11px] font-bold uppercase tracking-[.07em] mb-1">Current address</div>
          <div className="font-mono text-[13px] text-white break-all">{profile.payout_wallet}</div>
        </div>
      )}

      {stage === 'enter' ? (
        <>
          <Label>{profile?.payout_wallet ? 'New Solana USDC address' : 'Your Solana USDC address'}</Label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Paste your Solana address"
            className="w-full bg-[#15161C] border border-white/10 rounded-[14px] px-4 py-[14px] text-white text-[14px] font-semibold placeholder:text-[#6E6F7A] outline-none focus:border-[var(--accent)]/60 mb-2"
          />
          <div className="flex items-start gap-2 text-[#767884] text-[12px] font-semibold px-1 mb-1">
            <Shield width={14} height={14} className="text-[var(--accent)] flex-none mt-[1px]" />
            We'll email a 6-digit code to confirm this address. USDC on Solana only.
          </div>
          {err && <div className="text-[var(--coral)] text-[13px] font-semibold mt-2 px-1">{err}</div>}
          <button onClick={sendCode} disabled={busy} className="w-full mt-5 font-head font-extrabold text-[16px] bg-[var(--accent)] text-[var(--accent-ink)] py-[16px] rounded-[16px] disabled:opacity-60" style={{ boxShadow: 'var(--glow)' }}>
            {busy ? 'Sending…' : 'Send confirmation code'}
          </button>
        </>
      ) : (
        <>
          <div className="text-[#A9ABB6] text-[14px] font-semibold mb-4 leading-[1.5]">
            We emailed a 6-digit code to your inbox. Enter it to save {shortAddr(address)}.
          </div>
          <Label>Confirmation code</Label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
            inputMode="numeric"
            placeholder="000000"
            className="w-full bg-[#15161C] border border-white/10 rounded-[14px] px-4 py-[14px] text-white text-[20px] font-head font-extrabold tracking-[.3em] text-center placeholder:text-[#3A3B44] outline-none focus:border-[var(--accent)]/60 mb-2"
          />
          {err && <div className="text-[var(--coral)] text-[13px] font-semibold mt-2 px-1">{err}</div>}
          <button onClick={confirm} disabled={busy} className="w-full mt-4 font-head font-extrabold text-[16px] bg-[var(--accent)] text-[var(--accent-ink)] py-[16px] rounded-[16px] disabled:opacity-60" style={{ boxShadow: 'var(--glow)' }}>
            {busy ? 'Confirming…' : 'Confirm & save'}
          </button>
          <button onClick={() => { setStage('enter'); setCode('') }} className="w-full mt-2 text-[#9A9CA8] text-[13px] font-bold py-2">Use a different address</button>
          <button onClick={sendCode} disabled={busy} className="w-full text-[var(--accent)] text-[13px] font-bold py-1">Resend code</button>
        </>
      )}
    </Page>
  )
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[#8B8D99] text-[12px] font-bold uppercase tracking-[.07em] mb-2">{children}</div>
)
