// Authenticated Lootably Offers API proxy.
//
// The API key never reaches the browser. This function pulls inventory for the
// caller and returns a publisher-safe list.
//
// Unlike the other two walls, targeting is not ours to do. We forward the
// caller's real userAgentHeader and ipAddress and Lootably resolves device and
// country from them. That is the whole reason this integration exists: the
// TaskWall path pinned every click to a single "web" device slot regardless of
// the actual device, so Android app installs answered "offer unavailable".
//
// The click URL comes back with our userID already embedded, because we send a
// userData object. It stays stable for a given worker, which is the other
// TaskWall defect this avoids — there the downstream id was regenerated on
// every click and the network's anti-fraud layer read it as multi-accounting.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { cors, json } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const API_KEY = Deno.env.get('LOOTABLY_API_KEY') ?? ''
const PLACEMENT_ID = Deno.env.get('LOOTABLY_PLACEMENT_ID') ?? ''
const ENDPOINT = 'https://api.lootably.com/api/v2/offers/get'

// Worker share of gross revenue, matching complete_task and credit_lootably_reward.
// Display and crediting must agree or workers see one number and get another.
const WORKER_SHARE = 0.80

const CACHE_TTL_MS = 30 * 60 * 1000

type PublicOffer = {
  offerId: string
  title: string
  description: string
  image: string
  link: string
  categories: string[]
  devices: string[]
  countries: string[]
  paymentModel: string
  conversionRate: number
  /** Worker payout in USD. 0 when the provider says "variable". */
  rewardUsd: number
  /** True when the reward depends on what the user completes (survey routers). */
  variableReward: boolean
  multistep: boolean
  goals: { goalId: string; description: string; rewardUsd: number }[]
}

function clean(value: unknown, max = 500): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function strList(value: unknown, max = 40): string[] {
  return Array.isArray(value)
    ? value.filter((v) => typeof v === 'string').slice(0, max).map((v) => (v as string).trim())
    : []
}

/**
 * `revenue` is a number, or the literal string "variable" for offers whose
 * payout depends on what the user completes — survey routers mostly. Treating
 * "variable" as 0 via Number() would silently advertise a free offer, so it is
 * reported separately and the UI shows a range rather than a figure.
 */
function revenueOf(value: unknown): { usd: number; variable: boolean } {
  if (value === 'variable') return { usd: 0, variable: true }
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? { usd: n, variable: false } : { usd: 0, variable: false }
}

function clientIp(req: Request): string {
  const fwd = req.headers.get('cf-connecting-ip')
    ?? req.headers.get('x-forwarded-for')?.split(',')[0]
    ?? ''
  const ip = fwd.trim().replace(/^\[|\]$/g, '')
  return /^[0-9a-f:.]{3,45}$/i.test(ip) ? ip : ''
}

function detectCountry(req: Request): string {
  // 'XX' is Cloudflare's "unknown", not a country. Letting it through would key
  // the cache on a bucket that can never match real targeting.
  const header = [req.headers.get('cf-ipcountry'), req.headers.get('x-country-code')]
    .find((v) => /^[A-Z]{2}$/i.test(v?.trim() ?? ''))
  const code = (header ?? '').trim().toUpperCase()
  return code && code !== 'XX' ? code : ''
}

/** Our os values are android/ios/desktop; the cache key mirrors the other walls. */
function cacheDevice(os: string): string {
  return os === 'android' || os === 'ios' ? 'mobile' : 'desktop'
}

function toPublic(raw: Record<string, unknown>): PublicOffer | null {
  const offerId = clean(raw.offerID, 100)
  const link = clean(raw.link, 3000)
  if (!offerId || !link) return null

  const multistep = raw.type === 'multistep'
  const goalsRaw = Array.isArray(raw.goals) ? raw.goals as Record<string, unknown>[] : []

  const goals = goalsRaw.slice(0, 30).map((g) => ({
    goalId: clean(g.goalID, 100),
    description: clean(g.description, 300),
    rewardUsd: Number((revenueOf(g.revenue).usd * WORKER_SHARE).toFixed(6)),
  }))

  // A multistep offer has no top-level revenue: its value is the sum of its
  // goals. Reading `revenue` alone would show every multistep offer as $0.
  const base = multistep
    ? { usd: goalsRaw.reduce((sum, g) => sum + revenueOf(g.revenue).usd, 0), variable: false }
    : revenueOf(raw.revenue)

  return {
    offerId,
    title: clean(raw.name, 200),
    description: clean(raw.description, 1200),
    image: clean(raw.image, 1000),
    link,
    categories: strList(raw.categories),
    devices: strList(raw.devices),
    countries: strList(raw.countries, 300),
    paymentModel: clean(raw.paymentModel, 20),
    conversionRate: Number(raw.conversionRate) || 0,
    rewardUsd: Number((base.usd * WORKER_SHARE).toFixed(6)),
    variableReward: base.variable,
    multistep,
    goals,
  }
}

