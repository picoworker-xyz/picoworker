// Public CPAlead server-to-server postback receiver.
//
// Deploy with JWT verification disabled — CPAlead is the caller. Their publisher
// callback has no request signature and no headers to check, so it is
// authenticated by two things: the shared Postback Password set in their
// dashboard Configuration, compared in constant time, and their single relay
// source IP.
//
// CPAlead wants a 2xx well within 15 seconds and retries 408, 425, 429 and 5xx,
// so every terminal condition (duplicate, unknown user, zero payout) must answer
// 200 rather than make them retry a request that can never succeed.
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const POSTBACK_PASSWORD = Deno.env.get('CPALEAD_POSTBACK_PASSWORD') ?? ''
const WORKER_SHARE = Number(Deno.env.get('CPALEAD_WORKER_SHARE') ?? '0.8')
// CPAlead's documented relay source. Enforced, because the password is the only
// other credential and it travels in a query string; CPALEAD_POSTBACK_ENFORCE_IP
// =false downgrades it to a logged warning if they ever move without notice,
// which would otherwise be a total payout outage.
const ALLOWED_IPS = (Deno.env.get('CPALEAD_POSTBACK_IPS') ?? '34.69.179.33')
  .split(',').map((v) => v.trim()).filter(Boolean)
const ENFORCE_IP = (Deno.env.get('CPALEAD_POSTBACK_ENFORCE_IP') ?? 'true').toLowerCase() !== 'false'

const configuredMax = Number(Deno.env.get('CPALEAD_MAX_REWARD') ?? '500')
const MAX_REWARD = Number.isFinite(configuredMax) && configuredMax > 0 ? configuredMax : 500

function text(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

function validUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

function clientIp(req: Request): string {
  const fwd = req.headers.get('cf-connecting-ip')
    ?? req.headers.get('x-forwarded-for')?.split(',')[0]
    ?? ''
  return fwd.trim().replace(/^\[|\]$/g, '')
}

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const x = enc.encode(a)
  const y = enc.encode(b)
  let diff = x.length ^ y.length
  const n = Math.max(x.length, y.length)
  for (let i = 0; i < n; i += 1) diff |= (x[i] ?? 0) ^ (y[i] ?? 0)
  return diff === 0
}

Deno.serve(async (req) => {
  if (req.method !== 'GET') return text('Method not allowed', 405)
  if (!POSTBACK_PASSWORD || !Number.isFinite(WORKER_SHARE) || WORKER_SHARE < 0.5 || WORKER_SHARE > 1) {
    console.error('CPAlead postback secrets are not configured')
    return text('Not configured', 503)
  }

  const ip = clientIp(req)
  if (ALLOWED_IPS.length > 0 && ip && !ALLOWED_IPS.includes(ip)) {
    console.warn('CPAlead postback from unexpected IP', { ip, allowed: ALLOWED_IPS, enforcing: ENFORCE_IP })
    if (ENFORCE_IP) return text('Forbidden', 403)
  }

  const params = new URL(req.url).searchParams
  const field = (name: string, alias?: string) =>
    (params.get(name) ?? (alias ? params.get(alias) : null) ?? '').trim()

  if (!timingSafeEqual(field('password'), POSTBACK_PASSWORD)) {
    console.warn('CPAlead postback password mismatch', { ip })
    return text('Forbidden', 403)
  }

  // Their docs name lead_id as the macro to dedup retries on, so it is required
  // even though the callback will fire without it if the macro is left out of
  // the configured URL.
  const leadId = field('lead_id', 'transaction_id')
  if (!leadId || leadId.length > 200) return text('Invalid lead_id', 422)

  // For an event conversion the money that changed hands is the event's payout;
  // {payout} may still carry the campaign's headline figure.
  const eventPayout = Number(field('event_payout', 'event_amount') || '0')
  const basePayout = Number(field('payout', 'amount') || '0')
  const gross = Number.isFinite(eventPayout) && eventPayout > 0 ? eventPayout : basePayout
  if (!Number.isFinite(gross)) return text('Invalid payout', 422)

  const rewardUsd = gross * WORKER_SHARE
  if (Math.abs(rewardUsd) > MAX_REWARD) {
    console.error('CPAlead reward above cap', { leadId, gross, rewardUsd })
    return text('Reward above cap', 422)
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // subid is our click id and the precise attribution; subid2 is the profile id
  // and the fallback for a conversion whose click row never landed.
  const subid = field('subid')
  const clickId = validUuid(subid) ? subid : null
  let player: string | null = null
  if (clickId) {
    const { data } = await admin
      .from('cpalead_clicks')
      .select('profile_id')
      .eq('click_id', clickId)
      .maybeSingle()
    player = (data?.profile_id as string | undefined) ?? null
  }
  if (!player) {
    const subid2 = field('subid2')
    if (validUuid(subid2)) player = subid2
  }

  const { data, error } = await admin.rpc('credit_cpalead_reward', {
    p_lead_id: leadId,
    p_player: player,
    p_click_id: clickId,
    p_offer_id: field('campaign_id', 'offer_id') || null,
    p_offer_name: field('campaign_name', 'offer_name') || null,
    p_event_key: field('event_key') || null,
    p_event_name: field('event_name', 'event_label') || null,
    p_payout: gross.toFixed(6),
    p_rewarded: rewardUsd.toFixed(6),
    p_gateway_id: field('gateway_id') || null,
    p_country: field('country_iso', 'country_code') || null,
    p_ip: field('ip_address', 'ip') || null,
    // The password rides in the query string, so it must not be archived with
    // the rest of the payload.
    p_raw: Object.fromEntries([...params.entries()].filter(([k]) => k !== 'password')),
  })

  if (error) {
    console.error('Could not process CPAlead postback', { leadId, message: error.message })
    return text('Processing failed', 500)
  }

  console.log('CPAlead postback processed', { leadId, result: data })
  return text('1')
})
