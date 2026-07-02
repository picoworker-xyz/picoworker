import { useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { CenteredPage } from '../../components/Page'
import { Check, Shield } from '../../components/icons'

export function VerifyIdentity() {
  const nav = useNavigate()
  const { profile } = useStore()
  if (!profile) return null

  if (profile.identity_verified) {
    return (
      <CenteredPage>
        <div className="rounded-[24px] bg-[var(--card)] border border-[var(--line)] p-8 text-center">
          <div className="w-[80px] h-[80px] rounded-full bg-[rgba(68,209,122,.16)] border border-[rgba(68,209,122,.4)] flex items-center justify-center mx-auto">
            <Check width={38} height={38} className="text-[var(--green)]" />
          </div>
          <div className="font-head font-bold text-[24px] text-[var(--ink)] mt-6">You're verified</div>
          <div className="text-[var(--ink-3)] text-[14px] font-semibold mt-2">Instant withdrawals and higher payouts are unlocked.</div>
          <button onClick={() => nav('/profile')} className="w-full mt-7 font-head font-extrabold text-[16px] bg-[var(--accent)] text-[var(--accent-ink)] py-[15px] rounded-[15px]" style={{ boxShadow: 'var(--glow)' }}>Back to profile</button>
        </div>
      </CenteredPage>
    )
  }

  return (
    <CenteredPage>
      <div className="rounded-[24px] bg-[var(--card)] border border-[var(--line)] p-8 text-center">
        <div className="w-[80px] h-[80px] rounded-full bg-[var(--fill)] border border-[var(--line-2)] flex items-center justify-center mx-auto">
          <Shield width={38} height={38} className="text-[var(--ink-3)]" />
        </div>
        <div className="font-head font-bold text-[24px] text-[var(--ink)] mt-6">Verification is disabled</div>
        <div className="text-[var(--ink-3)] text-[14px] font-semibold mt-2 leading-[1.5]">
          Identity verification is turned off for now. You can use PicoWorker without it. We will let you know when it goes live.
        </div>
        <button onClick={() => nav('/profile')} className="w-full mt-7 font-head font-extrabold text-[16px] bg-[var(--accent)] text-[var(--accent-ink)] py-[15px] rounded-[15px]" style={{ boxShadow: 'var(--glow)' }}>Back to profile</button>
      </div>
    </CenteredPage>
  )
}