async function fetchOffers(userId: string, userAgent: string, ip: string): Promise<PublicOffer[]> {
  const body: Record<string, unknown> = { apiKey: API_KEY, placementID: PLACEMENT_ID }
  // userData is what makes this the User API rather than the catalogue: without
  // it Lootably cannot target, and the link comes back with a {userID} macro we
  // would have to substitute ourselves.
  if (userId && ip) body.userData = { userID: userId, userAgentHeader: userAgent, ipAddress: ip }

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const payload = await res.json().catch(() => null) as
    | { success?: boolean; message?: string; data?: { requestID?: string; offers?: unknown[] } }
    | null

  if (!res.ok || !payload?.success) {
    // requestID is what Lootably support asks for first, so it must be logged.
    console.error('Lootably offers request failed', {
      status: res.status,
      message: payload?.message,
      requestID: payload?.data?.requestID,
    })
    throw new Error(payload?.message || 'Provider request failed')
  }

  const offers = Array.isArray(payload.data?.offers) ? payload.data.offers : []
  return offers
    .map((o) => toPublic(o as Record<string, unknown>))
    .filter((o): o is PublicOffer => o !== null)
    // An offer paying nothing with no variable flag is a data problem on their
    // side; showing it wastes a worker's tap the same way TaskWall did.
    .filter((o) => o.rewardUsd > 0 || o.variableReward)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ status: 'error', error: 'Method not allowed' }, 405)

  if (!API_KEY || !PLACEMENT_ID) {
    console.error('Lootably secrets are not configured')
    return json({ status: 'error', error: 'Offers are not available right now.' })
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Identify the caller from the verified JWT. The user id must never come from
  // the request body: it is the key conversions are credited against.
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data: auth } = await admin.auth.getUser(token)
  const userId = auth?.user?.id ?? ''
  // HTTP 200 with an error payload, like the failure paths below: functions.invoke
  // throws on a non-2xx and discards the body, so a 401 here would surface to the
  // worker as "Edge Function returned a non-2xx status code" instead of the reason.
  if (!userId) return json({ status: 'error', error: 'Please sign in to see offers.' })

  let requestedOs = 'desktop'
  try {
    const body = await req.json() as { os?: unknown }
    const os = clean(body?.os, 20).toLowerCase()
    if (os === 'android' || os === 'ios' || os === 'desktop') requestedOs = os
  } catch { /* body is optional */ }

  const ip = clientIp(req)
  const userAgent = req.headers.get('user-agent') ?? ''
  const country = detectCountry(req)
  const device = cacheDevice(requestedOs)
  // Country is only a cache key here, never a filter — Lootably targets from the
  // ip we forward. An unknown country therefore degrades to a shared bucket
  // rather than blocking the request, which is what taskwall-offers does.
  const cacheCountry = country || 'ZZ'

  const { data: cached } = await admin
    .from('lootably_offer_cache')
    .select('offers, fetched_at')
    .eq('country', cacheCountry)
    .eq('device', device)
    .maybeSingle()

  const fresh = cached?.fetched_at
    && Date.now() - new Date(cached.fetched_at as string).getTime() < CACHE_TTL_MS

  if (fresh && Array.isArray(cached?.offers)) {
    return json({ status: 'ok', country, offers: cached.offers, cached: true })
  }

  let offers: PublicOffer[]
  try {
    offers = await fetchOffers(userId, userAgent, ip)
  } catch (err) {
    // Serve stale rather than nothing: an expired catalogue is far more useful
    // to a worker than an empty page, and the links stay valid.
    if (Array.isArray(cached?.offers) && cached.offers.length > 0) {
      console.warn('Lootably refresh failed, serving stale cache', { message: String(err) })
      return json({ status: 'ok', country, offers: cached.offers, cached: true, stale: true })
    }
    // HTTP 200 with an error payload on purpose: supabase.functions.invoke
    // throws on a non-2xx and discards the body, so a non-2xx here reaches the
    // user as "Edge Function returned a non-2xx status code".
    return json({ status: 'error', error: 'Offers could not be loaded. Please try again.' })
  }

  await admin.from('lootably_offer_cache').upsert({
    country: cacheCountry,
    device,
    offers,
    fetched_at: new Date().toISOString(),
  }, { onConflict: 'country,device' })

  return json({ status: 'ok', country, offers, cached: false })
})
