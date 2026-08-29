// Authenticated Notik All Offers API proxy.
//
// Notik hands out the whole catalogue unfiltered and expects the publisher to
// store and filter it, so this function does two separate jobs:
//
//   1. Keep `notik_offers` fresh. The pull is paginated (1000 per page,
//      follow next_page_url until null), rate limited to 30 requests per 15
//      minutes for the entire app, and their docs ask for a 15 minute refresh
//      cadence. Whichever request finds the catalogue stale claims the sync
//      lock and refreshes; everyone else serves what is stored.
//   2. Return the slice of it this visitor is eligible for, with the click URL
//      personalised. Notik's click_url ships with a literal `[user_id]`
//      placeholder that must be replaced with a stable per-user id, and `&s1=`
//      carries our own click id back on the postback.
//
// The API key and secret never reach the browser.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { cors, json } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const API_KEY = Deno.env.get('NOTIK_API_KEY') ?? ''
const PUB_ID = Deno.env.get('NOTIK_PUB_ID') ?? ''
const APP_ID = Deno.env.get('NOTIK_APP_ID') ?? ''

// Coins per USD of payout, set as "Payout Ratio" on the app in Notik's
// dashboard. Notik computes the `amount` it promises the visitor as
// payout * ratio, so this must match the dashboard or the cards misprice.
const PAYOUT_RATIO = Number(Deno.env.get('NOTIK_PAYOUT_RATIO') ?? '100')
// What one coin is worth to us in dollars. ratio * this is the worker's share
// of the payout; 100 * 0.008 leaves the usual 80/20 split.
const USD_PER_COIN = Number(Deno.env.get('NOTIK_USD_PER_COIN') ?? '0.008')
const WORKER_SHARE = PAYOUT_RATIO * USD_PER_COIN

const BASE = 'https://notik.me/api/v2/get-offers/all'
const SYNC_INTERVAL_MIN = 15
// Their limit is 30 requests per 15 minutes for the whole app. One sync must
// never be able to eat it, so the page walk is capped well below that.
const MAX_PAGES = 20

// Supabase's Deno runtime global for work that should outlive the response.
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void }

type Row = Record<string, unknown>

