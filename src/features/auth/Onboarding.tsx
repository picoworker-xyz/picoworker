import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bolt, Check, Wallet } from '../../components/icons'

const SLIDES = [
  { icon: <Bolt width={26} height={26} className="text-[var(--accent-ink)]" />, title: 'Pick a task', body: 'Follow, watch, test, survey' },
  { icon: <Check width={24} height={24} className="text-[var(--accent-ink)]" />, title: 'Do it in seconds', body: 'Most tasks auto-verify' },
  { icon: <Wallet width={24} height={24} className="text-[var(--accent-ink)]" />, title: 'Get paid instantly', body: 'USDC to any wallet' },
]

export function Onboarding() {
  const nav = useNavigate()
  const [i, setI] = useState(0)

  return (
    <div className="min-h-svh flex items-center justify-center p-6">
      <div className="w-full max-w-[480px] reveal">
        <div className="flex justify-end mb-4">
          <button onClick={() => nav('/', { replace: true })} className="text-[#9A9CA8] text-[14px] font-bold">Skip</button>
        </div>

        <div className="text-center mb-8">
          <div className="font-head font-bold text-[34px] text-white leading-[1.1] tracking-[-.02em]">
            Earn in 3 taps.<br />Tiny tasks, real money.
          </div>
          <div className="text-[#A9ABB6] text-[15px] font-semibold mt-3 leading-[1.5]">
            No skills, no fees, paid in USDC to your wallet.
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {SLIDES.map((s, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-4 p-4 rounded-[18px] border transition-colors ${
                idx <= i ? 'bg-[rgba(194,249,77,.08)] border-[rgba(194,249,77,.25)]' : 'bg-[#15161C] border-white/6'
              }`}
            >
              <div className="w-[52px] h-[52px] flex-none rounded-[15px] bg-[var(--accent)] flex items-center justify-center">{s.icon}</div>
              <div>
                <div className="text-white text-[16px] font-extrabold font-head">{s.title}</div>
                <div className="text-[#8A8C98] text-[13px] font-semibold mt-[2px]">{s.body}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-center gap-3 px-4 py-[14px] rounded-[16px] bg-[rgba(194,249,77,.1)] border border-[rgba(194,249,77,.25)]">
          <span className="font-head font-extrabold text-[var(--accent)] text-[15px]">$0.05</span>
          <span className="text-[#C7D8CB] text-[13px] font-semibold">welcome bonus on your first task</span>
        </div>

        <div className="mt-8">
          <div className="flex justify-center gap-[6px] mb-4">
            {SLIDES.map((_, idx) => (
              <span key={idx} className={`h-[6px] rounded-full transition-all ${idx === i ? 'w-6 bg-[var(--accent)]' : 'w-[6px] bg-white/15'}`} />
            ))}
          </div>
          <button
            onClick={() => (i < SLIDES.length - 1 ? setI(i + 1) : nav('/', { replace: true }))}
            className="w-full font-head font-extrabold text-[17px] bg-[var(--accent)] text-[var(--accent-ink)] py-[17px] rounded-[17px]"
            style={{ boxShadow: 'var(--glow)' }}
          >
            {i < SLIDES.length - 1 ? 'Next' : 'Start earning'}
          </button>
        </div>
      </div>
    </div>
  )
}
