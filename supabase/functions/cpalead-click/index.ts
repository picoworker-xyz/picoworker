// Mints a CPAlead click: records the tap and returns the final offer URL.
//
// The offer link itself is public, so this is not a security boundary. It exists
// so every opened offer has a row tying a worker, an offer and a price to the
// `subid` that comes back on the postback — without which a "where did my
// reward go" ticket is unanswerable.
//
// The URL is rebuilt from the stored catalogue rather than trusted from the
// request body: a client could otherwise post any URL and have us record it as
// a legitimate click.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { cors, json } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const WORKER_SHARE = Number(Deno.env.get('CPALEAD_WORKER_SHARE') ?? '0.8')

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
    .from('cpalead_offers')
    .select('offer_id,title,link,amount')
    .eq('offer_id', offerId)
    .maybeSingle()

  if (!offer?.link) {
    return json({ status: 'error', error: 'This offer is no longer available. Please refresh.' })
  }

  const clickId = crypto.randomUUID()
  const amount = Number(offer.amount) || 0

  // subid is the click id, which is what CPAlead's {subid} macro returns and
  // the finest-grained thing we can attribute a conversion to. subid2 carries
  // the profile id as well, so a conversion is still creditable if the click
  // row is ever missing. Anything already on their link is preserved.
  const entryUrl = new URL(String(offer.link))
  entryUrl.searchParams.set('subid', clickId)
  entryUrl.searchParams.set('subid2', userId)

  const { error } = await admin.from('cpalead_clicks').insert({
    click_id: clickId,
    profile_id: userId,
    offer_id: offer.offer_id,
    offer_name: offer.title,
    amount,
    reward_usd: Number((amount * WORKER_SHARE).toFixed(6)),
    country: typeof body.country === 'string' ? body.country.slice(0, 8) : null,
    device: typeof body.os === 'string' ? body.os.slice(0, 16) : null,
  })
  // Losing the audit row must not block the worker from earning; subid2 carries
  // the profile id independently, so crediting still works without it.
  if (error) console.error('Could not record CPAlead click', { offerId, message: error.message })

  return json({ status: 'success', entryUrl: entryUrl.toString() })
})
