import { useState } from 'react'
import { useStore } from '../../lib/store'
import { usd, REFERRAL_SHARE_PCT } from '../../lib/format'
import { Page } from '../../components/Page'
import { Avatar } from '../../components/ui'

export function Refer() {
  const { profile, referralsFor } = useStore()
  const [copied, setCopied] = useState(false)
  if (!profile) return null

  const crew = referralsFor(profile.id)
  const earnings = crew.reduce((s, r) => s + r.earnings, 0)
  const link = `picoworker.xyz/r/${profile.referral_code}`

  const fullLink = `https://${link}`
  const msg = `Join PicoWorker and get paid in USDC for tiny tasks. Use my link: ${fullLink}`

  function copy() {
    navigator.clipboard?.writeText(fullLink).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  function whatsapp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }
  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title: 'PicoWorker', text: msg, url: fullLink }) } catch { /* cancelled */ }
    } else copy()
  }

  return (
    <Page>
      <div className="flex flex-col gap-4">
        {/* invite */}
        <div
          className="rounded-[var(--r)] p-6 border border-[rgba(46,224,110,.16)]"
          style={{ background: 'linear-gradient(150deg,var(--card-2),var(--bg))', boxShadow: 'var(--glow)' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="text-[var(--ink)] text-[20px] font-extrabold font-head">Earn {REFERRAL_SHARE_PCT}% forever</div>
              <div className="text-[var(--ink-3)] text-[14px] font-semibold mt-2 leading-[1.5] max-w-[460px]">
                Get <span className="text-[var(--accent-strong)] font-bold">{REFERRAL_SHARE_PCT}%</span> of everything your friends earn,
                forever. The more they earn, the more you do.
              </div>
            </div>
            <div className="flex gap-6">
              <div>
                <div className="font-head text-[24px] font-extrabold text-[var(--accent-strong)]">{usd(earnings)}</div>
                <div className="text-[var(--ink-4)] text-[11px] font-semibold mt-[2px]">Referral earnings</div>
              </div>
              <div>
                <div className="font-head text-[24px] font-extrabold text-[var(--ink)]">{crew.length}</div>
                <div className="text-[var(--ink-4)] text-[11px] font-semibold mt-[2px]">Friends joined</div>
              </div>
            </div>
          </div>

          <div className="text-[var(--ink-4)] text-[12px] font-bold uppercase tracking-[.07em] mt-6 mb-2">Your invite link</div>
            <div className="flex items-center gap-2 rounded-[14px] bg-[var(--fill)] border border-[var(--line)] p-2 pl-4">
              <div className="flex-1 text-[var(--ink-2)] text-[14px] font-bold truncate font-head">
                picoworker.xyz/r/<span className="text-[var(--accent-strong)]">{profile.referral_code}</span>
              </div>
              <button onClick={copy} className="px-4 py-[10px] rounded-[11px] bg-[var(--accent)] text-[var(--accent-ink)] text-[13px] font-extrabold font-head">
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={whatsapp} className="flex-1 py-[12px] rounded-[13px] bg-[#25D366]/15 text-[#25D366] text-[14px] font-extrabold">WhatsApp</button>
              <button onClick={share} className="flex-1 py-[12px] rounded-[13px] bg-[var(--fill)] text-[var(--ink)] text-[14px] font-extrabold">Share link</button>
            </div>
          </div>

          {/* crew */}
          <div className="rounded-[var(--r)] bg-[var(--card)] border border-[var(--line)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--line)] flex items-center justify-between">
              <span className="text-[var(--ink)] text-[15px] font-extrabold font-head">Your crew</span>
              <span className="text-[var(--ink-4)] text-[13px] font-semibold">{crew.length} friends</span>
            </div>
            {crew.length === 0 ? (
              <div className="px-5 py-10 text-center text-[var(--ink-4)] text-[13.5px] font-semibold">
                No friends yet. Share your link and you'll earn 5% of whatever they make.
              </div>
            ) : (
              crew.map((r, i) => (
                <div key={r.id} className={`flex items-center gap-3 px-5 py-[14px] ${i === 0 ? '' : 'border-t border-[var(--line)]'}`}>
                  <Avatar name={r.display_name} size={38} gradient="linear-gradient(135deg,#5B8DEF,#8B6CFF)" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[var(--ink)] text-[14px] font-bold truncate">{r.display_name}</div>
                    <div className="text-[var(--ink-4)] text-[12px] font-semibold mt-[1px]">{r.status === 'active' ? `Active · ${r.tasks} tasks` : 'Joined · no tasks yet'}</div>
                  </div>
                  <div className="font-head text-[14px] font-extrabold text-[var(--green)]">{usd(r.earnings, { sign: true })}</div>
                </div>
              ))
            )}
          </div>
      </div>
    </Page>
  )
}
