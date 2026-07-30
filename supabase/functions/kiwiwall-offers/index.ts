// Authenticated KiwiWall Publisher API proxy.
//
// The API token never reaches the browser. This function pulls the inventory
// for the caller's country + device, caches it, and returns a publisher-safe
// list. Click URLs are deliberately absent: KiwiWall does not put them in the
// inventory response, and every click must go through the separate entry-link
// mint (see the kiwiwall-entry function).
import { createClient } from 'npm:@supabase/supabase-js@2'
import { cors, json } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const API_TOKEN = Deno.env.get('KIWIWALL_API_TOKEN') ?? ''
const PLACEMENT_ID = Deno.env.get('KIWIWALL_PLACEMENT_ID') ?? ''
const USD_PER_CREDIT = Number(Deno.env.get('KIWIWALL_USD_PER_CREDIT') ?? '')
const BASE = 'https://api.kiwiwall.com/api/v1'

// Their pull limit is ~10/min for the whole token, so this cache is what makes
// the integration viable at all. 30 minutes matches the TaskWall proxy.
const CACHE_TTL_MS = 30 * 60 * 1000

type PublicOffer = {
  offerId: string
  title: string
  description: string
  kpi: string
  category: string
  logo: string
  payout: number
  rewardUnits: number
  rewardUsd: number
}

