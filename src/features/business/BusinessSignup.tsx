import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { emailError, passwordError } from '../../lib/validate'
import { collectSignals } from '../../lib/fraud'
import { BrandMark, FraudNotice } from '../../components/layout'
import { ArrowRight, Check } from '../../components/icons'

const CATEGORIES = ['App / startup', 'Creator', 'E-commerce', 'Agency']

export function BusinessSignup() {
  const nav = useNavigate()
  const { signUp } = useStore()
  const [name, setName] = useState('')
  const [site, setSite] = useState('')
  const [category, setCategory] = useState('App / startup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agree, setAgree] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setErr('')
    if (!name.trim()) return setErr('Enter your business name.')
    const ee = emailError(email)
    if (ee) return setErr(ee)
    const pe = passwordError(password)
    if (pe) return setErr(pe)
    if (!agree) return setErr('Please accept the advertiser terms.')
    setBusy(true)
    try {
      const signals = await collectSignals()
      if (signals.vpn) {
        setBusy(false)
        return setErr('Please turn off your VPN or proxy to create an account.')
      }
      await signUp(email, password, name.trim(), 'business', signals)
      nav('/business', { replace: true })
    } catch (e) {
      setErr((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <div className="min-h-svh flex flex-col">
      <header className="border-b border-white/7">
        <div className="app-container h-16 flex items-center justify-between">
          <button onClick={() => nav('/')}><BrandMark size={34} /></button>
          <button onClick={() => nav('/login')} className="text-[#9A9CA8] text-[14px] font-bold hover:text-white">Log in</button>
        </div>
      </header>

      <div className="flex-1 app-container py-10 lg:py-16 grid lg:grid-cols-[1.1fr_1fr] gap-12 items-center">
        {/* pitch */}
        <div className="hidden lg:block">
          <div className="inline-flex items-center gap-2 px-3 py-[7px] rounded-full bg-[rgba(139,108,255,.12)] border border-[rgba(139,108,255,.3)] mb-6">
            <span className="w-2 h-2 rounded-full bg-[var(--violet)]" />
            <span className="text-[#C7C9D4] text-[12.5px] font-bold">For businesses & creators</span>
          </div>
          <h1 className="font-head font-bold text-[44px] leading-[1.08] tracking-[-.02em] text-white">Reach real people, fast.</h1>
          <p className="text-[#A9ABB6] text-[16px] font-medium mt-4 max-w-[420px] leading-[1.6]">
            Launch a task in minutes and pay per verified result — real followers, views, installs and survey responses.
          </p>
          <div className="flex flex-col gap-3 mt-7">
            {['Pay only for verified completions', 'Funds held in escrow — refund anytime', 'Live analytics & targeting'].map((f) => (
              <div key={f} className="flex items-center gap-3 text-[#D9DAE2] text-[15px] font-semibold">
                <div className="w-6 h-6 rounded-full bg-[rgba(194,249,77,.14)] flex items-center justify-center flex-none">
                  <Check width={14} height={14} className="text-[var(--accent)]" />
                </div>
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* form */}
        <div className="w-full max-w-[440px] mx-auto rounded-[24px] bg-[#15161C] border border-white/7 p-7">
          <div className="font-head font-bold text-[22px] text-white">Create a business account</div>
          <div className="text-[#9A9CA8] text-[14px] font-semibold mt-1 mb-5">Launch your first campaign in minutes.</div>

          <Field label="Business / brand name" placeholder="Acme Inc" value={name} onChange={setName} />
          <Field label="Website or main social" placeholder="acme.com" value={site} onChange={setSite} />

          <Label>Category</Label>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => setCategory(c)} className={`py-[11px] rounded-[12px] text-[13px] font-head font-extrabold border ${category === c ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-transparent' : 'bg-white/4 text-[#C2C4CE] border-white/8'}`}>
                {c}
              </button>
            ))}
          </div>

          <Field label="Work email" placeholder="growth@acme.com" value={email} onChange={setEmail} type="email" />
          <Field label="Password" placeholder="Create a password" value={password} onChange={setPassword} type="password" hint="8+ chars with upper & lower case and a number" />

          <button onClick={() => setAgree((v) => !v)} className="flex items-center gap-3 mt-1 mb-4 text-left">
            <span className={`w-5 h-5 rounded-[6px] border-2 flex items-center justify-center flex-none ${agree ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-white/25'}`}>
              {agree && <Check width={13} height={13} className="text-[var(--accent-ink)]" />}
            </span>
            <span className="text-[#9A9CA8] text-[12.5px] font-semibold">I agree to the advertiser Terms &amp; no-spam policy</span>
          </button>

          {err && <div className="text-[var(--coral)] text-[12.5px] font-semibold mb-3">{err}</div>}

          <button onClick={submit} disabled={busy} className="w-full font-head font-extrabold text-[16px] bg-[var(--accent)] text-[var(--accent-ink)] py-[15px] rounded-[14px] disabled:opacity-50 flex items-center justify-center gap-2" style={{ boxShadow: 'var(--glow)' }}>
            {busy ? 'Creating…' : 'Create business account'} {!busy && <ArrowRight width={16} height={16} />}
          </button>
          <FraudNotice />
        </div>
      </div>
    </div>
  )
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[#8B8D99] text-[12px] font-bold uppercase tracking-[.07em] mb-2">{children}</div>
)
function Field({ label, placeholder, value, onChange, type = 'text', hint }: { label: string; placeholder: string; value: string; onChange: (v: string) => void; type?: string; hint?: string }) {
  return (
    <div className="mb-4">
      <Label>{label}</Label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoCapitalize="none"
        className="w-full bg-white/4 border border-white/10 rounded-[14px] px-4 py-[13px] text-white text-[15px] font-semibold placeholder:text-[#6E6F7A] outline-none focus:border-[var(--accent)]/60"
      />
      {hint && <div className="text-[#767884] text-[11px] font-semibold mt-1.5">{hint}</div>}
    </div>
  )
}
