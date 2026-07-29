// Authenticated TaskWall Offers API proxy. The app ID remains server-side and
// every tracking URL is generated for the signed-in Supabase Auth UUID.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { cors, json } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_ID = Deno.env.get('TASKWALL_APP_ID') ?? ''
const USD_PER_CREDIT = Number(Deno.env.get('TASKWALL_USD_PER_CREDIT') ?? '')
const ENDPOINT = 'https://wall.taskwall.io/api/'
const ALLOWED_OS = new Set(['android', 'ios', 'desktop'])
const CACHE_TTL_MS = 30 * 60 * 1000
const USER_ID_TOKEN = '__PICOWORKER_USER_ID__'

type ProviderOffer = Record<string, unknown>
type PublicOffer = {
  offerId: string
  title: string
  description: string
  conversion: string
  icon: string
  link: string
  userAmount: number
  reward: number
  payout: number
  providerWall: boolean
  legacy: boolean
  multiEvent: boolean
  isUpTo: boolean
  events: Array<{ eventId: string; instructions: string; reward: number }>
  devices: string[]
  countries: string[]
}

function clean(value: unknown, max = 500): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function list(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => clean(item, 80)).filter(Boolean).slice(0, 30)
  }
  const text = clean(value, 500)
  return text ? text.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 30) : []
}

function fullList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => clean(item, 80).toUpperCase()).filter(Boolean).slice(0, 300)
  }
  const text = clean(value, 3000)
  return text ? text.split(',').map((item) => item.trim().toUpperCase()).filter(Boolean).slice(0, 300) : []
}

function countryAliases(country: string): Set<string> {
  if (country === 'GB' || country === 'UK') return new Set(['GB', 'UK'])
  return new Set([country])
}

function matchesCountry(countries: string[], aliases: Set<string>): boolean {
  return countries.some((country) => aliases.has(country) || country === 'ALL' || country === 'WORLDWIDE')
}

function matchesDevice(devices: string[], requestedOs: string): boolean {
  const values = new Set(devices.map((device) => device.toLowerCase()))
  if (requestedOs === 'desktop') {
    return ['desktop', 'web', 'mac', 'windows'].some((device) => values.has(device))
  }
  return values.has(requestedOs)
}

function offerEvents(value: unknown): Array<{ eventId: string; instructions: string; reward: number }> {
  if (!Array.isArray(value)) return []
  return value.flatMap((raw) => {
    if (!raw || typeof raw !== 'object') return []
    const event = raw as Record<string, unknown>
    const payout = Number(event.event_payout)
    const userAmount = Number(event.user_amount)
    const reward = Number.isFinite(userAmount) && userAmount > 0
      ? userAmount * USD_PER_CREDIT
      : Number.isFinite(payout) && payout > 0 ? payout : 0
    return [{
      eventId: clean(event.event_id, 100),
      instructions: clean(event.event_instructions, 500),
      reward: Number(reward.toFixed(6)),
    }]
  }).filter((event) => event.instructions).slice(0, 20)
}

// TaskWall serves two generations of campaign under one feed, distinguishable
// by offer id: legacy ids are numeric and below 1000, modern ids are 5 digits.
//
// Legacy campaigns advertise milestone ladders worth up to $275 but only ever
// convert their first milestone. Observed across every legacy offer our users
// touched (Magnet Miner, Wishing Well, Ghost Tower): each paid the opening
// $0.01 and never emitted another conversion, while modern campaigns (Dragon
// Down, Swap Rush) correctly send one postback per milestone with the
// milestone encoded in offer_name. Confirmed by a controlled test where a user
// reached the 300m milestone on legacy Magnet Miner and no postback arrived,
// and the conversion never appeared in TaskWall's own dashboard either.
//
// These stay visible so users keep the inventory, but they are flagged so the
// UI can warn that only the opening milestone is known to pay. 18 of the 21
// legacy games are also published as modern campaigns, so a user who wants the
// full ladder can pick the unprefixed version of the same game.
// Remove this once TaskWall confirms a fix.
const LEGACY_OFFER_ID_MAX = 1000

function isLegacyOffer(offerId: string): boolean {
  const numeric = Number(offerId)
  return Number.isInteger(numeric) && numeric > 0 && numeric < LEGACY_OFFER_ID_MAX
}

function isProviderOfferwall(title: string, description: string, conversion: string, reward: number, eventCount: number): boolean {
  const text = `${title} ${description} ${conversion}`
  return /\b(tapjoy|lootably)\b/i.test(title)
    || /earn\s+from\s+.+again\s+and\s+again/i.test(text)
    || /complete\s+any\s+offer\s+to\s+earn/i.test(text)
    || (reward <= 0 && eventCount === 0)
}