function clean(value: unknown, max = 500): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function num(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/** KiwiWall wants `mobile` or `desktop`; we track android/ios/desktop. */
function providerDevice(os: string): 'mobile' | 'desktop' {
  return os === 'android' || os === 'ios' ? 'mobile' : 'desktop'
}

function clientIp(req: Request): string {
  const fwd = req.headers.get('cf-connecting-ip')
    ?? req.headers.get('x-forwarded-for')?.split(',')[0]
    ?? ''
  const ip = fwd.trim().replace(/^\[|\]$/g, '')
  return /^[0-9a-f:.]{3,45}$/i.test(ip) ? ip : ''
}

async function detectCountry(req: Request, ip: string): Promise<string> {
  const header = (req.headers.get('cf-ipcountry') ?? '').trim().toUpperCase()
  if (/^[A-Z]{2}$/.test(header) && header !== 'XX') return header
  if (!ip) return ''
  try {
    const res = await fetch(`https://ipapi.co/${ip}/country/`, {
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return ''
    const c = (await res.text()).trim().toUpperCase()
    return /^[A-Z]{2}$/.test(c) && c !== 'XX' ? c : ''
  } catch {
    return ''
  }
}

async function pullOffers(country: string, device: string, ip: string, sub: string): Promise<PublicOffer[]> {
  const url = new URL(`${BASE}/placements/${PLACEMENT_ID}/offers`)
  // country, device and ip are required on every pull — missing gives 422.
  url.searchParams.set('country', country)
  url.searchParams.set('device', device)
  url.searchParams.set('ip', ip)
  url.searchParams.set('sub', sub)
  url.searchParams.set('per_page', '100')
  url.searchParams.set('sort', 'payout_desc')

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      'Api-Version': 'v1',
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`KiwiWall HTTP ${res.status}`)

  const payload = await res.json() as { error?: boolean; data?: unknown; message?: string }
  if (payload.error === true || !Array.isArray(payload.data)) {
    throw new Error(clean(payload.message, 200) || 'KiwiWall returned an invalid response')
  }

  return (payload.data as Record<string, unknown>[]).flatMap((raw): PublicOffer[] => {
    const offerId = clean(raw.id, 200)
    const title = clean(raw.title, 240)
    if (!offerId || !title) return []
    // Their docs show `payout` as an object, but the live API returns an ARRAY
    // of payout tiers: [{amount, currency, type, model}]. Reading it as an
    // object yields undefined and every payout becomes 0, so take the first
    // tier. `reward` really is a plain object.
    const payoutTiers = Array.isArray(raw.payout) ? raw.payout as Record<string, unknown>[] : []
    const payout = payoutTiers.length > 0 ? num(payoutTiers[0].amount) : 0
    const reward = raw.reward as Record<string, unknown> | undefined
    const category = raw.category as Record<string, unknown> | undefined
    const rewardUnits = num(reward?.amount)
    return [{
      offerId,
      title,
      description: clean(raw.description, 1000),
      kpi: clean(raw.kpi, 1000),
      category: clean(category?.name, 80),
      logo: clean(raw.logo, 3000),
      payout,
      rewardUnits,
      // What the worker will actually be credited, so the card and the wallet
      // agree. The provider's postback is converted the same way.
      rewardUsd: Number((rewardUnits * USD_PER_CREDIT).toFixed(6)),
    }]
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  if (!API_TOKEN || !PLACEMENT_ID || !Number.isFinite(USD_PER_CREDIT) || USD_PER_CREDIT <= 0) {
    return json({ error: 'Worldwide offers are awaiting publisher configuration' }, 503)
  }

  const auth = req.headers.get('Authorization') ?? ''
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData } = await admin.auth.getUser(auth.replace('Bearer ', ''))
  const userId = userData?.user?.id
  if (!userId) return json({ error: 'Please sign in to load offers.' }, 401)

  let body: { os?: string; force?: boolean } = {}
  try { body = await req.json() } catch { /* defaults are fine */ }
  const os = ['android', 'ios', 'desktop'].includes(body.os ?? '') ? body.os! : 'desktop'
  const device = providerDevice(os)

  const ip = clientIp(req)
  const country = await detectCountry(req, ip)
  if (!country || !ip) {
    return json({ error: 'Could not determine your country. Please disable any VPN and retry.' }, 422)
  }

  const cached = await admin
    .from('kiwiwall_offer_cache')
    .select('offers,fetched_at')
    .eq('country', country)
    .eq('device', device)
    .maybeSingle()

  const age = cached.data?.fetched_at
    ? Date.now() - Date.parse(cached.data.fetched_at)
    : Number.POSITIVE_INFINITY
  if (!body.force && Array.isArray(cached.data?.offers) && age < CACHE_TTL_MS) {
    return json({ status: 'success', offers: cached.data.offers, country, os, cached: true })
  }

  try {
    const offers = await pullOffers(country, device, ip, userId)
    await admin.from('kiwiwall_offer_cache').upsert({
      country, device, offers, fetched_at: new Date().toISOString(),
    })
    // Economics guard. `reward` depends on the placement's exchange rate, set
    // in KiwiWall's dashboard, not by us. If that rate is wrong the arithmetic
    // still "works" and we would silently pay a fraction of what we owe — at a
    // 1:1 rate with USD_PER_CREDIT 0.01 a $48 offer credits $0.48. Refuse to
    // serve rather than underpay: an empty page is recoverable, quietly
    // shortchanging every worker is not.
    const priced = offers.filter((o) => o.payout > 0)
    if (priced.length > 0) {
      const share = priced.reduce((sum, o) => sum + o.rewardUsd / o.payout, 0) / priced.length
      if (share < 0.5 || share > 1) {
        console.error('KiwiWall reward share out of range — check the placement exchange rate', {
          share, sample: priced.slice(0, 3).map((o) => ({ payout: o.payout, rewardUsd: o.rewardUsd })),
        })
        return json({ error: 'Worldwide offers are awaiting publisher configuration' }, 503)
      }
    }

    return json({ status: 'success', offers, country, os, cached: false })
  } catch (error) {
    console.error('KiwiWall offers pull failed', error)
    // Rate limited or provider down: serve stale rather than an empty page.
    if (Array.isArray(cached.data?.offers)) {
      return json({ status: 'success', offers: cached.data.offers, country, os, cached: true })
    }
    return json({ status: 'error', error: 'Could not load offers. Please try again.' })
  }
})
