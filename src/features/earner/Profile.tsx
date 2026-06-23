import { useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { usd, shortAddr } from '../../lib/format'
import { Page } from '../../components/Page'
import { Avatar, Pill } from '../../components/ui'
import { ArrowRight, Bell, Chat, Check, Shield, Trophy, Wallet as WalletIcon } from '../../components/icons'

export function Profile() {
  const nav = useNavigate()
  const { profile, wallet, signOut, switchMode, referralsFor } = useStore()
  if (!profile || !wallet) return null
  const referralCount = referralsFor(profile.id).length

  return (
    <Page title="Profile & settings">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* identity card */}
        <aside className="flex flex-col gap-4">
          <div className="rounded-[var(--r)] p-6 bg-[#15161C] border border-white/6 text-center">
            <div className="flex justify-center mb-3"><Avatar name={profile.display_name} size={72} /></div>
            <div className="flex items-center justify-center gap-2">
              <div className="text-white text-[20px] font-extrabold font-head">{profile.business_name ?? profile.display_name}</div>
              <Pill>{profile.level}</Pill>
            </div>
            <div className="text-[#767884] text-[13px] font-semibold mt-1">Member since {profile.member_since}</div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Stat value={usd(wallet.lifetime_earned)} label="Earned" />
            <Stat value={String(profile.tasks_done)} label="Tasks" />
            <Stat value={String(referralCount)} label="Referrals" />
          </div>
          <button onClick={() => { switchMode(); nav(profile.mode === 'earner' ? '/business' : '/', { replace: true }) }} className="w-full font-head font-extrabold text-[15px] bg-white/6 text-white py-[14px] rounded-[14px] border border-white/10 hover:bg-white/10">
            Switch to {profile.mode === 'earner' ? 'Business' : 'Earner'}
          </button>
          <button onClick={() => { signOut(); nav('/login', { replace: true }) }} className="w-full text-[var(--coral)] text-[14px] font-bold py-2">Log out</button>
        </aside>

        {/* settings list */}
        <div className="lg:col-span-2 flex flex-col gap-2">
          <Item icon={<WalletIcon width={18} height={18} className="text-[var(--accent)]" />} label="Payout wallet" value={`${shortAddr(profile.payout_wallet)} · Solana`} onClick={() => nav('/wallet/withdraw')} />
          <Item icon={<Bell width={18} height={18} className="text-[#C2C4CE]" />} label="Notifications" value="Payments, tasks & rewards" onClick={() => nav('/notifications')} />
          {profile.mode === 'business' ? (
            <Item icon={<Check width={18} height={18} className="text-[var(--accent)]" />} label="Review queue" value="Approve manual proofs" onClick={() => nav('/business/review')} />
          ) : (
            <Item icon={<Trophy width={18} height={18} className="text-[var(--accent)]" />} label="Leaderboard" value="See top earners" onClick={() => nav('/leaderboard')} />
          )}
          <Item
            icon={<Shield width={18} height={18} className="text-[var(--green)]" />}
            label="Verify identity"
            value={profile.identity_verified ? 'Verified' : 'Unlock instant withdrawals'}
            tag={profile.identity_verified}
            onClick={profile.identity_verified ? undefined : () => nav('/verify')}
          />
          <Item label="Refer & earn" value="Invite friends" onClick={() => nav('/refer')} />
          <Item icon={<Chat width={18} height={18} className="text-[#C2C4CE]" />} label="Help & support" value="Chat with us" onClick={() => nav('/support')} />
        </div>
      </div>
    </Page>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[16px] p-4 bg-[#15161C] border border-white/6 text-center">
      <div className="font-head text-[16px] font-extrabold text-white">{value}</div>
      <div className="text-[#767884] text-[11px] font-semibold mt-1">{label}</div>
    </div>
  )
}

function Item({ icon, label, value, onClick, tag }: { icon?: React.ReactNode; label: string; value: string; onClick?: () => void; tag?: boolean }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-4 rounded-[14px] bg-[#15161C] border border-white/6 text-left hover:bg-white/[.06]">
      {icon && <div className="w-9 h-9 rounded-[11px] bg-white/5 flex items-center justify-center flex-none">{icon}</div>}
      <div className="flex-1">
        <div className="text-white text-[14px] font-bold">{label}</div>
        {value && <div className="text-[#767884] text-[12px] font-semibold mt-[1px]">{value}</div>}
      </div>
      {tag ? (
        <span className="flex items-center gap-1 text-[var(--green)] text-[12px] font-extrabold"><Check width={14} height={14} /> VERIFIED</span>
      ) : (
        <ArrowRight width={16} height={16} className="text-[#5E606C]" />
      )}
    </button>
  )
}
