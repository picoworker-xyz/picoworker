import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { Page } from '../../components/Page'
import { TaskRow } from '../../components/blocks'
import { Button, Chip } from '../../components/ui'
import { WhatsAppJoin } from '../../components/WhatsAppJoin'
import { ArrowRight, Bell, Check, ExternalLink, Globe } from '../../components/icons'
import { usd } from '../../lib/format'
import {
  detectTaskwallDevice,
  requestTaskwallOffers,
  type TaskwallOffersState,
} from '../../lib/taskwall'

const CATS = ['All', 'Social', 'Surveys', 'Apps', 'Ads', 'Watch']

export function EarnFeed() {
  const { profile, liveTasks } = useStore()
  const [cat, setCat] = useState('All')

  const tasks = liveTasks()
  const filtered = useMemo(() => (cat === 'All' ? tasks : tasks.filter((t) => t.category === cat)), [tasks, cat])

  if (!profile) return null

  return (
    <Page title={`Welcome back, ${profile.display_name}`} subtitle="Pick a task and get paid in USDC.">
      <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar">
        {CATS.map((c) => (
          <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Chip>
        ))}
      </div>

      <div className="mb-5"><WhatsAppJoin /></div>

      <div className="flex items-center justify-between mb-4">
        <div className="text-[var(--ink)] text-[18px] font-extrabold font-head">{cat === 'All' ? 'Hot right now' : cat}</div>
        <div className="text-[var(--ink-4)] text-[13px] font-semibold">{filtered.length} tasks</div>
      </div>

      {filtered.length === 0 && cat !== 'All' ? (
        <AllCaughtUp />
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((t) => <TaskRow key={t.id} task={t} />)}
        </div>
      ) : (
        <div className="rounded-[16px] border border-[var(--line)] bg-[var(--card)] px-4 py-3 text-[13px] font-semibold text-[var(--ink-3)]">
          New PicoWorker tasks are coming soon. You can start a TaskWall offer below right now.
        </div>
      )}

      {cat === 'All' && <TaskwallEarnSection />}
    </Page>
  )
}

function TaskwallEarnSection() {
  const nav = useNavigate()
  const [state, setState] = useState<TaskwallOffersState>({ status: 'loading' })
  const device = useMemo(() => detectTaskwallDevice(), [])

  const load = useCallback(async () => {
    setState({ status: 'loading' })
    setState(await requestTaskwallOffers(device, { force: true }))
  }, [device])

  useEffect(() => {
    let active = true
    void requestTaskwallOffers(device).then((result) => {
      if (active) setState(result)
    })
    return () => {
      active = false
    }
  }, [device])

  if (state.status === 'ready' && state.offers.length === 0) return null

  return (
    <section className="mt-7">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-head text-[18px] font-extrabold text-[var(--ink)]">
            <Globe width={19} height={19} className="text-[var(--accent-strong)]" /> TaskWall offers
          </div>
          <div className="mt-1 text-[12px] font-semibold text-[var(--ink-4)]">
            {state.status === 'ready' && state.country ? `${state.country} · ` : ''}{device} compatible
          </div>
        </div>
        <button onClick={() => nav('/offers/taskwall')} className="flex items-center gap-1 text-[12px] font-extrabold text-[var(--accent-strong)]">
          View all <ArrowRight width={14} height={14} />
        </button>
      </div>

      {state.status === 'loading' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-[155px] animate-pulse rounded-[18px] border border-[var(--line)] bg-[var(--card)]" />
          ))}
        </div>
      )}

      {state.status === 'error' && (
        <div className="rounded-[16px] border border-[rgba(255,107,90,.2)] bg-[rgba(255,107,90,.06)] p-4">
          <div className="text-[13px] font-bold text-[var(--ink-2)]">TaskWall offers could not be loaded.</div>
          <button onClick={() => void load()} className="mt-2 text-[12px] font-extrabold text-[var(--accent-strong)]">Try again</button>
        </div>
      )}

      {state.status === 'ready' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {state.offers.slice(0, 6).map((offer) => (
            <article key={offer.offerId} className="flex min-h-[155px] flex-col rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-4" style={{ boxShadow: 'var(--shadow)' }}>
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 flex-none items-center justify-center overflow-hidden rounded-[12px] bg-[var(--fill)]">
                  {offer.icon ? (
                    <img src={offer.icon} alt="" className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                  ) : (
                    <Globe width={20} height={20} className="text-[var(--accent-strong)]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 font-head text-[13.5px] font-extrabold leading-[1.3] text-[var(--ink)]">{offer.title}</h3>
                  <div className="mt-1 text-[13px] font-extrabold text-[var(--green)]">{offer.reward > 0 ? usd(offer.reward) : 'Variable reward'}</div>
                </div>
              </div>
              <Button block className="mt-auto h-[38px] text-[12px]" onClick={() => window.open(offer.link, '_blank', 'noopener,noreferrer')}>
                Start offer <ExternalLink width={14} height={14} />
              </Button>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function AllCaughtUp() {
  const nav = useNavigate()
  return (
    <div className="rounded-[20px] border border-[var(--line)] bg-[var(--card)] p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-[rgba(46,224,110,.12)] border border-[rgba(46,224,110,.3)] flex items-center justify-center mx-auto">
        <Check width={30} height={30} className="text-[var(--accent-strong)]" />
      </div>
      <div className="font-head font-bold text-[22px] text-[var(--ink)] mt-5">You're all caught up!</div>
      <div className="text-[var(--ink-3)] text-[14px] font-semibold mt-2 leading-[1.5] max-w-[420px] mx-auto">
        You've done every task for now. Fresh ones drop every few hours.
      </div>
      <div className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-full bg-[var(--fill)] border border-[var(--line-2)]">
        <span className="w-2 h-2 rounded-full bg-[var(--accent)]" style={{ animation: 'pico-pulse 1.8s infinite' }} />
        <span className="text-[var(--ink-2)] text-[13px] font-bold">Next batch in ~1h 42m</span>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
        <button onClick={() => nav('/notifications')} className="font-head font-extrabold text-[14px] bg-[var(--accent)] text-[var(--accent-ink)] px-5 py-3 rounded-[13px] flex items-center justify-center gap-2">
          <Bell width={16} height={16} /> Notify me when live
        </button>
        <button onClick={() => nav('/refer')} className="font-head font-extrabold text-[14px] bg-[var(--fill)] text-[var(--ink)] border border-[var(--line-2)] px-5 py-3 rounded-[13px]">
          Invite a friend, earn 10%
        </button>
      </div>
    </div>
  )
}
