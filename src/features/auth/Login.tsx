import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import type { Mode } from '../../lib/types'
import { cleanAuthError, emailError, passwordError, passwordStrength } from '../../lib/validate'
import { collectSignals } from '../../lib/fraud'
import { supabase, supabaseEnabled } from '../../lib/supabase'
import { BrandMark, FraudNotice } from '../../components/layout'
import { Apple, ArrowRight, Check, Google, Phone } from '../../components/icons'
import { Avatar } from '../../components/ui'

export function Login() {
  const { signIn, signUp } = useStore()
  const nav = useNavigate()
  const [mode, setMode] = useState<Mode>('earner')
  const [isSignup, setIsSignup] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [pendingEmail, setPendingEmail] = useState('')
  const [existingHint, setExistingHint] = useState('')
  const [infoMsg, setInfoMsg] = useState('')
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function resend() {
    if (cooldown > 0) return
    setInfoMsg('')
    if (!supabase || !pendingEmail) return
    const { error } = await supabase.auth.resend({ type: 'signup', email: pendingEmail })
    setInfoMsg(error ? cleanAuthError(error.message, error.status) : 'Confirmation email sent again — check your inbox and spam.')
    setCooldown(60)
  }

  async function sendReset() {
    setErr('')
    const ee = emailError(email)
    if (ee) return setErr('Enter your email above first, then tap reset.')
    if (!supabase) return
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) setErr(cleanAuthError(error.message, error.status))
    else setResetSent(true)
  }

  async function submit() {
    setErr('')
    setBusy(true)
    try {
      if (isSignup) {
        if (!name.trim()) throw new Error('Enter a name.')
        const ee = emailError(email)
        if (ee) throw new Error(ee)
        const pe = passwordError(password)
        if (pe) throw new Error(pe)
        const signals = await collectSignals()
        if (signals.vpn) throw new Error('Please turn off your VPN or proxy to create an account.')
        // Already have an account on this device? Offer to sign into it instead of blocking.
        if (supabase && signals.deviceHash) {
          const { data: hint } = await supabase.rpc('device_account_hint', { p_device_hash: signals.deviceHash })
          if (hint) { setExistingHint(hint as string); setBusy(false); return }
        }
        const res = await signUp(email, password, name.trim(), mode, signals)
        if (res.needsConfirmation) { setPendingEmail(email.trim()); setBusy(false); return }
        nav(mode === 'business' ? '/business' : '/onboarding', { replace: true })
      } else {
        await signIn(email, password)
        nav('/', { replace: true })
      }
    } catch (e) {
      const raw = (e as Error).message ?? ''
      // Unconfirmed account (sign-in or signup) → show the confirm screen with Resend.
      if (raw.toLowerCase().includes('not confirmed') || raw.toLowerCase().includes('email_not_confirmed')) {
        setPendingEmail(email.trim())
      } else {
        setErr(cleanAuthError(raw))
      }
    } finally {
      setBusy(false)
    }
  }

  // Already have an account on this device → recognise it and sign in.
  if (existingHint) {
    return (
      <div className="min-h-svh flex items-center justify-center p-6">
        <div className="w-full max-w-[400px] reveal">
          <div className="flex justify-center mb-8"><BrandMark size={44} /></div>
          <div className="rounded-[24px] bg-[#15161C] border border-white/7 p-7 text-center">
            <div className="font-head font-bold text-[22px] text-white">You already have an account</div>
            <div className="text-[#A9ABB6] text-[14px] font-semibold mt-2">This device is already linked to:</div>
            <div className="font-head text-[18px] font-extrabold text-[var(--accent)] mt-2 break-all">{existingHint}</div>
            <div className="text-[#767884] text-[12.5px] font-semibold mt-3 leading-[1.5]">
              One account per person. Sign in to that account instead — once you're in you can change the email or name in settings.
            </div>
            <button
              onClick={() => { setExistingHint(''); setIsSignup(false); setPassword(''); setErr('') }}
              className="w-full mt-5 font-head font-extrabold text-[15px] bg-[var(--accent)] text-[var(--accent-ink)] py-[14px] rounded-[14px]"
              style={{ boxShadow: 'var(--glow)' }}
            >
              Sign in to this account
            </button>
            <button onClick={() => setExistingHint('')} className="w-full mt-2 text-[#9A9CA8] text-[13px] font-bold py-2">Back</button>
          </div>
        </div>
      </div>
    )
  }

  // Signed up but needs to confirm email → with resend.
  if (pendingEmail) {
    return (
      <div className="min-h-svh flex items-center justify-center p-6">
        <div className="w-full max-w-[400px] reveal">
          <div className="flex justify-center mb-8"><BrandMark size={44} /></div>
          <div className="rounded-[24px] bg-[#15161C] border border-white/7 p-7 text-center">
            <div className="w-14 h-14 rounded-full bg-[rgba(194,249,77,.12)] border border-[rgba(194,249,77,.3)] flex items-center justify-center mx-auto">
              <Check width={28} height={28} className="text-[var(--accent)]" />
            </div>
            <div className="font-head font-bold text-[22px] text-white mt-5">Confirm your email</div>
            <div className="text-[#A9ABB6] text-[14px] font-semibold mt-2 leading-[1.5]">
              We sent a confirmation link to<br /><span className="text-white font-bold break-all">{pendingEmail}</span>.<br />Click it, then sign in.
            </div>
            <div className="mt-4 rounded-[14px] bg-[rgba(255,176,90,.1)] border border-[rgba(255,176,90,.3)] p-3 text-left">
              <div className="text-[#FFB05A] text-[12.5px] font-extrabold">📬 Check your Spam / Junk folder</div>
              <div className="text-[#C7C9D4] text-[12px] font-semibold mt-1 leading-[1.45]">
                Our emails often land there. Mark it “Not spam” so future emails reach your inbox.
              </div>
            </div>
            {infoMsg && <div className="text-[var(--green)] text-[12.5px] font-semibold mt-3">{infoMsg}</div>}
            <button onClick={resend} disabled={cooldown > 0} className="w-full mt-4 font-head font-extrabold text-[15px] bg-white/6 text-white border border-white/12 py-[13px] rounded-[14px] disabled:opacity-50">
              {cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend confirmation email'}
            </button>
            <button onClick={() => { setPendingEmail(''); setIsSignup(false); setErr('') }} className="w-full mt-2 text-[var(--accent)] text-[13px] font-extrabold py-2">Back to sign in</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-svh grid lg:grid-cols-2">
      {/* ===== Brand panel (desktop) ===== */}
      <div className="hidden lg:flex flex-col justify-between p-12 border-r border-white/7 hero-grid relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(600px 400px at 20% 10%, rgba(194,249,77,.12), transparent 60%), radial-gradient(500px 400px at 90% 90%, rgba(139,108,255,.14), transparent 60%)' }}
        />
        <button onClick={() => nav('/')} className="relative text-left">
          <BrandMark size={40} />
        </button>
        <div className="relative">
          <h1 className="font-head font-bold text-[44px] leading-[1.08] tracking-[-.02em] text-white">
            Get paid for<br />the <span className="text-[var(--accent)]">tiny stuff.</span>
          </h1>
          <p className="text-[#A9ABB6] text-[16px] font-medium mt-4 max-w-[400px] leading-[1.55]">
            Follow, watch, test, survey — cash out in USDC straight to your wallet.
          </p>
          <div className="flex items-center gap-2 mt-6 px-3 py-2 rounded-full bg-[rgba(68,209,122,.1)] border border-[rgba(68,209,122,.25)] w-fit">
            <Avatar name="B" size={22} gradient="linear-gradient(135deg,#FF6B5A,#FFB05A)" />
            <span className="text-[#C7D8CB] text-[12.5px] font-semibold">
              Bilal just earned <span className="text-[var(--green)] font-extrabold">$0.35</span>
            </span>
          </div>
        </div>
        <div className="relative text-[#5E606C] text-[12.5px] font-semibold">Non-custodial — your keys, your USDC.</div>
      </div>

      {/* ===== Auth card ===== */}
      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-[400px] reveal">
          <div className="lg:hidden mb-8 flex justify-center">
            <BrandMark size={44} />
          </div>

          <div className="text-center lg:text-left mb-7">
            <h2 className="font-head font-bold text-[28px] text-white tracking-[-.02em]">
              {isSignup ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="text-[#9A9CA8] text-[14.5px] font-semibold mt-2">
              {isSignup ? 'Start earning USDC in seconds.' : 'Log in to keep earning.'}
            </p>
          </div>

          {/* role segmented */}
          <div className="flex gap-[6px] bg-black/35 border border-white/7 rounded-[14px] p-[5px] mb-4">
            {(['earner', 'business'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 text-center py-[11px] rounded-[10px] text-[13.5px] font-head ${
                  mode === m ? 'bg-[var(--accent)] text-[var(--accent-ink)] font-extrabold' : 'text-[#9A9CA8] font-bold'
                }`}
              >
                {m === 'earner' ? 'I want to earn' : 'I post tasks'}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-[10px]">
            {isSignup && (
              <Field placeholder={mode === 'business' ? 'Business name' : 'Your name'} value={name} onChange={setName} />
            )}
            <Field placeholder="Email" value={email} onChange={setEmail} type="email" />
            <Field placeholder="Password" value={password} onChange={setPassword} type="password" />
            {isSignup && password.length > 0 && <PasswordMeter pw={password} />}
            {isSignup && password.length === 0 && (
              <div className="text-[#767884] text-[11.5px] font-semibold px-1">8+ characters with upper & lower case and a number.</div>
            )}
            {err && <div className="text-[var(--coral)] text-[12.5px] font-semibold px-1">{err}</div>}
            <button
              onClick={submit}
              disabled={busy || !email || !password}
              className="w-full font-head font-extrabold text-[15px] bg-[var(--accent)] text-[var(--accent-ink)] py-[15px] rounded-[14px] disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ boxShadow: 'var(--glow)' }}
            >
              {busy ? 'Please wait…' : isSignup ? 'Create account' : 'Continue'}
              {!busy && <ArrowRight width={16} height={16} />}
            </button>
          </div>

          {isSignup && <FraudNotice mode={mode} />}

          {!isSignup && supabaseEnabled && (
            <div className="text-center mt-3">
              {resetSent ? (
                <span className="text-[var(--green)] text-[13px] font-semibold">Reset link sent — check your email <span className="text-[#FFB05A]">and Spam folder</span>.</span>
              ) : (
                <button onClick={sendReset} className="text-[#9A9CA8] text-[13px] font-semibold hover:text-white">
                  Forgot password?
                </button>
              )}
            </div>
          )}

          <button onClick={() => { setIsSignup((v) => !v); setErr('') }} className="block w-full text-center text-[#767884] text-[13px] font-semibold mt-3">
            {isSignup ? 'Already have an account? ' : 'New here? '}
            <span className="text-[var(--accent)] font-extrabold">{isSignup ? 'Sign in' : 'Create one'}</span>
          </button>

          <div className="flex items-center gap-[10px] my-5">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-[#9A9CA8] text-[12px] font-bold">or</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          <div className="grid grid-cols-3 gap-[10px]">
            <Social icon={<Google width={20} height={20} />} />
            <Social icon={<Apple width={18} height={18} className="text-white" />} />
            <Social icon={<Phone width={18} height={18} className="text-white" />} />
          </div>

        </div>
      </div>
    </div>
  )
}

function Field({ placeholder, value, onChange, type = 'text' }: { placeholder: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoCapitalize="none"
      className="w-full bg-[#15161C] border border-white/12 rounded-[14px] px-4 py-[14px] text-white text-[15px] font-semibold placeholder:text-[#6E6F7A] outline-none focus:border-[var(--accent)]/60"
    />
  )
}

function PasswordMeter({ pw }: { pw: string }) {
  const s = passwordStrength(pw)
  const labels = ['Too weak', 'Weak', 'Okay', 'Good', 'Strong']
  const colors = ['#FF6B5A', '#FF6B5A', '#FFB05A', '#C2F94D', '#44D17A']
  return (
    <div className="px-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex-1 h-[4px] rounded-full" style={{ background: i < s ? colors[s] : 'rgba(255,255,255,.1)' }} />
        ))}
      </div>
      <div className="text-[11px] font-bold mt-1" style={{ color: colors[s] }}>{labels[s]}</div>
    </div>
  )
}

function Social({ icon }: { icon: React.ReactNode }) {
  const [done, setDone] = useState(false)
  return (
    <button
      onClick={() => { setDone(true); setTimeout(() => setDone(false), 1400) }}
      className="py-[13px] rounded-[14px] bg-[#15161C] border border-white/12 flex items-center justify-center hover:bg-white/8"
      title="Coming soon — use email"
    >
      {done ? <Check width={18} height={18} className="text-[var(--green)]" /> : icon}
    </button>
  )
}