function clean(value: unknown, max = 500): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function num(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function strings(value: unknown, max = 40): string[] {
  return Array.isArray(value)
    ? value.flatMap((v) => {
      const s = clean(v, max)
      return s ? [s] : []
    })
    : []
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

/** Notik targets `desktop` / `tablet` / `mobile`; we track android/ios/desktop. */
function providerDevice(os: string): 'mobile' | 'desktop' {
  return os === 'android' || os === 'ios' ? 'mobile' : 'desktop'
}

/** Their `os` array uses "mac os x" and "windows" for what we call desktop. */
function providerOs(os: string, ua: string): string {
  if (os === 'android') return 'android'
  if (os === 'ios') return 'ios'
  return /mac os|macintosh/i.test(ua) ? 'mac os x' : /linux/i.test(ua) ? 'linux' : 'windows'
}

/**
 * Walk next_page_url until it is null, handing each page to `onPage`.
 *
 * The live catalogue is ~5000 offers over 6 pages and about 11 MB of JSON, so
 * pages are handed off as they arrive rather than accumulated: buffering the
 * whole catalogue would put the function's memory ceiling on the critical path
 * of every refresh for no benefit.
 */
async function pullCatalogue(onPage: (rows: Row[]) => Promise<void>): Promise<number> {
  const first = new URL(BASE)
  first.searchParams.set('api_key', API_KEY)
  first.searchParams.set('pub_id', PUB_ID)
  first.searchParams.set('app_id', APP_ID)

  let next: string | null = first.toString()
  let total = 0

  for (let page = 0; page < MAX_PAGES && next; page += 1) {
    const res: Response = await fetch(next, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) throw new Error(`Notik HTTP ${res.status}`)

    const payload = await res.json() as {
      status?: string
      offers?: { data?: unknown; next_page_url?: unknown }
    }
    if (payload.status !== 'success' || !Array.isArray(payload.offers?.data)) {
      throw new Error('Notik returned an invalid response')
    }

    const rows = (payload.offers.data as Row[]).flatMap((raw) => {
      const row = normalise(raw)
      return row ? [row] : []
    })
    if (rows.length > 0) {
      await onPage(rows)
      total += rows.length
    }

    const url = payload.offers.next_page_url
    // Only follow their own host, never an arbitrary URL from the response.
    next = typeof url === 'string' && url.startsWith('https://notik.me/') ? url : null
  }

  return total
}

/** Trim a raw offer to the columns replace_notik_offers reads. */
function normalise(raw: Row): Row | null {
  const offerId = clean(raw.offer_id, 120)
  const name = clean(raw.name, 240)
  const clickUrl = clean(raw.click_url, 4000)
  if (!offerId || !name || !clickUrl.startsWith('http')) return null

  return {
    offer_id: offerId,
    name,
    image_url: clean(raw.image_url, 3000),
    click_url: clickUrl,
    categories: strings(raw.categories, 80),
    country_code: strings(raw.country_code, 8),
    devices: strings(raw.devices, 20),
    platforms: strings(raw.platforms, 20),
    os: strings(raw.os, 20),
    description1: clean(raw.description1, 1200),
    description2: clean(raw.description2, 1200),
    description3: clean(raw.description3, 1200),
    payout: num(raw.payout),
    events: Array.isArray(raw.events) ? raw.events : [],
  }
}

type Admin = ReturnType<typeof createClient>

async function syncIfStale(admin: Admin, force: boolean): Promise<void> {
  const { data: claimed } = await admin.rpc('claim_notik_sync', {
    p_max_age_minutes: force ? 0 : SYNC_INTERVAL_MIN,
  })
  if (claimed !== true) return

  // One stamp shared by every page of this run. finish_notik_sync deletes
  // anything older, which is how disabled offers leave the catalogue.
  const startedAt = new Date().toISOString()

  try {
    const written = await pullCatalogue(async (rows) => {
      const { error } = await admin.rpc('replace_notik_offers', {
        p_offers: rows,
        p_started: startedAt,
      })
      if (error) throw new Error(error.message)
    })
    // A pull that returns nothing is a provider fault, not an empty catalogue.
    // Finishing here would delete every offer we have, so bail and keep them.
    if (written === 0) throw new Error('Notik returned an empty catalogue')

    const { error } = await admin.rpc('finish_notik_sync', { p_started: startedAt })
    if (error) throw new Error(error.message)
  } catch (error) {
    console.error('Notik catalogue sync failed', error)
    await admin.rpc('fail_notik_sync', { p_error: String((error as Error).message ?? error) })
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  if (!API_KEY || !PUB_ID || !APP_ID) {
    return json({ status: 'error', error: 'Notik offers are awaiting publisher configuration.' })
  }
  // A wrong rate silently underpays every worker, so refuse to serve instead.
  if (!Number.isFinite(WORKER_SHARE) || WORKER_SHARE < 0.5 || WORKER_SHARE > 1) {
    console.error('Notik worker share out of range — check NOTIK_PAYOUT_RATIO and NOTIK_USD_PER_COIN', {
      PAYOUT_RATIO, USD_PER_COIN, WORKER_SHARE,
    })
    return json({ status: 'error', error: 'Notik offers are awaiting publisher configuration.' })
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

  // Six sequential pages of ~2 MB is far too slow to sit in front of a page
  // render, so a refresh normally runs in the background and this visitor is
  // served the catalogue as it stands. The exception is a cold table: with
  // nothing to serve, waiting beats showing an empty wall.
  const { count } = await admin.from('notik_offers').select('offer_id', { count: 'exact', head: true })
  const sync = syncIfStale(admin, body.force === true)
  if ((count ?? 0) === 0) await sync
  else EdgeRuntime.waitUntil(sync)

  const { data, error } = await admin.rpc('list_notik_offers', {
    p_country: country,
    p_device: providerDevice(os),
    p_os: providerOs(os, req.headers.get('user-agent') ?? ''),
    p_profile: userId,
    p_limit: 300,
  })
  if (error) {
    console.error('Notik offer listing failed', error)
    return json({ status: 'error', error: 'Could not load offers. Please try again.' })
  }

  const offers = (data as Row[] ?? []).map((row) => {
    const payout = num(row.payout)
    // `[user_id]` is a literal placeholder in Notik's click URL and must carry
    // a stable per-user id — it is what comes back on the postback. The `&s1=`
    // click id is added at tap time by the notik-click function, so we do not
    // mint 300 of them for cards nobody opens.
    const clickUrl = clean(row.click_url, 4000).replaceAll('[user_id]', encodeURIComponent(userId))

    return {
      offerId: clean(row.offer_id, 120),
      title: clean(row.name, 240),
      description: clean(row.description1, 1200) || clean(row.description2, 1200),
      details: clean(row.description2, 1200),
      category: strings(row.categories, 80)[0] ?? '',
      logo: clean(row.image_url, 3000),
      payout,
      rewardCoins: Number((payout * PAYOUT_RATIO).toFixed(2)),
      rewardUsd: Number((payout * WORKER_SHARE).toFixed(6)),
      clickUrl,
    }
  })

  return json({ status: 'success', offers, country, os })
})
