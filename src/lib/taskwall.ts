// Featured wall (TaskWall) is paused.
//
// Reasons, all verified against production data:
//   - No postback since 2026-08-01 11:17. Silent for days.
//   - Every payment it has ever sent: $0.01 x28, $0.03 x1, $0.05 x2. Offers
//     advertise milestones up to $2.96 and totals like "Up to $5.04", none of
//     which it has ever paid.
//   - Our margin across all 31 conversions was exactly $0.00.
//   - Its postback carries no transaction id, so two milestones of one offer on
//     one day are indistinguishable from a retry.
//
// Workers were spending real time on offers that pay a cent if they pay at all.
//
// The postback receiver stays deployed on purpose: if a late conversion does
// arrive for work already done, the worker still gets credited. This flag only
// stops us advertising the wall.
export const TASKWALL_PAUSED = true

import { supabase } from './supabase'
import { usd } from './format'

export type TaskwallDevice = 'android' | 'ios' | 'desktop'

export type TaskwallOffer = {
  offerId: string
  title: string
  description: string
  conversion: string
  icon: string
  link: string
  reward: number
  providerWall: boolean
  legacy: boolean
  multiEvent: boolean
  isUpTo: boolean
  events: Array<{ eventId: string; instructions: string; reward: number }>
  devices: string[]
  countries: string[]
}

export function isTaskwallProviderWall(offer: TaskwallOffer): boolean {
  return offer.providerWall === true
    || /\b(tapjoy|lootably)\b/i.test(offer.title)
    || (offer.reward <= 0 && (!Array.isArray(offer.events) || offer.events.length === 0))
}

// Older TaskWall campaigns advertise a full milestone ladder but only ever pay
// the opening milestone. The server sets `legacy`; the title and conversion
// checks are fallbacks so the warning still shows if an older Edge Function is
// live. Both markers agree exactly across the feed.
export function isTaskwallLegacy(offer: TaskwallOffer): boolean {
  return offer.legacy === true
    || /^-\s/.test(offer.title ?? '')
    || /rewards?\s+along\s+the\s+way/i.test(offer.conversion ?? '')
}

export function taskwallRewardLabel(offer: TaskwallOffer): string {
  if (isTaskwallProviderWall(offer) || offer.reward <= 0) return 'Rewards vary by task'
  // Use the shared formatter so offer rewards and every other amount in the
  // app round identically at 6dp.
  const value = usd(offer.reward)
  return offer.isUpTo || offer.multiEvent ? `Up to ${value}` : value
}

export type TaskwallOffersState =
  | { status: 'loading' }
  | { status: 'ready'; offers: TaskwallOffer[]; country: string | null; os: TaskwallDevice }
  | { status: 'error'; message: string }

export const TASKWALL_DEVICE_OPTIONS: { value: TaskwallDevice; label: string }[] = [
  { value: 'android', label: 'Android' },
  { value: 'ios', label: 'iPhone / iPad' },
  { value: 'desktop', label: 'Desktop' },
]

// The feed returns raw tokens like "android" / "ios" / "desktop". Uppercasing
// them in CSS produced "IOS", so map to real product names instead.
const DEVICE_LABELS: Record<string, string> = {
  android: 'Android',
  ios: 'iPhone & iPad',
  iphone: 'iPhone',
  ipad: 'iPad',
  desktop: 'Desktop',
  web: 'Desktop',
  windows: 'Windows',
  mac: 'Mac',
  macos: 'Mac',
}

export function deviceLabel(raw: string): string {
  const key = raw.trim().toLowerCase()
  return DEVICE_LABELS[key] ?? (key.charAt(0).toUpperCase() + key.slice(1))
}

// Two-letter codes like "PK" mean nothing to most people. Intl resolves them to
// real country names and already ships with the browser, so no lookup table.
let regionNames: Intl.DisplayNames | null = null
export function countryLabel(code: string): string {
  const raw = code.trim()
  if (raw.length !== 2) return raw
  try {
    regionNames ??= new Intl.DisplayNames(['en'], { type: 'region' })
    return regionNames.of(raw.toUpperCase()) ?? raw.toUpperCase()
  } catch {
    return raw.toUpperCase()
  }
}

const CACHE_TTL_MS = 15 * 60 * 1000
const CACHE_PREFIX = 'picoworker:taskwall:v3'
type ReadyState = Extract<TaskwallOffersState, { status: 'ready' }>
type CachedOffers = { savedAt: number; state: ReadyState }
const memoryCache = new Map<string, CachedOffers>()
const inFlight = new Map<string, Promise<TaskwallOffersState>>()

function readCache(key: string): ReadyState | null {
  const memory = memoryCache.get(key)
  if (memory && Date.now() - memory.savedAt < CACHE_TTL_MS) return memory.state

  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const cached = JSON.parse(raw) as CachedOffers
    if (cached?.state?.status !== 'ready' || Date.now() - cached.savedAt >= CACHE_TTL_MS) {
      sessionStorage.removeItem(key)
      return null
    }
    memoryCache.set(key, cached)
    return cached.state
  } catch {
    return null
  }
}

function saveCache(key: string, state: ReadyState) {
  const cached: CachedOffers = { savedAt: Date.now(), state }
  memoryCache.set(key, cached)
  try {
    sessionStorage.setItem(key, JSON.stringify(cached))
  } catch {
    // Memory caching still prevents repeat requests during this app session.
  }
}

export function detectTaskwallDevice(): TaskwallDevice {
  const agent = navigator.userAgent.toLowerCase()
  if (agent.includes('android')) return 'android'
  if (/iphone|ipad|ipod/.test(agent)) return 'ios'
  return 'desktop'
}

export async function requestTaskwallOffers(
  os: TaskwallDevice,
  options: { force?: boolean } = {},
): Promise<TaskwallOffersState> {
  if (!supabase) {
    return { status: 'error', message: 'Featured offers require the production account service.' }
  }

  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user.id
  if (!userId) return { status: 'error', message: 'Please sign in to load featured offers.' }

  const cacheKey = `${CACHE_PREFIX}:${userId}:${os}`
  if (!options.force) {
    const cached = readCache(cacheKey)
    if (cached) return cached
    const pending = inFlight.get(cacheKey)
    if (pending) return pending
  }

  const request = (async (): Promise<TaskwallOffersState> => {
    const { data, error } = await supabase.functions.invoke('taskwall-offers', {
      body: { os, force: options.force === true },
    })
    if (error || data?.status !== 'success' || !Array.isArray(data?.offers)) {
      return {
        status: 'error',
        message: data?.error ?? error?.message ?? 'Could not load featured offers.',
      }
    }
    const offers = (data.offers as TaskwallOffer[]).map((offer) => ({
      ...offer,
      // Keep the UI honest even while an older Edge Function version is live.
      providerWall: isTaskwallProviderWall(offer),
      legacy: isTaskwallLegacy(offer),
    }))
    const ready: ReadyState = {
      status: 'ready',
      offers,
      country: typeof data.country === 'string' ? data.country : null,
      os,
    }
    saveCache(cacheKey, ready)
    return ready
  })()

  inFlight.set(cacheKey, request)
  try {
    return await request
  } finally {
    if (inFlight.get(cacheKey) === request) inFlight.delete(cacheKey)
  }
}
