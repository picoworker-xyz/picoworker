import { supabase } from './supabase'
import { usd } from './format'

export type LootablyGoal = {
  goalId: string
  description: string
  /** Worker payout for this goal, already at the 80% share. */
  rewardUsd: number
}

export type LootablyOffer = {
  offerId: string
  title: string
  description: string
  image: string
  /** Ready to open. Lootably embeds our userID server-side, so never rewrite it. */
  link: string
  categories: string[]
  devices: string[]
  countries: string[]
  paymentModel: string
  conversionRate: number
  /** What the worker is credited, so the card matches the wallet. 0 if variable. */
  rewardUsd: number
  variableReward: boolean
  multistep: boolean
  goals: LootablyGoal[]
}

export type LootablyState =
  | { status: 'loading' }
  | { status: 'ready'; offers: LootablyOffer[]; country: string | null }
  | { status: 'error'; message: string }

export type LootablyDevice = 'android' | 'ios' | 'desktop'

export function detectLootablyDevice(): LootablyDevice {
  const agent = navigator.userAgent.toLowerCase()
  if (agent.includes('android')) return 'android'
  if (/iphone|ipad|ipod/.test(agent)) return 'ios'
  return 'desktop'
}

export function lootablyRewardLabel(offer: LootablyOffer): string {
  // A survey router pays whatever the completed survey is worth, so a single
  // figure would be a promise we cannot keep.
  return offer.variableReward ? 'Varies' : usd(offer.rewardUsd)
}

/** Multistep offers pay per goal, so the headline is a total, not a lump sum. */
export function lootablyRewardCaption(offer: LootablyOffer): string {
  if (offer.variableReward) return 'Reward depends on what you complete'
  if (offer.multistep && offer.goals.length > 0) return `Across ${offer.goals.length} steps`
  return 'Paid on completion'
}

const CATEGORY_LABELS: Record<string, string> = {
  app: 'App',
  game: 'Game',
  desktopgame: 'Desktop game',
  mobilegame: 'Mobile game',
  oneclick: 'One click',
  survey: 'Survey',
  signup: 'Sign up',
  video: 'Video',
  quiz: 'Quiz',
  chromeextension: 'Extension',
  creditcard: 'Credit card',
  deposit: 'Deposit',
  freetrial: 'Free trial',
  shopping: 'Shopping',
}

export function lootablyCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category
}

/** Categories that cost the worker money up front, so the card must warn. */
const PAID_CATEGORIES = new Set(['creditcard', 'deposit', 'freetrial', 'shopping'])

export function lootablyNeedsPayment(offer: LootablyOffer): boolean {
  return offer.categories.some((c) => PAID_CATEGORIES.has(c))
}

const CACHE_TTL_MS = 15 * 60 * 1000
const CACHE_PREFIX = 'picoworker:lootably:v1'
type Ready = Extract<LootablyState, { status: 'ready' }>
const memory = new Map<string, { savedAt: number; state: Ready }>()
const inFlight = new Map<string, Promise<LootablyState>>()

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

/**
 * Record that a worker opened an offer, then hand back control immediately.
 *
 * This is the denominator: without it, "nobody reached goal 2" and "goal 2 was
 * never reported" are indistinguishable in our data, which is the argument we
 * cannot win with a provider.
 *
 * Deliberately never throws and never blocks. A failed insert must not stop a
 * worker opening an offer, and it is not part of the payment path. The 1200ms
 * cap means a slow network delays the redirect by at most that long.
 */
export async function recordLootablyClick(
  offer: LootablyOffer,
  device: LootablyDevice,
  country: string | null,
): Promise<void> {
  if (!supabase) return
  const call = supabase.rpc('record_lootably_click', {
    p_offer_id: offer.offerId,
    p_offer_name: offer.title,
    p_device: device,
    p_country: country,
    p_goals: offer.goals,
    p_reward: offer.rewardUsd,
  })
  try {
    await Promise.race([call, new Promise((r) => setTimeout(r, 1200))])
  } catch { /* opening the offer matters more than the record */ }
}

export type OfferActivity = {
  offer_name: string
  goal_name: string | null
  state: 'pending' | 'rejected'
  amount: number
  happened_at: string
}

/**
 * Conversions the provider is still reviewing, or has rejected. These never
 * reach the ledger, so without this a worker who completed a goal sees nothing
 * at all and reasonably concludes it was lost.
 */
export async function fetchOfferActivity(): Promise<OfferActivity[]> {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('my_offer_activity')
  if (error || !Array.isArray(data)) return []
  return data as OfferActivity[]
}

export async function requestLootablyOffers(
  os: LootablyDevice,
  options: { force?: boolean } = {},
): Promise<LootablyState> {
  if (!supabase) return { status: 'error', message: 'Offers require the production account service.' }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user.id) return { status: 'error', message: 'Please sign in to load offers.' }

  const key = `${CACHE_PREFIX}:${session.user.id}:${os}`
  if (!options.force) {
    const hit = readCache(key)
    if (hit) return hit
    // Two cards mounting at once must not fire two identical requests.
    const pending = inFlight.get(key)
    if (pending) return pending
  }

  const request = (async (): Promise<LootablyState> => {
    const { data, error } = await supabase.functions.invoke('lootably-offers', { body: { os } })
    if (error || data?.status !== 'ok' || !Array.isArray(data?.offers)) {
      return { status: 'error', message: data?.error ?? error?.message ?? 'Could not load offers.' }
    }
    const ready: Ready = {
      status: 'ready',
      offers: data.offers as LootablyOffer[],
      country: typeof data.country === 'string' && data.country ? data.country : null,
    }
    saveCache(key, ready)
    return ready
  })()

  inFlight.set(key, request)
  try { return await request } finally {
    if (inFlight.get(key) === request) inFlight.delete(key)
  }
}
