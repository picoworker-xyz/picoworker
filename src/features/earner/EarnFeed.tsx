import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { REFERRAL_SHARE_PCT } from '../../lib/format'
import { countryLabel } from '../../lib/taskwall'
import {
  detectLootablyDevice,
  lootablyRewardCaption,
  lootablyRewardLabel,
  requestLootablyOffers,
  type LootablyOffer,
  type LootablyState,
} from '../../lib/lootably'
import {
  detectKiwiwallDevice,
  kiwiwallRewardLabel,
  openKiwiwallOffer,
  requestKiwiwallOffers,
  type KiwiwallOffer,
  type KiwiwallState,
} from '../../lib/kiwiwall'
import { Page } from '../../components/Page'
import { TaskRow } from '../../components/blocks'
import { Button, Chip } from '../../components/ui'
import { WhatsAppJoin } from '../../components/WhatsAppJoin'
import { ArrowRight, Bell, Check, Globe } from '../../components/icons'
import { TaskwallOfferDetails } from '../../components/TaskwallOfferDetails'
import {
  detectTaskwallDevice,
  isTaskwallProviderWall,
  isTaskwallLegacy,
  requestTaskwallOffers,
  taskwallRewardLabel,
  type TaskwallOffer,
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
    <Page>
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
          New PicoWorker tasks are coming soon. You can start an offer below right now.
        </div>
      )}

      {/* Ordered by how reliably a tap turns into a payment. Lootably is a
          direct integration, so the user id we send is the one the network
          tracks and targeting comes from the real device. The Featured wall
          goes through a reseller whose redirector rotates the downstream id on
          every click and pins every click to a single "web" device slot, which
          produces both fraud blocks and "offer unavailable" for app installs.
          It stays available, but it must not be what a worker sees first. */}
      {cat === 'All' && <LootablyEarnSection />}
      {cat === 'All' && <KiwiwallEarnSection />}
      {cat === 'All' && <TaskwallEarnSection />}
    </Page>
  )
}

function LootablyEarnSection() {
  const nav = useNavigate()
  const [state, setState] = useState<LootablyState>({ status: 'loading' })
  const device = useMemo(() => detectLootablyDevice(), [])

  useEffect(() => {
    let active = true
    void requestLootablyOffers(device).then((r) => { if (active) setState(r) })
    return () => { active = false }
  }, [device])

  // A failed wall is not worth a slot on the home feed: the worker still has
  // tasks and two other walls below.
  if (state.status !== 'ready' || state.offers.length === 0) return null

  // Lootably embeds our userID server-side, so the link is ready to open and
  // there is no mint round trip. Same-tab for the reasons in LootablyOffers.
  const open = (offer: LootablyOffer) => window.location.assign(offer.link)

  return (
    <section className="mt-7">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-head text-[18px] font-extrabold text-[var(--ink)]">
            <Globe width={19} height={19} className="text-[var(--accent-strong)]" /> Offers
          </div>
          <div className="mt-1 text-[12px] font-semibold text-[var(--ink-4)]">
            {state.country ? `${countryLabel(state.country)} · ` : ''}paid after the provider confirms
          </div>
        </div>
        <button onClick={() => nav('/offers/lootably')} className="flex items-center gap-1 text-[12px] font-extrabold text-[var(--accent-strong)]">
          View all <ArrowRight width={14} height={14} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {state.offers.slice(0, 6).map((offer) => (
          <article key={offer.offerId} className="flex min-h-[172px] flex-col rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-4" style={{ boxShadow: 'var(--shadow)' }}>
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 flex-none items-center justify-center overflow-hidden rounded-[12px] bg-[var(--fill)]">
                {offer.image ? (
                  <img src={offer.image} alt="" className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                ) : (
                  <Globe width={20} height={20} className="text-[var(--accent-strong)]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="line-clamp-2 font-head text-[13.5px] font-extrabold leading-[1.3] text-[var(--ink)]">{offer.title}</h3>
                <div className="mt-1 text-[13px] font-extrabold text-[var(--green)]">{lootablyRewardLabel(offer)}</div>
                <div className="text-[10px] font-semibold text-[var(--ink-5)]">{lootablyRewardCaption(offer)}</div>
              </div>
            </div>

            {offer.description && (
              <p className="mt-3 line-clamp-3 text-[12px] font-semibold leading-[1.5] text-[var(--ink-3)]">
                {offer.description}
              </p>
            )}

            <Button block className="mt-auto h-[38px] text-[12px]" onClick={() => open(offer)}>
              Start offer
            </Button>
          </article>
        ))}
      </div>
    </section>
  )
}

function TaskwallEarnSection() {
  const nav = useNavigate()
  const [state, setState] = useState<TaskwallOffersState>({ status: 'loading' })
  const [selectedOffer, setSelectedOffer] = useState<TaskwallOffer | null>(null)
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

  // This preview has no toggle, so the older campaigns never surface here.
  // They stay reachable behind "Show older offers" on the full offers page.
  const preview = state.status === 'ready'
    ? state.offers.filter((o) => !(isTaskwallLegacy(o) && !isTaskwallProviderWall(o) && o.events.length > 0))
    : []
  if (state.status === 'ready' && preview.length === 0) return null

  return (
    <section className="mt-7">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-head text-[18px] font-extrabold text-[var(--ink)]">
            <Globe width={19} height={19} className="text-[var(--accent-strong)]" /> Featured offers
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
          <div className="text-[13px] font-bold text-[var(--ink-2)]">Featured offers could not be loaded.</div>
          <button onClick={() => void load()} className="mt-2 text-[12px] font-extrabold text-[var(--accent-strong)]">Try again</button>
        </div>
      )}

      {state.status === 'ready' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {preview.slice(0, 6).map((offer) => (
            <article key={offer.offerId} className="flex min-h-[172px] flex-col rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-4" style={{ boxShadow: 'var(--shadow)' }}>
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
                  {isTaskwallProviderWall(offer) && <div className="mt-1 text-[9.5px] font-extrabold uppercase tracking-[.04em] text-[var(--accent-strong)]">Offerwall · requirements inside</div>}
                  <div className="mt-1 text-[13px] font-extrabold text-[var(--green)]">{taskwallRewardLabel(offer)}</div>
                </div>
              </div>

              {(offer.conversion || offer.description) && (
                <p className="mt-3 line-clamp-3 text-[12px] font-semibold leading-[1.5] text-[var(--ink-3)]">
                  {offer.conversion || offer.description}
                </p>
              )}

              <Button block className="mt-auto h-[38px] text-[12px]" onClick={() => setSelectedOffer(offer)}>
                View details
              </Button>
            </article>
          ))}
        </div>
      )}
      {selectedOffer && <TaskwallOfferDetails offer={selectedOffer} onClose={() => setSelectedOffer(null)} />}
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
          Invite a friend, earn {REFERRAL_SHARE_PCT}%
        </button>
      </div>
    </div>
  )
}

