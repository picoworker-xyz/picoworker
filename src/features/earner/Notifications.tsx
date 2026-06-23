import { useStore } from '../../lib/store'
import { usd, timeAgo } from '../../lib/format'
import type { LedgerEntry } from '../../lib/types'
import { Page } from '../../components/Page'
import { ArrowDown, ArrowUp, Bell, Flame, User } from '../../components/icons'

type Note = { id: string; icon: React.ReactNode; tint: string; title: string; sub: string; at: number }

export function Notifications() {
  const { profile, ledgerFor, referralsFor } = useStore()
  if (!profile) return null

  const notes: Note[] = []
  for (const l of ledgerFor(profile.id)) {
    notes.push(ledgerToNote(l))
  }
  for (const r of referralsFor(profile.id)) {
    if (r.status !== 'joined' && r.status !== 'active') continue
    notes.push({
      id: `ref-${r.id}`,
      icon: <User width={18} height={18} className="text-[var(--violet)]" />,
      tint: 'rgba(139,108,255,.14)',
      title: `${r.display_name} joined with your code`,
      sub: `You earned +$0.50`,
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
  notes.sort((a, b) => b.at - a.at)

  const today = notes.filter((n) => Date.now() - n.at < 86_400_000)
  const earlier = notes.filter((n) => Date.now() - n.at >= 86_400_000)

  return (
    <Page
      title="Notifications"
      subtitle="Payments, tasks and rewards."
      actions={<button className="text-[var(--accent)] text-[13px] font-extrabold">Mark all read</button>}
    >
      {notes.length === 0 ? (
        <Empty />
      ) : (
        <div className="max-w-[680px] flex flex-col gap-6">
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
      <div className="text-[#767884] text-[12px] font-bold uppercase tracking-[.08em] mb-3">{label}</div>
      <div className="rounded-[var(--r)] bg-[#15161C] border border-white/6 overflow-hidden">
        {notes.map((n, i) => (
          <div key={n.id} className={`flex items-center gap-3 px-5 py-4 ${i === 0 ? '' : 'border-t border-white/5'}`}>
            <div className="w-10 h-10 flex-none rounded-[12px] flex items-center justify-center" style={{ background: n.tint }}>
              {n.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-[14px] font-bold">{n.title}</div>
              <div className="text-[#767884] text-[12px] font-semibold mt-[1px]">{n.sub}</div>
            </div>
            <div className="text-[#5E606C] text-[11px] font-semibold whitespace-nowrap">{timeAgo(new Date(n.at).toISOString())}</div>
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
    withdrawal: { title: `Withdrawal sent · ${usd(l.amount, { sign: true })}` },
    deposit: { title: `Deposit · ${usd(l.amount, { sign: true })}` },
    welcome_bonus: { title: `Bonus · ${usd(l.amount, { sign: true })}` },
    referral_bonus: { title: `Referral bonus · ${usd(l.amount, { sign: true })}` },
    escrow_hold: { title: l.title },
    escrow_release: { title: l.title },
  }
  return {
    id: l.id,
    icon: positive ? <ArrowUp width={17} height={17} className="text-[var(--green)]" /> : <ArrowDown width={17} height={17} className="text-[#C2C4CE]" />,
    tint: positive ? 'rgba(68,209,122,.14)' : 'rgba(255,255,255,.06)',
    title: map[l.type]?.title ?? l.title,
    sub: l.title,
    at: +new Date(l.created_at),
  }
}

function Empty() {
  return (
    <div className="max-w-[680px] text-center py-16 rounded-[var(--r)] border border-white/6 bg-[#15161C]">
      <Bell width={28} height={28} className="text-[#5E606C] mx-auto" />
      <div className="text-white text-[15px] font-bold mt-3">You're all caught up</div>
      <div className="text-[#767884] text-[13px] font-semibold mt-1">Notifications about payments and tasks show up here.</div>
    </div>
  )
}
