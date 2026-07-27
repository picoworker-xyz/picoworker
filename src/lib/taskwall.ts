import { supabase } from './supabase'

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

export function taskwallRewardLabel(offer: TaskwallOffer): string {
  if (isTaskwallProviderWall(offer) || offer.reward <= 0) return 'Rewards vary by task'
  const value = `$${offer.reward > 0 && offer.reward < 1
    ? offer.reward.toFixed(4).replace(/(\.\d{2}\d*?)0+$/, '$1')
    : offer.reward.toFixed(2)}`
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

const CACHE_TTL_MS = 15 * 60 * 1000
const CACHE_PREFIX = 'picoworker:taskwall:v2'
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
    return { status: 'error', message: 'TaskWall requires the production account service.' }
  }

  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user.id
  if (!userId) return { status: 'error', message: 'Please sign in to load TaskWall offers.' }

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
        message: data?.error ?? error?.message ?? 'Could not load TaskWall offers.',
      }
    }
    const offers = (data.offers as TaskwallOffer[]).map((offer) => ({
      ...offer,
      // Keep the UI honest even while an older Edge Function version is live.
      providerWall: isTaskwallProviderWall(offer),
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
