import { supabase } from './supabase'
import { usd } from './format'

export type KiwiwallOffer = {
  offerId: string
  title: string
  description: string
  kpi: string
  category: string
  logo: string
  payout: number
  rewardUnits: number
  /** What the worker is actually credited, so the card matches the wallet. */
  rewardUsd: number
}

export type KiwiwallState =
  | { status: 'loading' }
  | { status: 'ready'; offers: KiwiwallOffer[]; country: string | null; degraded: boolean }
  | { status: 'error'; message: string; degraded?: boolean }

export type KiwiwallDevice = 'android' | 'ios' | 'desktop'

export function detectKiwiwallDevice(): KiwiwallDevice {
  const agent = navigator.userAgent.toLowerCase()
  if (agent.includes('android')) return 'android'
  if (/iphone|ipad|ipod/.test(agent)) return 'ios'
  return 'desktop'
}

export function kiwiwallRewardLabel(offer: KiwiwallOffer): string {
  return usd(offer.rewardUsd)
}

// KiwiWall's API being unreachable is not a per-request accident: it takes the
// whole wall out, because their offers cannot be opened without a server-minted
// entry link. The last known state is kept here so OfferTabs can drop the tab on
// its very first render, before any fetch resolves, rather than showing workers
// a wall of cards that cannot open.
//
// It expires so recovery is automatic. Nothing here is authoritative; it is a
// hint from the last answer we got, and the next request overwrites it.
const HEALTH_KEY = 'picoworker:kiwiwall:health:v1'
const HEALTH_TTL_MS = 30 * 60 * 1000

export function markKiwiwallHealth(down: boolean) {
  try {
    if (down) localStorage.setItem(HEALTH_KEY, String(Date.now()))
    else localStorage.removeItem(HEALTH_KEY)
  } catch { /* a missing hint just means the tab stays visible */ }
}

/** True when the provider was unreachable recently enough to still assume so. */
export function kiwiwallLooksDown(): boolean {
  try {
    const at = Number(localStorage.getItem(HEALTH_KEY))
    if (!Number.isFinite(at) || at <= 0) return false
    if (Date.now() - at < HEALTH_TTL_MS) return true
    localStorage.removeItem(HEALTH_KEY)
    return false
  } catch {
    return false
  }
}

const CACHE_TTL_MS = 15 * 60 * 1000
// v2: entries written before the degraded flag existed have no health
// information, and a cache hit skips the request that would set it, so an
// outage would stay invisible for the life of the old cache.
const CACHE_PREFIX = 'picoworker:kiwiwall:v2'
type Ready = Extract<KiwiwallState, { status: 'ready' }>
const memory = new Map<string, { savedAt: number; state: Ready }>()
const inFlight = new Map<string, Promise<KiwiwallState>>()

function readCache(key: string): Ready | null {
  const m = memory.get(key)
  if (m && Date.now() - m.savedAt < CACHE_TTL_MS) return m.state
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const c = JSON.parse(raw) as { savedAt: number; state: Ready }
    if (c?.state?.status !== 'ready' || Date.now() - c.savedAt >= CACHE_TTL_MS) {
      sessionStorage.removeItem(key)
      return null
    }
    memory.set(key, c)
    return c.state
  } catch {
    return null
  }
}

function saveCache(key: string, state: Ready) {
  const entry = { savedAt: Date.now(), state }
  memory.set(key, entry)
  try { sessionStorage.setItem(key, JSON.stringify(entry)) } catch { /* memory cache still helps */ }
}

export async function requestKiwiwallOffers(
  os: KiwiwallDevice,
  options: { force?: boolean } = {},
): Promise<KiwiwallState> {
  if (!supabase) return { status: 'error', message: 'Worldwide offers require the production account service.' }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user.id) return { status: 'error', message: 'Please sign in to load offers.' }

  const key = `${CACHE_PREFIX}:${session.user.id}:${os}`
  if (!options.force) {
    const hit = readCache(key)
    if (hit) return hit
    const pending = inFlight.get(key)
    if (pending) return pending
  }

  const request = (async (): Promise<KiwiwallState> => {
    const { data, error } = await supabase.functions.invoke('kiwiwall-offers', {
      body: { os, force: options.force === true },
    })
    const degraded = data?.degraded === true
    markKiwiwallHealth(degraded)

    if (error || data?.status !== 'success' || !Array.isArray(data?.offers)) {
      return {
        status: 'error',
        message: data?.error ?? error?.message ?? 'Could not load offers.',
        degraded,
      }
    }
    const ready: Ready = {
      status: 'ready',
      offers: data.offers as KiwiwallOffer[],
      country: typeof data.country === 'string' ? data.country : null,
      degraded,
    }
    // A degraded answer is deliberately not cached: it is stale inventory that
    // cannot be opened, and caching it would keep the outage on screen for the
    // full TTL after the provider comes back.
    if (!degraded) saveCache(key, ready)
    return ready
  })()

  inFlight.set(key, request)
  try { return await request } finally {
    if (inFlight.get(key) === request) inFlight.delete(key)
  }
}

/**
 * Mints a signed entry link and returns it. KiwiWall requires every click to be
 * minted server-side with the real visitor context, so there is no way to build
 * this URL in the browser.
 */
export async function openKiwiwallOffer(offer: KiwiwallOffer, country: string | null): Promise<string> {
  if (!supabase) throw new Error('Offers require the production account service.')
  const { data, error } = await supabase.functions.invoke('kiwiwall-entry', {
    body: {
      offerId: offer.offerId,
      country,
      title: offer.title,
      payout: offer.payout,
      rewardUnits: offer.rewardUnits,
    },
  })
  if (error || data?.status !== 'success' || !data?.entryUrl) {
    // A failed mint is the strongest health signal there is, since minting is
    // the one thing that cannot be served from cache. 429 is throttling rather
    // than an outage and must not take the tab down.
    const code = typeof data?.code === 'string' ? data.code : ''
    if (code === 'kw_network' || code === 'kw_403' || /^kw_5\d\d$/.test(code)) {
      markKiwiwallHealth(true)
    }
    throw new Error(data?.error ?? error?.message ?? 'Could not open this offer.')
  }
  markKiwiwallHealth(false)
  return data.entryUrl as string
}
