import { useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { usd } from '../../lib/format'
import { Page } from '../../components/Page'
import { ArrowRight, Bolt, Check, Home } from '../../components/icons'

export function SwitchAccount() {
  const nav = useNavigate()
  const { profile, wallet, switchMode } = useStore()
  if (!profile || !wallet) return null

  return (
    <Page title="Switch account" subtitle="One login, two ways to use it." back narrow>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* earner */}
        <div className="rounded-[var(--r)] p-6 bg-[#15161C] border border-[rgba(194,249,77,.25)] relative">
          <span className="absolute top-4 right-4 text-[10px] font-extrabold text-[var(--accent-ink)] bg-[var(--accent)] px-2 py-1 rounded-full">CURRENT</span>
          <div className="w-12 h-12 rounded-[14px] bg-[var(--accent)] flex items-center justify-center mb-4"><Bolt width={24} height={24} className="text-[var(--accent-ink)]" /></div>
          <div className="text-white text-[18px] font-extrabold font-head">Earner</div>
          <div className="text-[#8A8C98] text-[13px] font-semibold mt-1">Do tasks · earn USDC</div>
          <div className="mt-4 pt-4 border-t border-white/7 flex items-center justify-between">
            <span className="text-[#9A9CA8] text-[13px] font-semibold">Wallet balance</span>
            <span className="font-head text-[16px] font-extrabold text-white">{usd(wallet.earner_balance)}</span>
          </div>
        </div>

        {/* business */}
        <div className="rounded-[var(--r)] p-6 border border-[rgba(139,108,255,.3)]" style={{ background: 'linear-gradient(135deg,rgba(139,108,255,.16),rgba(139,108,255,.04))' }}>
          <div className="w-12 h-12 rounded-[14px] bg-[#8B6CFF] flex items-center justify-center mb-4"><Home width={24} height={24} className="text-white" /></div>
          <div className="text-white text-[18px] font-extrabold font-head">Business</div>
          <div className="text-[#A9ABB6] text-[13px] font-semibold mt-1">Post tasks · grow fast</div>
          <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-white/7">
            {['Real verified results', 'Pay per completion', 'Live analytics'].map((p) => (
              <div key={p} className="flex items-center gap-2 text-[#D9DAE2] text-[13px] font-semibold"><Check width={15} height={15} className="text-[#8B6CFF]" /> {p}</div>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={() => { if (profile.mode !== 'business') switchMode(); nav('/business', { replace: true }) }}
        className="w-full mt-6 font-head font-extrabold text-[16px] bg-[#8B6CFF] text-white py-[16px] rounded-[16px] flex items-center justify-center gap-2"
        style={{ boxShadow: '0 16px 44px -14px rgba(139,108,255,.6)' }}
      >
        Switch to Business <ArrowRight width={18} height={18} className="text-white" />
      </button>
      <div className="text-center text-[#767884] text-[13px] font-semibold mt-3">Switch back anytime from your profile</div>
    </Page>
  )
}
