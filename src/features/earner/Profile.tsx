import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { supabase } from '../../lib/supabase'
import { usd, shortAddr } from '../../lib/format'
import { emailError } from '../../lib/validate'
import { Page } from '../../components/Page'
import { Avatar, Pill } from '../../components/ui'
import { ArrowRight, Bell, Chat, Check, Shield, Trophy, Wallet as WalletIcon } from '../../components/icons'

export function Profile() {
  const nav = useNavigate()
  const { profile, wallet, signOut, switchMode, referralsFor, refresh } = useStore()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [nameMsg, setNameMsg] = useState('')
  const [emailMsg, setEmailMsg] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)

  useEffect(() => {
    if (profile) setName(profile.business_name ?? profile.display_name)
    supabase?.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''))
  }, [profile])

  if (!profile || !wallet) return null
  const referralCount = referralsFor(profile.id).length

  async function saveName() {
    setNameMsg('')
    if (!name.trim()) return setNameMsg('Enter a name.')
    setSavingName(true)
    const patch: Record<string, string> = { display_name: name.trim() }
    if (profile!.mode === 'business') patch.business_name = name.trim()
    const { error } = await supabase!.from('profiles').update(patch).eq('id', profile!.id)
    setSavingName(false)
    if (error) setNameMsg(error.message)
    else { await refresh(); setNameMsg('Saved.') }
  }

  async function saveEmail() {
    setEmailMsg('')
    const ee = emailError(email)
    if (ee) return setEmailMsg(ee)
    setSavingEmail(true)
    const { error } = await supabase!.auth.updateUser({ email: email.trim() })
    setSavingEmail(false)
    if (error) setEmailMsg(error.message)
    else setEmailMsg('Confirmation sent to the new address. Click the link there to finish the change.')
  }

  return (
    <Page title="Profile & settings">
      {/* profile header on top */}
      <div className="rounded-[var(--r)] p-6 bg-[#15161C] border border-white/6">
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          <Avatar name={profile.business_name ?? profile.display_name} size={72} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white text-[22px] font-extrabold font-head truncate">{profile.business_name ?? profile.display_name}</span>
              <Pill>{profile.level}</Pill>
            </div>
            <div className="text-[#767884] text-[13px] font-semibold mt-1">Member since {profile.member_since}</div>
          </div>
          <div className="grid grid-cols-3 gap-3 md:w-[380px]">
            <Stat value={usd(wallet.lifetime_earned)} label="Earned" />
            <Stat value={String(profile.tasks_done)} label="Tasks" />
            <Stat value={String(referralCount)} label="Referrals" />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mt-5">
          <button onClick={() => { switchMode(); nav(profile.mode === 'earner' ? '/business' : '/', { replace: true }) }} className="font-head font-extrabold text-[14px] bg-white/6 text-white px-5 py-3 rounded-[12px] border border-white/10 hover:bg-white/10">
            Switch to {profile.mode === 'earner' ? 'Business' : 'Earner'}
          </button>
          <button onClick={() => { signOut(); nav('/login', { replace: true }) }} className="font-head font-extrabold text-[14px] text-[var(--coral)] px-5 py-3 rounded-[12px] border border-[rgba(255,107,90,.25)] bg-[rgba(255,107,90,.06)]">
            Log out
          </button>
        </div>
      </div>

      {/* account editing + settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="rounded-[var(--r)] p-6 bg-[#15161C] border border-white/6">
          <div className="text-white text-[16px] font-extrabold font-head mb-4">Account</div>

          <Label>{profile.mode === 'business' ? 'Business name' : 'Display name'}</Label>
          <div className="flex gap-2 mb-1">
            <input value={name} onChange={(e) => setName(e.target.value)} className="flex-1 bg-white/4 border border-white/10 rounded-[12px] px-4 py-[12px] text-white text-[15px] font-semibold outline-none focus:border-[var(--accent)]/60" />
            <button onClick={saveName} disabled={savingName} className="px-4 rounded-[12px] bg-[var(--accent)] text-[var(--accent-ink)] text-[13px] font-extrabold font-head disabled:opacity-50">{savingName ? '...' : 'Save'}</button>
          </div>
          {nameMsg && <div className={`text-[12px] font-semibold mb-3 ${nameMsg === 'Saved.' ? 'text-[var(--green)]' : 'text-[var(--coral)]'}`}>{nameMsg}</div>}

          <Label className="mt-4">Email</Label>
          <div className="flex gap-2 mb-1">
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoCapitalize="none" className="flex-1 bg-white/4 border border-white/10 rounded-[12px] px-4 py-[12px] text-white text-[15px] font-semibold outline-none focus:border-[var(--accent)]/60" />
            <button onClick={saveEmail} disabled={savingEmail} className="px-4 rounded-[12px] bg-white/6 text-white text-[13px] font-extrabold font-head border border-white/10 disabled:opacity-50">{savingEmail ? '...' : 'Update'}</button>
          </div>
          {emailMsg && <div className={`text-[12px] font-semibold ${emailMsg.startsWith('Confirmation') ? 'text-[var(--green)]' : 'text-[var(--coral)]'}`}>{emailMsg}</div>}
          <div className="text-[#767884] text-[11.5px] font-semibold mt-2">Changing your email sends a confirmation link to the new address.</div>
        </div>

        <div className="flex flex-col gap-2">
          <Item icon={<WalletIcon width={18} height={18} className="text-[var(--accent)]" />} label="Payout wallet" value={`${shortAddr(profile.payout_wallet)} · Solana`} onClick={() => nav('/wallet/withdraw')} />
          <Item icon={<Bell width={18} height={18} className="text-[#C2C4CE]" />} label="Notifications" value="Payments, tasks and rewards" onClick={() => nav('/notifications')} />
          {profile.mode === 'business' ? (
            <Item icon={<Check width={18} height={18} className="text-[var(--accent)]" />} label="Review queue" value="Approve manual proofs" onClick={() => nav('/business/review')} />
          ) : (
            <Item icon={<Trophy width={18} height={18} className="text-[var(--accent)]" />} label="Leaderboard" value="See top earners" onClick={() => nav('/leaderboard')} />
          )}
          <Item
            icon={<Shield width={18} height={18} className="text-[var(--green)]" />}
            label="Verify identity"
            value={profile.identity_verified ? 'Verified' : 'Currently disabled'}
            tag={profile.identity_verified}
            onClick={profile.identity_verified ? undefined : () => nav('/verify')}
          />
          <Item label="Refer and earn" value="Invite friends" onClick={() => nav('/refer')} />
          <Item icon={<Chat width={18} height={18} className="text-[#C2C4CE]" />} label="Help and support" value="Chat with us" onClick={() => nav('/support')} />
        </div>
      </div>
    </Page>
  )
}

function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`text-[#8B8D99] text-[12px] font-bold uppercase tracking-[.07em] mb-2 ${className}`}>{children}</div>
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[16px] p-4 bg-white/4 border border-white/6 text-center">
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
