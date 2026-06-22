import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { usd } from '../../lib/format'
import { CenteredPage } from '../../components/Page'
import { ArrowRight, Check, Flame } from '../../components/icons'

export function TaskComplete() {
  const nav = useNavigate()
  const loc = useLocation()
  const { wallet, profile } = useStore()
  const state = (loc.state ?? {}) as { reward?: number; balance?: number }
  const reward = state.reward ?? 0
  const balance = state.balance ?? wallet?.earner_balance ?? 0

  return (
    <CenteredPage>
      <div className="rounded-[24px] bg-[#15161C] border border-white/7 p-8 text-center">
        <div className="flex flex-col items-center" style={{ animation: 'pico-pop .4s ease both' }}>
          <div className="w-[84px] h-[84px] rounded-full bg-[var(--accent)] flex items-center justify-center" style={{ boxShadow: 'var(--glow)' }}>
            <Check width={42} height={42} className="text-[var(--accent-ink)]" />
          </div>
          <div className="font-head font-bold text-[26px] text-white mt-6 tracking-[-.01em]">Nice — verified!</div>
          <div className="text-[#A9ABB6] text-[14.5px] font-semibold mt-2">Your task was confirmed automatically.</div>
        </div>

        <div className="my-8">
          <div className="font-head font-bold text-[56px] text-[var(--accent)] tracking-[-.02em] leading-none">{usd(reward, { sign: true })}</div>
          <div className="text-[#8B8D99] text-[13px] font-semibold mt-2">Paid to your wallet · USDC</div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 rounded-[16px] p-4 bg-white/4 border border-white/6">
            <div className="font-head text-[20px] font-extrabold text-white">{usd(balance)}</div>
            <div className="text-[#767884] text-[11px] font-semibold mt-1">New balance</div>
          </div>
          <div className="flex-1 rounded-[16px] p-4 bg-white/4 border border-white/6">
            <div className="font-head text-[20px] font-extrabold text-white flex items-center justify-center gap-1">
              <Flame width={13} height={15} className="text-[var(--coral)]" /> {profile?.streak_days ?? 0}d
            </div>
            <div className="text-[#767884] text-[11px] font-semibold mt-1">Streak +1</div>
          </div>
        </div>

        <div className="flex flex-col gap-3 mt-8">
          <button onClick={() => nav('/', { replace: true })} className="w-full font-head font-extrabold text-[16px] bg-[var(--accent)] text-[var(--accent-ink)] py-[15px] rounded-[15px] flex items-center justify-center gap-2" style={{ boxShadow: 'var(--glow)' }}>
            Next task <ArrowRight width={18} height={18} />
          </button>
          <button onClick={() => nav('/wallet')} className="text-[#9A9CA8] text-[14px] font-bold">View wallet</button>
        </div>
      </div>
    </CenteredPage>
  )
}
