// Mints a Notik click: records the tap and returns the final offer URL.
//
// The click URL itself is public (the catalogue hands it to the browser), so
// this is not a security boundary. It exists so every opened offer has a row
// tying a worker, an offer and a price to the `s1` value that comes back on the
// postback — without which a "where did my reward go" ticket is unanswerable.
//
// The URL is rebuilt from the stored catalogue rather than trusted from the
// request body: a client could otherwise post any URL and have us record it as
// a legitimate click.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { cors, json } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const PAYOUT_RATIO = Number(Deno.env.get('NOTIK_PAYOUT_RATIO') ?? '100')
const USD_PER_COIN = Number(Deno.env.get('NOTIK_USD_PER_COIN') ?? '0.008')
const WORKER_SHARE = PAYOUT_RATIO * USD_PER_COIN

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const auth = req.headers.get('Authorization') ?? ''
  const { data: userData } = await admin.auth.getUser(auth.replace('Bearer ', ''))
  const userId = userData?.user?.id
  if (!userId) return json({ error: 'Please sign in to open offers.' }, 401)

  let body: { offerId?: unknown; country?: unknown; os?: unknown } = {}
  try { body = await req.json() } catch { /* validated below */ }
  const offerId = typeof body.offerId === 'string' ? body.offerId.trim().slice(0, 120) : ''
  if (!offerId) return json({ status: 'error', error: 'Could not open this offer.' }, 422)

  const { data: offer } = await admin
    .from('notik_offers')
    .select('offer_id,name,click_url,payout')
    .eq('offer_id', offerId)
    .maybeSingle()

  if (!offer?.click_url) {
    return json({ status: 'error', error: 'This offer is no longer available. Please refresh.' })
  }

  const clickId = crypto.randomUUID()
  const payout = Number(offer.payout) || 0
  const entryUrl = String(offer.click_url)
    .replaceAll('[user_id]', encodeURIComponent(userId))
    + `&s1=${encodeURIComponent(clickId)}`

  const { error } = await admin.from('notik_clicks').insert({
    click_id: clickId,
    profile_id: userId,
    offer_id: offer.offer_id,
    offer_name: offer.name,
    payout,
    reward_usd: Number((payout * WORKER_SHARE).toFixed(6)),
    country: typeof body.country === 'string' ? body.country.slice(0, 8) : null,
    device: typeof body.os === 'string' ? body.os.slice(0, 16) : null,
  })
  // Losing the audit row must not block the worker from earning; the postback
  // carries user_id independently, so crediting still works without it.
  if (error) console.error('Could not record Notik click', { offerId, message: error.message })

  return json({ status: 'success', entryUrl })
})
