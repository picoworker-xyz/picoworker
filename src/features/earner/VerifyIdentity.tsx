import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { Page, CenteredPage } from '../../components/Page'
import { Check, IdCard, Phone, Shield } from '../../components/icons'

const DOC_TYPES = ['National ID', 'Passport', 'License']

export function VerifyIdentity() {
  const nav = useNavigate()
  const { profile, verifyIdentity } = useStore()
  const [doc, setDoc] = useState('National ID')
  const [done, setDone] = useState(false)
  if (!profile) return null

  if (profile.identity_verified && !done) {
    return (
      <CenteredPage>
        <div className="rounded-[24px] bg-[#15161C] border border-white/7 p-8 text-center">
          <div className="w-[80px] h-[80px] rounded-full bg-[rgba(68,209,122,.16)] border border-[rgba(68,209,122,.4)] flex items-center justify-center mx-auto">
            <Check width={38} height={38} className="text-[var(--green)]" />
          </div>
          <div className="font-head font-bold text-[24px] text-white mt-6">You're verified</div>
          <div className="text-[#A9ABB6] text-[14px] font-semibold mt-2">Instant withdrawals and higher payouts are unlocked.</div>
          <button onClick={() => nav('/profile')} className="w-full mt-7 font-head font-extrabold text-[16px] bg-[var(--accent)] text-[var(--accent-ink)] py-[15px] rounded-[15px]" style={{ boxShadow: 'var(--glow)' }}>Back to profile</button>
        </div>
      </CenteredPage>
    )
  }

  if (done) {
    return (
      <CenteredPage>
        <div className="rounded-[24px] bg-[#15161C] border border-white/7 p-8 text-center">
          <div className="w-[80px] h-[80px] rounded-full bg-[var(--accent)] flex items-center justify-center mx-auto" style={{ boxShadow: 'var(--glow)' }} >
            <Shield width={38} height={38} className="text-[var(--accent-ink)]" />
          </div>
          <div className="font-head font-bold text-[24px] text-white mt-6">Verification submitted</div>
          <div className="text-[#A9ABB6] text-[14px] font-semibold mt-2 leading-[1.5]">We've confirmed your identity. Higher payouts and instant withdrawals are now unlocked.</div>
          <button onClick={() => nav('/profile')} className="w-full mt-7 font-head font-extrabold text-[16px] bg-[var(--accent)] text-[var(--accent-ink)] py-[15px] rounded-[15px]" style={{ boxShadow: 'var(--glow)' }}>Done</button>
        </div>
      </CenteredPage>
    )
  }

  return (
    <Page title="Verify identity" subtitle="Takes ~2 minutes. Unlocks instant withdrawals, higher payouts and bigger tasks." back narrow>
      {/* steps progress */}
      <div className="flex flex-col gap-2 mb-6">
        <StepRow n={1} label="Phone number" state="done" />
        <StepRow n={2} label="Government ID" state="now" />
        <StepRow n={3} label="Selfie check" state="todo" />
      </div>

      <Label>Document type</Label>
      <div className="flex gap-2 mb-5">
        {DOC_TYPES.map((d) => (
          <button key={d} onClick={() => setDoc(d)} className={`flex-1 py-[12px] rounded-[12px] text-[13px] font-head font-extrabold border ${doc === d ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-transparent' : 'bg-[#15161C] text-[#C2C4CE] border-white/8'}`}>
            {d}
          </button>
        ))}
      </div>

      <div className="rounded-[18px] border border-dashed border-white/15 bg-white/4 p-10 flex flex-col items-center text-center mb-5">
        <IdCard width={40} height={40} className="text-[#9A9CA8]" />
        <div className="text-white text-[14px] font-bold mt-3">Position the front of your {doc}</div>
        <div className="text-[#767884] text-[12px] font-semibold mt-1">Make sure all corners are visible and text is sharp.</div>
      </div>

      <div className="flex items-center gap-2 text-[#767884] text-[12.5px] font-semibold mb-6">
        <Shield width={15} height={15} className="text-[var(--green)]" /> Encrypted &amp; never shared with task givers.
      </div>

      <button onClick={() => { verifyIdentity(); setDone(true) }} className="w-full font-head font-extrabold text-[16px] bg-[var(--accent)] text-[var(--accent-ink)] py-[16px] rounded-[16px]" style={{ boxShadow: 'var(--glow)' }}>
        Scan my ID
      </button>
    </Page>
  )
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[#8B8D99] text-[12px] font-bold uppercase tracking-[.07em] mb-2">{children}</div>
)

function StepRow({ n, label, state }: { n: number; label: string; state: 'done' | 'now' | 'todo' }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-[14px] bg-[#15161C] border border-white/6">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-head text-[13px] font-extrabold ${state === 'done' ? 'bg-[var(--green)] text-[#06140c]' : state === 'now' ? 'bg-[var(--accent)] text-[var(--accent-ink)]' : 'bg-white/8 text-[#9A9CA8]'}`}>
        {state === 'done' ? <Check width={15} height={15} /> : n}
      </div>
      <div className="flex-1 text-white text-[14px] font-bold flex items-center gap-2">
        {n === 1 && <Phone width={15} height={15} className="text-[#9A9CA8]" />}
        {label}
      </div>
      <span className={`text-[11px] font-extrabold ${state === 'done' ? 'text-[var(--green)]' : state === 'now' ? 'text-[var(--accent)]' : 'text-[#5E606C]'}`}>
        {state === 'done' ? 'Done' : state === 'now' ? 'Now' : ''}
      </span>
    </div>
  )
}
