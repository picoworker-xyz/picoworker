import { supabase } from './supabase'
import { usd } from './format'

export type NotikOffer = {
  offerId: string
  title: string
  description: string
  details: string
  category: string
  logo: string
  /** What Notik pays PicoWorker, in USD. Kept for the admin/debug view. */
  payout: number
  /** What the wall promises in the app's virtual currency. */
  rewardCoins: number
  /** What the worker is actually credited, so the card matches the wallet. */
  rewardUsd: number
  clickUrl: string
}

export type NotikState =
  | { status: 'loading' }
  | { status: 'ready'; offers: NotikOffer[]; country: string | null }
  | { status: 'error'; message: string }

export type NotikDevice = 'android' | 'ios' | 'desktop'

export function detectNotikDevice(): NotikDevice {
  const agent = navigator.userAgent.toLowerCase()
  if (agent.includes('android')) return 'android'
  if (/iphone|ipad|ipod/.test(agent)) return 'ios'
  return 'desktop'
}

export function notikRewardLabel(offer: NotikOffer): string {
  return usd(offer.rewardUsd)
}

// The catalogue itself only moves every 15 minutes on Notik's side, but the
// per-user filtering (which offers they have already completed) does not, so
// this stays short enough that a completed offer disappears on the next visit.
const CACHE_TTL_MS = 10 * 60 * 1000
const CACHE_PREFIX = 'picoworker:notik:v1'
type Ready = Extract<NotikState, { status: 'ready' }>
const memory = new Map<string, { savedAt: number; state: Ready }>()
const inFlight = new Map<string, Promise<NotikState>>()

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

export async function requestNotikOffers(
  os: NotikDevice,
  options: { force?: boolean } = {},
): Promise<NotikState> {
  if (!supabase) return { status: 'error', message: 'Offers require the production account service.' }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user.id) return { status: 'error', message: 'Please sign in to load offers.' }

  const key = `${CACHE_PREFIX}:${session.user.id}:${os}`
  if (!options.force) {
    const hit = readCache(key)
    if (hit) return hit
    const pending = inFlight.get(key)
    if (pending) return pending
  }

  const request = (async (): Promise<NotikState> => {
    const { data, error } = await supabase.functions.invoke('notik-offers', {
      body: { os, force: options.force === true },
    })
    if (error || data?.status !== 'success' || !Array.isArray(data?.offers)) {
      return { status: 'error', message: data?.error ?? error?.message ?? 'Could not load offers.' }
    }
    const ready: Ready = {
      status: 'ready',
      offers: data.offers as NotikOffer[],
      country: typeof data.country === 'string' ? data.country : null,
    }
    saveCache(key, ready)
    return ready
  })()

  inFlight.set(key, request)
  try { return await request } finally {
    if (inFlight.get(key) === request) inFlight.delete(key)
  }
}

/**
 * Records the tap and returns the URL to send the worker to. The click id it
 * mints rides on `&s1=` and comes back on Notik's postback, which is what ties
 * a conversion to the exact card that produced it.
 */
export async function openNotikOffer(
  offer: NotikOffer,
  country: string | null,
  os: NotikDevice,
): Promise<string> {
  if (!supabase) throw new Error('Offers require the production account service.')
  const { data, error } = await supabase.functions.invoke('notik-click', {
    body: { offerId: offer.offerId, country, os },
  })
  if (error || data?.status !== 'success' || !data?.entryUrl) {
    throw new Error(data?.error ?? error?.message ?? 'Could not open this offer.')
  }
  return data.entryUrl as string
}
