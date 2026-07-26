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

type ProviderOffer = Record<string, unknown>

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  if (!APP_ID || !Number.isFinite(USD_PER_CREDIT) || USD_PER_CREDIT <= 0) {
    return json({ error: 'TaskWall is awaiting publisher configuration' }, 503)
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
  try {
    const body = await req.json()
    if (typeof body?.os === 'string' && ALLOWED_OS.has(body.os)) requestedOs = body.os
  } catch {
    // An empty body simply uses the safe desktop default.
  }

  const providerUrl = new URL(ENDPOINT)
  providerUrl.searchParams.set('app_id', APP_ID)
  providerUrl.searchParams.set('userid', user.id)
  providerUrl.searchParams.set('os', requestedOs)
  // Supabase's edge proxy supplies Cloudflare's trusted two-letter visitor
  // country. Forward it so users never see offers that cannot accept their IP
  // (for example, a US-only offer shown to a visitor in Pakistan).
  const visitorCountry = (req.headers.get('cf-ipcountry') ?? '').trim().toUpperCase()
  if (/^[A-Z]{2}$/.test(visitorCountry) && visitorCountry !== 'XX') {
    providerUrl.searchParams.set('country', visitorCountry)
  }

  let payload: Record<string, unknown>
  try {
    const response = await fetch(providerUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(12_000),
    })
    if (!response.ok) {
      console.error('TaskWall offers request failed', { status: response.status })
      return json({ error: 'TaskWall did not return available offers' }, 502)
    }
    payload = await response.json()
  } catch (error) {
    console.error('Could not fetch TaskWall offers', error)
    return json({ error: 'Could not reach TaskWall' }, 502)
  }

  // TaskWall's live response currently uses `success: true`; its published
  // documentation shows `status: "success"`. Accept both versions.
  if (payload.success !== true && payload.status !== 'success' || !Array.isArray(payload.offers)) {
    console.error('Unexpected TaskWall response', {
      success: payload.success,
      status: payload.status,
    })
    return json({ error: clean(payload.message, 200) || 'TaskWall returned an invalid response' }, 502)
  }

  const offers = (payload.offers as ProviderOffer[]).flatMap((offer) => {
    const link = safeUrl(offer.link)
    const offerId = clean(offer.offer_id, 200)
    const title = clean(offer.title, 240)
    const payout = Number(offer.payout)
    const suppliedUserAmount = Number(offer.user_amount)
    if (!link || !offerId || !title) return []

    // The live API omits user_amount even though the docs include it. With the
    // dashboard's 1000-units-per-USD rate, derive it from publisher payout so
    // the displayed amount matches what the postback will credit.
    const hasUserAmount = Number.isFinite(suppliedUserAmount) && suppliedUserAmount > 0
    const safePayout = Number.isFinite(payout) && payout >= 0 ? payout : 0
    const userAmount = hasUserAmount ? suppliedUserAmount : safePayout / USD_PER_CREDIT
    const reward = hasUserAmount ? userAmount * USD_PER_CREDIT : safePayout

    return [{
      offerId,
      title,
      description: clean(offer.description, 1000),
      conversion: clean(offer.conversion, 300),
      icon: safeUrl(offer.icon),
      link,
      userAmount,
      reward: Number(reward.toFixed(6)),
      payout: safePayout,
      devices: list(offer.devices),
      countries: list(offer.countries ?? offer.available_in),
    }]
  })

  return json({
    status: 'success',
    count: offers.length,
    country: visitorCountry || null,
    os: requestedOs,
    offers,
  })
})
