// Authenticated CPAlead publisher Offers API proxy.
//
// CPAlead's /api/offers can filter by country and device itself, but only
// against the caller's own IP when asked to detect them, and the caller here is
// an Edge Function in a data centre. Per-visitor filtering would therefore mean
// an outbound API call on every page render keyed on values we already know, so
// this function does two separate jobs instead:
//
//   1. Keep `cpalead_offers` fresh. One unfiltered pull (limit 5000, their
//      documented maximum) on a shared 15 minute cadence. Whichever request
//      finds the catalogue stale claims the sync lock and refreshes; everyone
//      else serves what is stored.
//   2. Return the slice of it this visitor is eligible for. The `subid` that
//      ties a conversion back to a card is appended at tap time by
//      cpalead-click, not here, so we do not mint 300 ids for cards nobody
//      opens.
//
// The publisher id and API key never reach the browser.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { cors, json } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const PUB_ID = Deno.env.get('CPALEAD_PUB_ID') ?? ''
const API_KEY = Deno.env.get('CPALEAD_API_KEY') ?? ''

// The worker's cut of what CPAlead pays us. Unlike Notik there is no virtual
// currency ratio in the middle: the catalogue's `amount` and the postback's
// `payout` are both plain USD, so this single multiplier prices the cards and
// credits the wallet. 0.8 is the usual 80/20 split.
const WORKER_SHARE = Number(Deno.env.get('CPALEAD_WORKER_SHARE') ?? '0.8')

const BASE = 'https://www.cpalead.com/api/offers'
const SYNC_INTERVAL_MIN = 15
// Their documented maximum for one request. There is no offset parameter, so a
// catalogue larger than this cannot be paged — it is logged instead.
const PULL_LIMIT = 5000

// Supabase's Deno runtime global for work that should outlive the response.
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void }

type Row = Record<string, unknown>

// CPAlead sends `id`, `daily_cap` and friends as JSON numbers, not strings, so
// a string-only reader would discard the offer id and reject every offer in the
// catalogue. Numbers are coerced; everything else is not a scalar we want.
function clean(value: unknown, max = 500): string {
  if (typeof value === 'string') return value.trim().slice(0, max)
  if (typeof value === 'number' && Number.isFinite(value)) return String(value).slice(0, max)
  return ''
}

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/**
 * CPAlead is inconsistent about list-shaped fields: `countries` and `device`
 * arrive as a JSON array on some campaigns and as a delimited string ("US,CA",
 * "iphone|ipad") on others, and "all" is the wildcard in both. Normalise both
 * shapes to a token list so the SQL filter only has one thing to match.
 */
function tokens(value: unknown, max = 40): string[] {
  const raw = Array.isArray(value)
    ? value.flatMap((v) => (typeof v === 'string' || typeof v === 'number' ? [String(v)] : []))
    : typeof value === 'string'
    ? value.split(/[,|;/]/)
    : []
  const out: string[] = []
  for (const item of raw) {
    const token = item.trim().slice(0, max)
    if (token && !out.includes(token)) out.push(token)
  }
  return out
}

/**
 * `creatives` arrives as an OBJECT on the live API ({ url, og_image }), not the
 * array the field name suggests. Both shapes are read, and the square icon is
 * preferred over og_image, which is a wide social banner that crops badly into
 * the card's 44px tile.
 */
function creativeImage(raw: Row): string {
  const direct = clean(raw.image ?? raw.image_url ?? raw.icon, 3000)
  if (direct.startsWith('http')) return direct

  const candidates: unknown[] = Array.isArray(raw.creatives)
    ? raw.creatives
    : raw.creatives && typeof raw.creatives === 'object'
    ? [(raw.creatives as Row).url, (raw.creatives as Row).og_image]
    : []

  for (const item of candidates) {
    const url = typeof item === 'string'
      ? clean(item, 3000)
      : clean((item as Row)?.url ?? (item as Row)?.image ?? (item as Row)?.src, 3000)
    if (url.startsWith('http')) return url
  }
  return ''
}

function clientIp(req: Request): string {
  const fwd = req.headers.get('cf-connecting-ip')
    ?? req.headers.get('x-forwarded-for')?.split(',')[0]
    ?? ''
  const ip = fwd.trim().replace(/^\[|\]$/g, '')
  return /^[0-9a-f:.]{3,45}$/i.test(ip) ? ip : ''
}