function proxyClientIp(req: Request): string {
  const forwarded = req.headers.get('cf-connecting-ip')
    ?? req.headers.get('x-forwarded-for')?.split(',')[0]
    ?? ''
  const ip = forwarded.trim().replace(/^\[|\]$/g, '')
  return /^[0-9a-f:.]{3,45}$/i.test(ip) ? ip : ''
}

async function detectCountry(req: Request): Promise<string> {
  const edgeCountry = [
    req.headers.get('cf-ipcountry'),
    req.headers.get('x-country-code'),
  ].find((value) => /^[A-Z]{2}$/i.test(value?.trim() ?? ''))
  if (edgeCountry && edgeCountry.toUpperCase() !== 'XX') return edgeCountry.toUpperCase()

  const ip = proxyClientIp(req)
  if (!ip) return ''
  try {
    const response = await fetch(`https://api.country.is/${encodeURIComponent(ip)}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(4_000),
    })
    if (!response.ok) return ''
    const payload = await response.json() as { country?: unknown }
    const country = typeof payload.country === 'string' ? payload.country.trim().toUpperCase() : ''
    return /^[A-Z]{2}$/.test(country) && country !== 'XX' ? country : ''
  } catch {
    return ''
  }
}

function safeUrl(value: unknown): string {
  const text = clean(value, 3000)
  try {
    const url = new URL(text)
    if (url.hostname === 'track.taskwall.io') url.protocol = 'https:'
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : ''
  } catch {
    return ''
  }
}

function trackingLinkTemplate(value: unknown): string {
  const link = safeUrl(value)
  if (!link) return ''
  try {
    const url = new URL(link)
    // TaskWall uses this parameter for postback attribution. Never persist a
    // real PicoWorker UUID in the shared country/device catalog.
    url.searchParams.set('userid', USER_ID_TOKEN)
    return url.toString()
  } catch {
    return ''
  }
}

function personalizeOffers(offers: PublicOffer[], userId: string): PublicOffer[] {
  return offers.map((offer) => ({
    ...offer,
    link: offer.link.replaceAll(USER_ID_TOKEN, encodeURIComponent(userId)),
  }))
}

async function loadProviderOffers(userId: string, requestedOs: string, providerCountry: string): Promise<PublicOffer[]> {
  const providerUrl = new URL(ENDPOINT)
  providerUrl.searchParams.set('app_id', APP_ID)
  providerUrl.searchParams.set('userid', userId)
  providerUrl.searchParams.set('os', requestedOs)
  providerUrl.searchParams.set('country', providerCountry)

  const response = await fetch(providerUrl, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(20_000),
  })
  if (!response.ok) throw new Error(`TaskWall HTTP ${response.status}`)
  const payload = await response.json() as Record<string, unknown>
  if ((payload.success !== true && payload.status !== 'success') || !Array.isArray(payload.offers)) {
    throw new Error(clean(payload.message, 200) || 'TaskWall returned an invalid response')
  }

  const allowedCountries = countryAliases(providerCountry)
  return (payload.offers as ProviderOffer[]).flatMap((offer): PublicOffer[] => {
    const link = trackingLinkTemplate(offer.link)
    const offerId = clean(offer.offer_id, 200)
    const title = clean(offer.title, 240)
    const payout = Number(offer.payout)
    const suppliedUserAmount = Number(offer.user_amount)
    const offerCountries = fullList(offer.countries ?? offer.available_in)
    const offerDevices = fullList(offer.devices)
    if (
      !link || !offerId || !title
      || !matchesCountry(offerCountries, allowedCountries)
      || !matchesDevice(offerDevices, requestedOs)
    ) return []

    const hasUserAmount = Number.isFinite(suppliedUserAmount) && suppliedUserAmount > 0
    const safePayout = Number.isFinite(payout) && payout >= 0 ? payout : 0
    const userAmount = hasUserAmount ? suppliedUserAmount : safePayout / USD_PER_CREDIT
    const reward = hasUserAmount ? userAmount * USD_PER_CREDIT : safePayout
    const description = clean(offer.description, 1000)
    const conversion = clean(offer.conversion, 1000)
    const events = offerEvents(offer.events)

    return [{
      offerId,
      title,
      description,
      conversion,
      icon: safeUrl(offer.icon),
      link,
      userAmount,
      reward: Number(reward.toFixed(6)),
      payout: safePayout,
      providerWall: isProviderOfferwall(title, description, conversion, reward, events.length),
      legacy: isLegacyOffer(offerId),
      multiEvent: offer.multi_event === true || events.length > 0,
      isUpTo: /\bup\s+to\b/i.test(`${title} ${description} ${conversion}`) || events.length > 1,
      events,
      devices: list(offer.devices),
      countries: [providerCountry],
    }]
  })
}

type AdminClient = ReturnType<typeof createClient>

async function refreshCache(
  admin: AdminClient,
  userId: string,
  requestedOs: string,
  providerCountry: string,
): Promise<PublicOffer[]> {
  const offers = await loadProviderOffers(userId, requestedOs, providerCountry)
  const { error } = await admin.from('taskwall_offer_cache').upsert({
    country: providerCountry,
    os: requestedOs,
    offers,
    fetched_at: new Date().toISOString(),
  }, { onConflict: 'country,os' })
  if (error) throw new Error(`Could not save TaskWall cache: ${error.message}`)
  return offers
}

function refreshInBackground(job: Promise<unknown>) {
  const runtime = (globalThis as typeof globalThis & {
    EdgeRuntime?: { waitUntil(promise: Promise<unknown>): void }
  }).EdgeRuntime
  if (runtime) runtime.waitUntil(job)
  else void job
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  if (!APP_ID || !Number.isFinite(USD_PER_CREDIT) || USD_PER_CREDIT <= 0) {
    return json({ error: 'Featured offers are awaiting publisher configuration' }, 503)
  }

  const bearer = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (!bearer) return json({ error: 'Unauthorized' }, 401)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: { user }, error: authError } = await admin.auth.getUser(bearer)
  if (authError || !user) return json({ error: 'Unauthorized' }, 401)

  const profile = await admin
    .from('profiles')
    .select('suspended')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile.data) return json({ error: 'Profile not found' }, 404)
  if (profile.data.suspended) return json({ error: 'Account suspended' }, 403)

  let requestedOs = 'desktop'
  let forceRefresh = false
  try {
    const body = await req.json()
    if (typeof body?.os === 'string' && ALLOWED_OS.has(body.os)) requestedOs = body.os
    forceRefresh = body?.force === true
  } catch {
    // An empty body simply uses the safe desktop default.
  }

  // Supabase's edge proxy supplies Cloudflare's trusted two-letter visitor
  // country. Forward it so users never see offers that cannot accept their IP
  // (for example, a US-only offer shown to a visitor in Pakistan).
  const visitorCountry = await detectCountry(req)
  if (!/^[A-Z]{2}$/.test(visitorCountry) || visitorCountry === 'XX') {
    // Failing closed is safer than showing offers that will not redirect or
    // pay because their targeting does not match the visitor.
    return json({
      status: 'error',
      error: 'We could not verify your country. Please disable VPN and tap Refresh.',
    })
  }
  const providerCountry = visitorCountry === 'GB' ? 'UK' : visitorCountry

  const cached = await admin
    .from('taskwall_offer_cache')
    .select('offers,fetched_at')
    .eq('country', providerCountry)
    .eq('os', requestedOs)
    .maybeSingle()
  const cachedOffers = Array.isArray(cached.data?.offers) ? cached.data.offers as PublicOffer[] : null
  const fetchedAt = cached.data?.fetched_at ? Date.parse(cached.data.fetched_at) : 0
  const cacheAgeMs = fetchedAt > 0 ? Date.now() - fetchedAt : Number.POSITIVE_INFINITY

  if (cachedOffers && !forceRefresh) {
    const stale = cacheAgeMs >= CACHE_TTL_MS
    if (stale) {
      refreshInBackground(
        refreshCache(admin, user.id, requestedOs, providerCountry)
          .catch((error) => console.error('Background TaskWall cache refresh failed', error)),
      )
    }
    const offers = personalizeOffers(cachedOffers, user.id)
    return json({
      status: 'success',
      count: offers.length,
      country: providerCountry,
      os: requestedOs,
      cached: true,
      refreshing: stale,
      offers,
    })
  }

  let catalog: PublicOffer[]
  try {
    catalog = await refreshCache(admin, user.id, requestedOs, providerCountry)
  } catch (error) {
    console.error('TaskWall cache refresh failed', error)
    if (cachedOffers) catalog = cachedOffers
    else return json({ status: 'error', error: 'Could not load offers. Please try again.' })
  }
  const offers = personalizeOffers(catalog, user.id)

  return json({
    status: 'success',
    count: offers.length,
    country: providerCountry,
    os: requestedOs,
    cached: false,
    offers,
  })
})
