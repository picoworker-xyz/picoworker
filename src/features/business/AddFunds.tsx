import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { supabase } from '../../lib/supabase'
import { usd, timeAgo } from '../../lib/format'
import { Page } from '../../components/Page'
import { Check, Shield } from '../../components/icons'

// Real custodial Solana USDC deposits: per-user address + on-chain detection.
export function AddFunds() {
  const nav = useNavigate()
  const { wallet, refresh } = useStore()
  const [address, setAddress] = useState<string | null>(null)
  const [addrErr, setAddrErr] = useState('')
  const [copied, setCopied] = useState(false)
  const [checking, setChecking] = useState(false)
  const [msg, setMsg] = useState('')
  const [success, setSuccess] = useState('')
  const [deposits, setDeposits] = useState<Deposit[]>([])

  async function loadDeposits() {
    // RLS limits this to the signed-in user's own deposits.
    const { data } = await supabase!
      .from('deposits')
      .select('id,signature,amount,status,created_at')
      .order('created_at', { ascending: false })
    setDeposits((data ?? []).map((d) => ({ ...d, amount: Number(d.amount) })) as Deposit[])
  }

  useEffect(() => {
    supabase!.functions.invoke('solana-deposit-address').then(({ data, error }) => {
      if (error || data?.error) setAddrErr('Could not load your deposit address. Make sure the Solana functions are deployed.')
      else setAddress(data.address)
    })
    loadDeposits()
  }, [])

  async function check() {
    setChecking(true)
    setMsg('')
    setSuccess('')
    const { data, error } = await supabase!.functions.invoke('solana-check-deposits')
    setChecking(false)
    if (error || data?.error) return setMsg('Could not check for payment right now. Try again in a moment.')
    if (data.credited > 0) {
      await refresh()
      await loadDeposits()
      setSuccess(`✓ Credited ${Number(data.credited).toFixed(2)} USDC to your escrow.`)
    } else {
      setMsg('No payment detected yet. It can take ~30 seconds after sending — tap “Check for payment” again.')
    }
  }

  return (
    <Page title="Add funds" subtitle="Send USDC on Solana to your deposit address." back narrow>
      <div className="rounded-[var(--r)] p-5 bg-[#15161C] border border-white/6 mb-4 text-center">
        <div className="text-[#8B8D99] text-[12px] font-bold uppercase tracking-[.07em]">Campaign balance</div>
        <div className="font-head text-[36px] font-extrabold text-white mt-1">{usd(wallet?.business_escrow ?? 0)}</div>
        <div className="text-[#767884] text-[11.5px] font-semibold mt-1">Leftover not committed to live campaigns</div>
        {(wallet?.business_escrow ?? 0) > 0.2 && (
          <button onClick={() => nav('/wallet/withdraw?source=business')} className="mt-4 px-5 py-2.5 rounded-[12px] bg-white/6 text-white text-[13px] font-extrabold font-head">
            Withdraw leftover
          </button>
        )}
      </div>

      {addrErr ? (
        <div className="rounded-[16px] p-4 bg-[rgba(255,107,90,.08)] border border-[rgba(255,107,90,.25)] text-[var(--coral)] text-[13px] font-semibold">{addrErr}</div>
      ) : !address ? (
        <div className="rounded-[16px] p-6 bg-[#15161C] border border-white/6 flex items-center justify-center gap-3 text-[#9A9CA8]">
          <div className="w-5 h-5 rounded-full border-2 border-white/15 border-t-[var(--accent)] animate-spin" /> Loading your deposit address…
        </div>
      ) : (
        <>
          <div className="rounded-[18px] p-5 bg-[#15161C] border border-white/8">
            <div className="text-[#8B8D99] text-[12px] font-bold uppercase tracking-[.07em] mb-3 text-center">Your USDC deposit address · Solana</div>
            <div className="flex justify-center mb-4">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&bgcolor=15161C&color=C2F94D&data=${encodeURIComponent(address)}`}
                alt="Deposit address QR"
                width={180}
                height={180}
                className="rounded-[12px]"
              />
            </div>
            <div className="flex items-center gap-2 rounded-[12px] bg-black/30 border border-white/8 p-2 pl-3">
              <div className="flex-1 text-[#C2C4CE] text-[12px] font-bold break-all font-head">{address}</div>
              <button onClick={() => { navigator.clipboard?.writeText(address).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500) }} className="px-3 py-2 rounded-[10px] bg-white/6 text-white text-[12px] font-bold flex-none">{copied ? 'Copied!' : 'Copy'}</button>
            </div>
          </div>

          <div className="flex items-start gap-2 mt-4 rounded-[12px] bg-[rgba(255,176,90,.07)] border border-[rgba(255,176,90,.2)] p-3">
            <Shield width={16} height={16} className="text-[#FFB05A] flex-none mt-[1px]" />
            <p className="text-[#C7C9D4] text-[12px] font-semibold leading-[1.5]">
              Send <span className="font-extrabold text-white">USDC on the Solana network only</span>. Other tokens or other chains will be lost. Your escrow is credited automatically once the transfer confirms.
            </p>
          </div>

          {success && <div className="text-[var(--green)] text-[13px] font-bold mt-3 text-center">{success}</div>}
          {msg && <div className="text-[#9A9CA8] text-[12.5px] font-semibold mt-3 text-center">{msg}</div>}

          <button onClick={check} disabled={checking} className="w-full mt-5 font-head font-extrabold text-[16px] bg-[var(--accent)] text-[var(--accent-ink)] py-[16px] rounded-[16px] disabled:opacity-60" style={{ boxShadow: 'var(--glow)' }}>
            {checking ? 'Checking…' : "I've sent it · check for payment"}
          </button>
          <div className="text-center text-[#767884] text-[12px] font-semibold mt-3">We scan the Solana chain and credit any USDC received.</div>

          {/* Deposit history — every on-chain transfer, credited once by signature */}
          <div className="mt-7">
            <div className="text-white text-[15px] font-extrabold font-head mb-3">Your deposits</div>
            {deposits.length === 0 ? (
              <div className="rounded-[14px] bg-[#15161C] border border-white/6 py-8 text-center text-[#767884] text-[13px] font-semibold">
                No deposits yet. Sent USDC shows here once it confirms.
              </div>
            ) : (
              <div className="rounded-[16px] bg-[#15161C] border border-white/6 overflow-hidden">
                {deposits.map((d, i) => (
                  <div key={d.id} className={`flex items-center gap-3 px-4 py-[13px] ${i === 0 ? '' : 'border-t border-white/5'}`}>
                    <div className="w-9 h-9 flex-none rounded-[11px] bg-[rgba(68,209,122,.14)] flex items-center justify-center">
                      <Check width={16} height={16} className="text-[var(--green)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-[14px] font-bold">{d.amount.toFixed(2)} USDC</div>
                      <a
                        href={`https://solscan.io/tx/${d.signature}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#767884] text-[11.5px] font-semibold mt-[1px] hover:text-[var(--accent)] inline-flex items-center gap-1"
                      >
                        {timeAgo(d.created_at)} · {d.signature.slice(0, 6)}…{d.signature.slice(-6)} ↗
                      </a>
                    </div>
                    <span className="text-[var(--green)] text-[11px] font-extrabold uppercase">Credited</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </Page>
  )
}

interface Deposit {
  id: string
  signature: string
  amount: number
  status: string
  created_at: string
}