async function detectCountry(req: Request, ip: string): Promise<string> {
  const header = [req.headers.get('cf-ipcountry'), req.headers.get('x-country-code')]
    .find((v) => /^[A-Z]{2}$/i.test(v?.trim() ?? ''))
  if (header && header.toUpperCase() !== 'XX') return header.toUpperCase()
  if (!ip) return ''
  try {
    const res = await fetch(`https://api.country.is/${encodeURIComponent(ip)}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return ''
    const payload = await res.json() as { country?: unknown }
    const c = clean(payload.country, 8).toUpperCase()
    return /^[A-Z]{2}$/.test(c) && c !== 'XX' ? c : ''
  } catch {
    return ''
  }
}

/**
 * The device tokens an offer may carry that this visitor should match. CPAlead
 * targets both the specific platform and the "mobile" / "desktop" family, and
 * labels iOS campaigns by hardware as often as by OS, so one visitor matches
 * several tokens.
 */
function deviceTokens(os: string): string[] {
  if (os === 'android') return ['android', 'mobile']
  if (os === 'ios') return ['ios', 'iphone', 'ipad', 'ipod', 'mobile']
  return ['desktop', 'windows', 'mac', 'web']
}

/** Trim a raw offer to the columns replace_cpalead_offers reads. */
function normalise(raw: Row): Row | null {
  const offerId = clean(raw.id ?? raw.offer_id ?? raw.campaign_id, 120)
  const title = clean(raw.title ?? raw.name ?? raw.campaign_name, 240)
  const link = clean(raw.link ?? raw.url, 4000)
  if (!offerId || !title || !link.startsWith('http')) return null

  return {
    offer_id: offerId,
    title,
    description: clean(raw.description, 1200),
    long_description: clean(raw.long_description, 4000),
    conversion: clean(raw.conversion, 600),
    link,
    preview_link: clean(raw.preview_link, 4000),
    image_url: creativeImage(raw),
    countries: tokens(raw.countries ?? raw.country, 8).map((c) => c.toUpperCase()),
    devices: tokens(raw.device ?? raw.devices, 20).map((d) => d.toLowerCase()),
    amount: num(raw.amount ?? raw.payout) ?? 0,
    payout_currency: clean(raw.payout_currency, 8) || 'USD',
    payout_type: clean(raw.payout_type, 16),
    epc: num(raw.epc),
    offer_rank: num(raw.offer_rank),
    daily_cap: num(raw.daily_cap),
    is_fast_pay: raw.is_fast_pay === true || raw.is_fast_pay === 1 || raw.is_fast_pay === '1',
    conversion_mode: clean(raw.conversion_mode, 40),
    verification_method: clean(raw.verification_method, 40),
    events: Array.isArray(raw.events) ? raw.events : [],
    creatives: raw.creatives && typeof raw.creatives === 'object' ? raw.creatives : {},
  }
}

/** Pull the whole catalogue in one request and hand the rows to `onBatch`. */
async function pullCatalogue(onBatch: (rows: Row[]) => Promise<void>): Promise<number> {
  const url = new URL(BASE)
  url.searchParams.set('id', PUB_ID)
  url.searchParams.set('limit', String(PULL_LIMIT))
  url.searchParams.set('format', 'json')
  // Long descriptions roughly double the payload and the cards only ever show
  // three lines, so they are left out of the sync.
  url.searchParams.set('include_long_description', '0')

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(45_000),
  })
  if (!res.ok) throw new Error(`CPAlead HTTP ${res.status}`)

  const payload = await res.json() as Row
  const list = Array.isArray(payload) ? payload
    : Array.isArray(payload.offers) ? payload.offers
    : Array.isArray(payload.data) ? payload.data
    : null
  if (!list) throw new Error('CPAlead returned an invalid response')
  if (list.length >= PULL_LIMIT) {
    console.warn('CPAlead catalogue hit the request limit; offers beyond it are not fetchable', {
      limit: PULL_LIMIT,
    })
  }

  const rows = (list as Row[]).flatMap((raw) => {
    const row = normalise(raw)
    return row ? [row] : []
  })
  // Written in chunks: 5000 normalised offers is a few megabytes, and one
  // statement that large puts the request body limit on the critical path of
  // every refresh.
  const CHUNK = 500
  for (let i = 0; i < rows.length; i += CHUNK) {
    await onBatch(rows.slice(i, i + CHUNK))
  }
  return rows.length
}

type Admin = ReturnType<typeof createClient>

async function syncIfStale(admin: Admin, force: boolean): Promise<void> {
  const { data: claimed } = await admin.rpc('claim_cpalead_sync', {
    p_max_age_minutes: force ? 0 : SYNC_INTERVAL_MIN,
  })
  if (claimed !== true) return

  // One stamp shared by every batch of this run. finish_cpalead_sync deletes
  // anything older, which is how paused offers leave the catalogue.
  const startedAt = new Date().toISOString()

  try {
    const written = await pullCatalogue(async (rows) => {
      const { error } = await admin.rpc('replace_cpalead_offers', {
        p_offers: rows,
        p_started: startedAt,
      })
      if (error) throw new Error(error.message)
    })
    // A pull that returns nothing is a provider fault, not an empty catalogue.
    // Finishing here would delete every offer we have, so bail and keep them.
    if (written === 0) throw new Error('CPAlead returned an empty catalogue')

    const { error } = await admin.rpc('finish_cpalead_sync', { p_started: startedAt })
    if (error) throw new Error(error.message)
  } catch (error) {
    console.error('CPAlead catalogue sync failed', error)
    await admin.rpc('fail_cpalead_sync', { p_error: String((error as Error).message ?? error) })
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  // API_KEY is not used by the offers endpoint (only conversions and reversals
  // require it), but a deployment missing it has no way to reconcile payouts
  // later, so treat the pair as one piece of configuration.
  if (!PUB_ID || !API_KEY) {
    return json({ status: 'error', error: 'CPAlead offers are awaiting publisher configuration.' })
  }
  // A wrong share silently underpays every worker, so refuse to serve instead.
  if (!Number.isFinite(WORKER_SHARE) || WORKER_SHARE < 0.5 || WORKER_SHARE > 1) {
    console.error('CPAlead worker share out of range — check CPALEAD_WORKER_SHARE', { WORKER_SHARE })
    return json({ status: 'error', error: 'CPAlead offers are awaiting publisher configuration.' })
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const auth = req.headers.get('Authorization') ?? ''
  const { data: userData } = await admin.auth.getUser(auth.replace('Bearer ', ''))
  const userId = userData?.user?.id
  if (!userId) return json({ error: 'Please sign in to load offers.' }, 401)

  let body: { os?: string; force?: boolean } = {}
  try { body = await req.json() } catch { /* defaults are fine */ }
  const os = ['android', 'ios', 'desktop'].includes(body.os ?? '') ? body.os! : 'desktop'

  const ip = clientIp(req)
  const country = await detectCountry(req, ip)
  if (!country) {
    return json({
      status: 'error',
      error: 'We could not verify your country. Please disable VPN and tap Refresh.',
    })
  }

  // A full pull is far too slow to sit in front of a page render, so a refresh
  // normally runs in the background and this visitor is served the catalogue as
  // it stands. The exception is a cold table: with nothing to serve, waiting
  // beats showing an empty wall.
  const { count } = await admin.from('cpalead_offers').select('offer_id', { count: 'exact', head: true })
  const sync = syncIfStale(admin, body.force === true)
  if ((count ?? 0) === 0) await sync
  else EdgeRuntime.waitUntil(sync)

  const { data, error } = await admin.rpc('list_cpalead_offers', {
    p_country: country,
    p_devices: deviceTokens(os),
    p_profile: userId,
    p_limit: 300,
  })
  if (error) {
    console.error('CPAlead offer listing failed', error)
    return json({ status: 'error', error: 'Could not load offers. Please try again.' })
  }

  const offers = (data as Row[] ?? []).map((row) => {
    const amount = num(row.amount) ?? 0
    return {
      offerId: clean(row.offer_id, 120),
      title: clean(row.title, 240),
      description: clean(row.description, 1200),
      requirement: clean(row.conversion, 600),
      category: clean(row.payout_type, 16).toUpperCase(),
      logo: clean(row.image_url, 3000),
      amount,
      rewardUsd: Number((amount * WORKER_SHARE).toFixed(6)),
      fastPay: row.is_fast_pay === true,
    }
  })

  return json({ status: 'success', offers, country, os })
})
