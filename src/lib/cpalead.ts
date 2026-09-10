import { supabase } from './supabase'
import { usd } from './format'

export type CpaleadOffer = {
  offerId: string
  title: string
  description: string
  /** CPAlead's `conversion` field: what the worker actually has to do. */
  requirement: string
  /** CPA, CPI, CPE or CPC. Shown as the card's category line. */
  category: string
  logo: string
  /** What CPAlead pays PicoWorker, in USD. Kept for the admin/debug view. */
  amount: number
  /** What the worker is actually credited, so the card matches the wallet. */
  rewardUsd: number
  fastPay: boolean
}

export type CpaleadState =
  | { status: 'loading' }
  | { status: 'ready'; offers: CpaleadOffer[]; country: string | null }
  | { status: 'error'; message: string }

export type CpaleadDevice = 'android' | 'ios' | 'desktop'

export function detectCpaleadDevice(): CpaleadDevice {
  const agent = navigator.userAgent.toLowerCase()
  if (agent.includes('android')) return 'android'
  if (/iphone|ipad|ipod/.test(agent)) return 'ios'
  return 'desktop'
}

export function cpaleadRewardLabel(offer: CpaleadOffer): string {
  return usd(offer.rewardUsd)
}

// The catalogue itself only moves every 15 minutes on our side, but the
// per-user filtering (which offers they have already completed) does not, so
// this stays short enough that a completed offer disappears on the next visit.
const CACHE_TTL_MS = 10 * 60 * 1000
const CACHE_PREFIX = 'picoworker:cpalead:v1'
type Ready = Extract<CpaleadState, { status: 'ready' }>
const memory = new Map<string, { savedAt: number; state: Ready }>()
const inFlight = new Map<string, Promise<CpaleadState>>()

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

export async function requestCpaleadOffers(
  os: CpaleadDevice,
  options: { force?: boolean } = {},
): Promise<CpaleadState> {
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

  const request = (async (): Promise<CpaleadState> => {
    const { data, error } = await supabase.functions.invoke('cpalead-offers', {
      body: { os, force: options.force === true },
    })
    if (error || data?.status !== 'success' || !Array.isArray(data?.offers)) {
      return { status: 'error', message: data?.error ?? error?.message ?? 'Could not load offers.' }
    }
    const ready: Ready = {
      status: 'ready',
      offers: data.offers as CpaleadOffer[],
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
 * mints rides on `&subid=` and comes back on CPAlead's postback, which is what
 * ties a conversion to the exact card that produced it.
 */
export async function openCpaleadOffer(
  offer: CpaleadOffer,
  country: string | null,
  os: CpaleadDevice,
): Promise<string> {
  if (!supabase) throw new Error('Offers require the production account service.')
  const { data, error } = await supabase.functions.invoke('cpalead-click', {
    body: { offerId: offer.offerId, country, os },
  })
  if (error || data?.status !== 'success' || !data?.entryUrl) {
    throw new Error(data?.error ?? error?.message ?? 'Could not open this offer.')
  }
  return data.entryUrl as string
}
