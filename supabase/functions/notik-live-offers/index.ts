// Notik "Live Offers": the campaigns converting best right now for this
// worker's country and device, ranked by Notik over a rolling window.
//
// Unlike notik-offers this is not a catalogue sync. Notik resolves country from
// the caller's IP and device from the User-Agent, so both are forwarded from
// the worker's request, and the click_url comes back already bound to the user
// (a per-user token, no [user_id] macro). The list is therefore never shared
// between workers; Notik caches it 5 minutes per user on their side.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { cors, json } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const API_KEY = Deno.env.get('NOTIK_API_KEY') ?? ''
const APP_ID = Deno.env.get('NOTIK_APP_ID') ?? ''
const PUB_ID = Deno.env.get('NOTIK_PUB_ID') ?? ''
// Money: unlike the catalogue API, this feed reports `payout` (and each
// event's payout) already converted to the app's virtual currency, i.e. coins
// at PAYOUT_RATIO per dollar. Verified against notik_offers for the same
// offer id: catalogue 9.625 USD, live feed 962.5. So coins convert straight
// to the worker's USD at USD_PER_COIN, and USD to Notik is coins / ratio.
const PAYOUT_RATIO = Number(Deno.env.get('NOTIK_PAYOUT_RATIO') ?? '100')
const USD_PER_COIN = Number(Deno.env.get('NOTIK_USD_PER_COIN') ?? '0.008')

const ENDPOINT = 'https://notik.me/api/v1/live-campaigns-for-user'
const DURATIONS = new Set(['24h', '7d', '30d', '60d'])

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
    ? value.flatMap((v) => { const s = clean(v, max); return s ? [s] : [] })
    : []
}

function clientIp(req: Request): string {
  const fwd = req.headers.get('cf-connecting-ip')
    ?? req.headers.get('x-forwarded-for')?.split(',')[0]
    ?? ''
  const ip = fwd.trim().replace(/^\[|\]$/g, '')
  return /^[0-9a-f:.]{3,45}$/i.test(ip) ? ip : ''
}

function steps(raw: unknown): { stepId: string; description: string; rewardUsd: number }[] {
  if (!Array.isArray(raw)) return []
  const out: { stepId: string; description: string; rewardUsd: number }[] = []
  for (const item of raw.slice(0, 40)) {
    if (!item || typeof item !== 'object') continue
    const ev = item as Row
    const description = clean(ev.name ?? ev.event_name, 300)
    if (!description) continue
    out.push({
      stepId: clean(ev.id ?? ev.event_id ?? String(out.length + 1), 120),
      description,
      rewardUsd: Number((num(ev.payout) * USD_PER_COIN).toFixed(6)),
    })
  }
  return out
}

function toPublic(row: Row) {
  const offerId = clean(row.offer_id, 120)
  const clickUrl = clean(row.click_url, 4000)
  const coins = num(row.payout)
  if (!offerId || !clickUrl || coins <= 0) return null
  const offerSteps = steps(row.events)
  return {
    offerId,
    title: clean(row.name, 240),
    description: clean(row.description1, 1200) || clean(row.description2, 1200),
    details: clean(row.description2, 1200),
    category: strings(row.categories, 80)[0] ?? '',
    logo: clean(row.image_url, 3000),
    payout: Number((coins / PAYOUT_RATIO).toFixed(6)),
    rewardCoins: Number(coins.toFixed(2)),
    rewardUsd: Number((coins * USD_PER_COIN).toFixed(6)),
    clickUrl,
    steps: offerSteps,
    multistep: offerSteps.length > 1,
    live: true,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ status: 'error', error: 'Method not allowed' }, 405)

  if (!API_KEY || !APP_ID || !PUB_ID) {
    console.error('Notik secrets are not configured')
    return json({ status: 'error', error: 'Offers are not available right now.' })
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data: auth } = await admin.auth.getUser(token)
  const userId = auth?.user?.id ?? ''
  // 200 with an error payload: functions.invoke discards the body on non-2xx.
  if (!userId) return json({ status: 'error', error: 'Please sign in to see offers.' })

  let duration = '7d'
  let page = 1
  try {
    const body = await req.json() as { duration?: unknown; page?: unknown }
    const d = clean(body?.duration, 4)
    if (DURATIONS.has(d)) duration = d
    const p = Math.floor(num(body?.page))
    if (p >= 1 && p <= 50) page = p
  } catch { /* body is optional */ }

  const url = new URL(ENDPOINT)
  url.searchParams.set('api_key', API_KEY)
  url.searchParams.set('pub_id', PUB_ID)
  url.searchParams.set('app_id', APP_ID)
  url.searchParams.set('user_id', userId)
  url.searchParams.set('duration', duration)
  url.searchParams.set('page', String(page))

  const ip = clientIp(req)
  const headers: Record<string, string> = { Accept: 'application/json' }
  const userAgent = req.headers.get('user-agent') ?? ''
  if (userAgent) headers['User-Agent'] = userAgent
  if (ip) headers['X-Forwarded-For'] = ip

  let payload: Row | null = null
  try {
    const res = await fetch(url, { headers })
    payload = await res.json().catch(() => null) as Row | null
    if (!res.ok || payload?.status !== 'success') {
      console.error('Notik live offers request failed', { status: res.status, message: payload?.message })
      return json({ status: 'error', error: 'Offers could not be loaded. Please try again.' })
    }
  } catch (err) {
    console.error('Notik live offers request threw', { message: String(err) })
    return json({ status: 'error', error: 'Offers could not be loaded. Please try again.' })
  }

  const rows = Array.isArray(payload?.data) ? payload.data as Row[] : []
  const offers = rows.map(toPublic).filter((o) => o !== null)

  return json({
    status: 'success',
    offers,
    duration,
    page,
    lastPage: Math.max(1, Math.floor(num(payload?.last_page)) || 1),
  })
})