/**
 * Worldwide offers on the Earn page, alongside the featured wall.
 *
 * Deliberately not hidden behind the Offers tab: these pay several times what
 * a PicoWorker task does, so burying them costs workers real money. Shows the
 * top six by reward and links out for the rest.
 */
function KiwiwallEarnSection() {
  const nav = useNavigate()
  const [state, setState] = useState<KiwiwallState>({ status: 'loading' })
  const [opening, setOpening] = useState<string | null>(null)
  const device = useMemo(() => detectKiwiwallDevice(), [])

  useEffect(() => {
    let active = true
    void requestKiwiwallOffers(device).then((r) => { if (active) setState(r) })
    return () => { active = false }
  }, [device])

  // Stay quiet when there is nothing to show rather than rendering an empty
  // header: the section is additive to the task feed, not part of it.
  if (state.status !== 'ready' || state.offers.length === 0) return null

  async function open(offer: KiwiwallOffer) {
    setOpening(offer.offerId)
    // Same-tab navigation — see the note in KiwiwallOffers.tsx.
    try {
      const url = await openKiwiwallOffer(offer, state.status === 'ready' ? state.country : null)
      window.location.assign(url)
    } catch {
      setOpening(null)
      nav('/offers/worldwide')
    }
  }

  return (
    <section className="mt-7">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-head text-[18px] font-extrabold text-[var(--ink)]">
            <Globe width={19} height={19} className="text-[var(--accent-strong)]" /> Worldwide offers
          </div>
          <div className="mt-1 text-[12px] font-semibold text-[var(--ink-4)]">
            {state.country ? `${countryLabel(state.country)} · ` : ''}paid after the provider confirms
          </div>
        </div>
        <button onClick={() => nav('/offers/worldwide')} className="flex items-center gap-1 text-[12px] font-extrabold text-[var(--accent-strong)]">
          View all <ArrowRight width={14} height={14} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {state.offers.slice(0, 6).map((offer) => (
          <article key={offer.offerId} className="flex min-h-[172px] flex-col rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-4" style={{ boxShadow: 'var(--shadow)' }}>
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 flex-none items-center justify-center overflow-hidden rounded-[12px] bg-[var(--fill)]">
                {offer.logo ? (
                  <img src={offer.logo} alt="" className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                ) : (
                  <Globe width={20} height={20} className="text-[var(--accent-strong)]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="line-clamp-2 font-head text-[13.5px] font-extrabold leading-[1.3] text-[var(--ink)]">{offer.title}</h3>
                {offer.category && (
                  <div className="mt-1 text-[9.5px] font-extrabold uppercase tracking-[.04em] text-[var(--ink-5)]">{offer.category}</div>
                )}
                <div className="mt-1 text-[13px] font-extrabold text-[var(--green)]">{kiwiwallRewardLabel(offer)}</div>
              </div>
            </div>

            {/* What the worker actually has to do. Without it the card is a
                title and a price, which is not enough to decide on — the full
                page has shown this all along and the home strip did not. */}
            {(offer.kpi || offer.description) && (
              <p className="mt-3 line-clamp-3 text-[12px] font-semibold leading-[1.5] text-[var(--ink-3)]">
                {offer.kpi || offer.description}
              </p>
            )}

            <Button block className="mt-auto h-[38px] text-[12px]" disabled={opening === offer.offerId} onClick={() => void open(offer)}>
              {opening === offer.offerId ? 'Taking you there…' : 'Start offer'}
            </Button>
          </article>
        ))}
      </div>
    </section>
  )
}
