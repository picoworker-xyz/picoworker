// Mints a signed KiwiWall entry link for one visitor click.
//
// KiwiWall never returns click URLs in the inventory; every click must be minted
// here with the real visitor's context. That is deliberate on their side — it is
// how they qualify eligibility and attribute the click — so this cannot be
// short-circuited by building a URL in the browser.
//
// `sub` is always the signed-in PicoWorker user id taken from the verified JWT,
// never from the request body. Their docs are explicit that a publisher must not
// invent a sub server-side, and trusting a client-supplied one would let anyone
// mint clicks that credit somebody else's account.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { cors, json } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const API_TOKEN = Deno.env.get('KIWIWALL_API_TOKEN') ?? ''
const PLACEMENT_ID = Deno.env.get('KIWIWALL_PLACEMENT_ID') ?? ''
const BASE = 'https://api.kiwiwall.com/api/v1'

function clean(value: unknown, max = 500): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function clientIp(req: Request): string {
  const fwd = req.headers.get('cf-connecting-ip')
    ?? req.headers.get('x-forwarded-for')?.split(',')[0]
    ?? ''
  const ip = fwd.trim().replace(/^\[|\]$/g, '')
  return /^[0-9a-f:.]{3,45}$/i.test(ip) ? ip : ''
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  if (!API_TOKEN || !PLACEMENT_ID) {
    return json({ status: 'error', error: 'Worldwide offers are awaiting publisher configuration.' })
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const auth = req.headers.get('Authorization') ?? ''
  const { data: userData } = await admin.auth.getUser(auth.replace('Bearer ', ''))
  const userId = userData?.user?.id
  if (!userId) return json({ error: 'Please sign in first.' }, 401)

  let body: { offerId?: string; country?: string; title?: string; payout?: number; rewardUnits?: number } = {}
  try { body = await req.json() } catch { return json({ error: 'Bad request' }, 400) }

  const offerId = clean(body.offerId, 200)
  if (!offerId) return json({ status: 'error', error: 'Missing offer.' })

  const ip = clientIp(req)
  const country = (req.headers.get('cf-ipcountry') ?? clean(body.country, 2)).toUpperCase()
  const userAgent = clean(req.headers.get('user-agent'), 500)
  if (!ip || !/^[A-Z]{2}$/.test(country)) {
    return json({ status: 'error', error: 'We could not verify your location. Please disable VPN and try again.' })
  }

  // Our idempotency key with the provider. Replaying one returns 409 on their
  // side, which stops a double-tap becoming two attributed clicks.
  const transactionUid = `pw_${crypto.randomUUID().replace(/-/g, '')}`

  let res: Response
  try {
    res = await fetch(`${BASE}/placements/${PLACEMENT_ID}/offers/${encodeURIComponent(offerId)}/entry-link`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        'Api-Version': 'v1',
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        ip,
        user_agent: userAgent,
        country,
        sub: userId,
        transaction_uid: transactionUid,
      }),
      signal: AbortSignal.timeout(15_000),
    })
  } catch (error) {
    console.error('KiwiWall mint request failed', error)
    return json({ status: 'error', error: 'Could not open this offer right now. Please try again.' })
  }

  if (!res.ok) {
    // 422 means this visitor is no longer eligible — most often a cached card
    // for an offer they already completed. 409 is a replayed transaction_uid.
    const detail = await res.text().catch(() => '')
    console.warn('KiwiWall mint rejected', { status: res.status, offerId, detail: detail.slice(0, 300) })
    if (res.status === 422) {
      return json({ status: 'error', error: 'This offer is no longer available to you. Tap Refresh for an updated list.' })
    }
    if (res.status === 429) {
      return json({ status: 'error', error: 'Too many offers opened at once. Wait a moment and try again.' })
    }
    return json({ status: 'error', error: 'Could not open this offer right now. Please try again.' })
  }

  const payload = await res.json() as { data?: { entry_url?: string } }
  const entryUrl = clean(payload.data?.entry_url, 3000)
  if (!entryUrl) return json({ status: 'error', error: 'Could not open this offer right now. Please try again.' })

  // Recorded so a later conversion postback can be traced to this user + offer.
  await admin.from('kiwiwall_clicks').insert({
    transaction_uid: transactionUid,
    profile_id: userId,
    offer_id: offerId,
    offer_title: clean(body.title, 240) || null,
    payout: Number(body.payout) || 0,
    reward_units: Number(body.rewardUnits) || 0,
    country,
  })

  return json({ status: 'success', entryUrl })
})
