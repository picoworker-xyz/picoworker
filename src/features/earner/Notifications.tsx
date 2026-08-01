import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../../lib/store'
import { usd, timeAgo, REFERRAL_JOIN_BONUS } from '../../lib/format'
import type { LedgerEntry } from '../../lib/types'
import { Page } from '../../components/Page'
import { ArrowDown, ArrowUp, Bell, Flame, Globe, User } from '../../components/icons'
import { fetchOfferActivity, type OfferActivity } from '../../lib/lootably'

export type Note = { id: string; icon: React.ReactNode; tint: string; title: string; sub: string; at: number }

// Shared notification feed, used by both the full page and the dropdown bell.
export function useNotifications(): Note[] {
  const { profile, ledgerFor, referralsFor } = useStore()
  // Offer conversions the provider has not settled sit outside the ledger, so a
  // worker who completed a goal saw nothing at all and assumed it was lost.
  // They belong here rather than only on the offers page: this is where someone
  // looks when they expect money and cannot find it.
  const [activity, setActivity] = useState<OfferActivity[]>([])
  useEffect(() => {
    let alive = true
    void fetchOfferActivity().then((r) => { if (alive) setActivity(r) })
    return () => { alive = false }
  }, [profile?.id])

  return useMemo(() => {
    if (!profile) return []
    const notes: Note[] = []
    // Revenue shares are shown individually, one notification per share row.
    // Note these land once per platform-wide completion, so a recipient's feed
    // grows with total platform volume rather than their own activity. If it
    // becomes unreadable, group by day here rather than dropping the rows.
    for (const l of ledgerFor(profile.id)) notes.push(ledgerToNote(l))
    for (const r of referralsFor(profile.id)) {
      if (r.status !== 'joined' && r.status !== 'active') continue
      notes.push({
        id: `ref-${r.id}`,
        icon: <User width={18} height={18} className="text-[var(--violet)]" />,
        tint: 'rgba(139,108,255,.14)',
        title: `${r.display_name} joined with your code`,
        // Mirrors the join_bonus in supabase/bonuses.sql. The referral_bonus
        // ledger row carries the real amount; this line is the summary.
        sub: `You earned ${usd(REFERRAL_JOIN_BONUS, { sign: true })}`,
        at: +new Date(r.created_at),
      })
    }
    if (profile.streak_days >= 5) {
      notes.push({
        id: 'streak',
        icon: <Flame width={16} height={18} className="text-[var(--coral)]" />,
        tint: 'rgba(255,107,90,.14)',
        title: `${profile.streak_days}-day streak unlocked!`,
        sub: 'Keep it going for bonus rewards',
        at: Date.now() - 86_400_000,
      })
    }
    for (const a of activity) {
      const rejected = a.state === 'rejected'
      notes.push({
        id: `offer-${a.state}-${a.offer_name}-${a.happened_at}`,
        icon: <Globe width={17} height={17} className={rejected ? 'text-[var(--coral)]' : 'text-[#D99832]'} />,
        tint: rejected ? 'rgba(255,107,90,.14)' : 'rgba(242,163,60,.16)',
        title: rejected
          ? `${a.offer_name} was not approved`
          : `${a.offer_name} is being checked`,
        sub: rejected
          ? 'The provider did not confirm this completion'
          : `${usd(a.amount)} pending · credited once the provider confirms`,
        at: +new Date(a.happened_at),
      })
    }
    return notes.sort((a, b) => b.at - a.at)
  }, [profile, ledgerFor, referralsFor, activity])
}

export function Notifications() {
  const { profile } = useStore()
  const notes = useNotifications()
  if (!profile) return null

  const today = notes.filter((n) => Date.now() - n.at < 86_400_000)
  const earlier = notes.filter((n) => Date.now() - n.at >= 86_400_000)

  return (
    <Page
      actions={<button className="text-[var(--accent-strong)] text-[13px] font-extrabold">Mark all read</button>}
    >
      {notes.length === 0 ? (
        <Empty />
      ) : (
        // mx-auto is load-bearing: Page's `narrow` prop cannot centre this
        // because .app-container is unlayered CSS and outranks Tailwind's
        // layered max-w utility, so its 1180px max-width always wins.
        <div className="max-w-[680px] mx-auto flex flex-col gap-6">
          {today.length > 0 && <Group label="Today" notes={today} />}
          {earlier.length > 0 && <Group label="Earlier" notes={earlier} />}
        </div>
      )}
    </Page>
  )
}

function Group({ label, notes }: { label: string; notes: Note[] }) {
  return (
    <div>
      <div className="text-[var(--ink-4)] text-[12px] font-bold uppercase tracking-[.08em] mb-3">{label}</div>
      <div className="rounded-[var(--r)] bg-[var(--card)] border border-[var(--line)] overflow-hidden">
        {notes.map((n, i) => (
          <div key={n.id} className={`flex items-center gap-3 px-5 py-4 ${i === 0 ? '' : 'border-t border-[var(--line)]'}`}>
            <div className="w-10 h-10 flex-none rounded-[12px] flex items-center justify-center" style={{ background: n.tint }}>
              {n.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[var(--ink)] text-[14px] font-bold">{n.title}</div>
              <div className="text-[var(--ink-4)] text-[12px] font-semibold mt-[1px]">{n.sub}</div>
            </div>
            <div className="text-[var(--ink-5)] text-[11px] font-semibold whitespace-nowrap">{timeAgo(new Date(n.at).toISOString())}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ledgerToNote(l: LedgerEntry): Note {
  const positive = l.amount > 0
  const map: Record<string, { title: string }> = {
    task_reward: { title: `Payment received · ${usd(l.amount, { sign: true })}` },
    offer_reward: { title: `Offer reward · ${usd(l.amount, { sign: true })}` },
    withdrawal: { title: `Withdrawal sent · ${usd(l.amount, { sign: true })}` },
    deposit: { title: `Deposit · ${usd(l.amount, { sign: true })}` },
    welcome_bonus: { title: `Bonus · ${usd(l.amount, { sign: true })}` },
    referral_bonus: { title: `Referral bonus · ${usd(l.amount, { sign: true })}` },
    team_share: { title: `Team share · ${usd(l.amount, { sign: true })}` },
    development_share: { title: `Development share · ${usd(l.amount, { sign: true })}` },
    escrow_hold: { title: l.title },
    escrow_release: { title: l.title },
  }
  return {
    id: l.id,
    icon: positive ? <ArrowUp width={17} height={17} className="text-[var(--green)]" /> : <ArrowDown width={17} height={17} className="text-[var(--ink-2)]" />,
    tint: positive ? 'rgba(68,209,122,.14)' : 'rgba(255,255,255,.06)',
    title: map[l.type]?.title ?? l.title,
    sub: l.title,
    at: +new Date(l.created_at),
  }
}

function Empty() {
  return (
    <div className="max-w-[680px] mx-auto text-center py-16 rounded-[var(--r)] border border-[var(--line)] bg-[var(--card)]">
      <Bell width={28} height={28} className="text-[var(--ink-5)] mx-auto" />
      <div className="text-[var(--ink)] text-[15px] font-bold mt-3">You're all caught up</div>
      <div className="text-[var(--ink-4)] text-[13px] font-semibold mt-1">Notifications about payments and tasks show up here.</div>
    </div>
  )
}
