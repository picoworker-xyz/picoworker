import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { passwordError } from '../../lib/validate'
import { BrandMark } from '../../components/layout'
import { Check } from '../../components/icons'

// Landing page for the Supabase password-recovery email link. Supabase
// (detectSessionInUrl) turns the link's token into a session on load, so
// updateUser({ password }) can set the new password.
export function ResetPassword() {
  const nav = useNavigate()
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)

  async function submit() {
    setErr('')
    const pe = passwordError(pw)
    if (pe) return setErr(pe)
    if (!supabase) return setErr('Backend not configured.')
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) return setErr(error.message)
    // Clear any login lockout from earlier wrong attempts so they can sign in now.
    await supabase.rpc('clear_login_lockout')
    setDone(true)
  }

  return (
    <div className="min-h-svh flex items-center justify-center p-6">
      <div className="w-full max-w-[400px] reveal">
        <div className="flex justify-center mb-8"><BrandMark size={44} /></div>
        <div className="rounded-[24px] bg-[var(--card)] border border-[var(--line)] p-7">
          {done ? (
            <div className="text-center">
              <div className="w-[72px] h-[72px] rounded-full bg-[var(--accent)] flex items-center justify-center mx-auto" style={{ boxShadow: 'var(--glow)' }}>
                <Check width={34} height={34} className="text-[var(--accent-ink)]" />
              </div>
              <div className="font-head font-bold text-[22px] text-[var(--ink)] mt-5">Password updated</div>
              <div className="text-[var(--ink-3)] text-[14px] font-semibold mt-2">You can now sign in with your new password.</div>
              <button onClick={() => nav('/login', { replace: true })} className="w-full mt-6 font-head font-extrabold text-[16px] bg-[var(--accent)] text-[var(--accent-ink)] py-[15px] rounded-[14px]" style={{ boxShadow: 'var(--glow)' }}>
                Go to sign in
              </button>
            </div>
          ) : (
            <>
              <div className="font-head font-bold text-[22px] text-[var(--ink)]">Set a new password</div>
              <div className="text-[var(--ink-3)] text-[14px] font-semibold mt-1 mb-5">Choose a strong password for your account.</div>
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="New password"
                className="w-full bg-[var(--fill)] border border-[var(--line-2)] rounded-[14px] px-4 py-[14px] text-[var(--ink)] text-[15px] font-semibold placeholder:text-[var(--ink-5)] outline-none focus:border-[var(--accent)]/60"
              />
              <div className="text-[var(--ink-4)] text-[11px] font-semibold mt-1.5">8+ chars with upper & lower case and a number.</div>
              {err && <div className="text-[var(--coral)] text-[12.5px] font-semibold mt-3">{err}</div>}
              <button onClick={submit} disabled={busy} className="w-full mt-5 font-head font-extrabold text-[16px] bg-[var(--accent)] text-[var(--accent-ink)] py-[15px] rounded-[14px] disabled:opacity-50" style={{ boxShadow: 'var(--glow)' }}>
                {busy ? 'Updating…' : 'Update password'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
