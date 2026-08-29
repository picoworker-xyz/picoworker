// Public Notik server-to-server postback receiver.
//
// Deploy with JWT verification disabled — Notik is the caller. Requests are
// authenticated by a HEX SHA1 HMAC of the full callback URL with the `&hash=`
// parameter stripped from the end, keyed with the App API Secret, and by
// Notik's single published outbound IP.
//
// Notik waits at most 15 seconds and retries a non-200 twice before giving up
// and emailing us, so every terminal condition (duplicate, unknown user) must
// answer 200 rather than make them retry a request that can never succeed.
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const API_SECRET = Deno.env.get('NOTIK_API_SECRET') ?? ''
const APP_ID = Deno.env.get('NOTIK_APP_ID') ?? ''
const PUB_ID = Deno.env.get('NOTIK_PUB_ID') ?? ''
// Netlify proxies picoworker.xyz to Supabase, so req.url carries the Supabase
// host. The hash was computed over the public URL, so it has to be rebuilt.
const PUBLIC_URL = (Deno.env.get('NOTIK_PUBLIC_URL') ?? '').replace(/[?&]+$/, '')
// Notik's published postback source. Their docs name 158.69.116.45 as the only
// address they send from, but their dashboard simultaneously announces that the
// callback IP list has changed without the docs page reflecting it. Rejecting
// on that basis would mean a silent total payout outage the moment they move a
// server, so the list is advisory by default: a mismatch is logged loudly and
// the request still proceeds. The HMAC below is the actual authentication, and
// it does not weaken when an IP changes.
//
// Set NOTIK_POSTBACK_ENFORCE_IP=true to make a mismatch a hard 403 once the
// current list is confirmed with their support.
const ALLOWED_IPS = (Deno.env.get('NOTIK_POSTBACK_IPS') ?? '158.69.116.45')
  .split(',').map((v) => v.trim()).filter(Boolean)
const ENFORCE_IP = (Deno.env.get('NOTIK_POSTBACK_ENFORCE_IP') ?? '').toLowerCase() === 'true'

const USD_PER_COIN = Number(Deno.env.get('NOTIK_USD_PER_COIN') ?? '0.008')
const configuredMax = Number(Deno.env.get('NOTIK_MAX_REWARD') ?? '500')
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

async function hmacSha1Hex(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
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
  if (!API_SECRET || !Number.isFinite(USD_PER_COIN) || USD_PER_COIN <= 0) {
    console.error('Notik secrets are not configured')
    return text('Not configured', 503)
  }

  const ip = clientIp(req)
  if (ALLOWED_IPS.length > 0 && ip && !ALLOWED_IPS.includes(ip)) {
    console.warn('Notik postback from unexpected IP', { ip, allowed: ALLOWED_IPS, enforcing: ENFORCE_IP })
    if (ENFORCE_IP) return text('Forbidden', 403)
  }

  // Their reference implementation hashes the raw URL with the trailing
  // "&hash=<value>" cut off, so the signed string must be taken from the raw
  // query string. Re-serialising through URLSearchParams would re-encode
  // values (RFC1738 spaces as "+", among others) and break every signature.
  const queryAt = req.url.indexOf('?')
  const rawQuery = queryAt >= 0 ? req.url.slice(queryAt) : ''
  const match = /([?&])hash=([^&#]*)$/i.exec(rawQuery)
  if (!match || match.index === undefined) return text('Missing hash', 403)

  const supplied = match[2]
  const signedQuery = rawQuery.slice(0, match.index)
  const signedUrl = PUBLIC_URL
    ? `${PUBLIC_URL}${signedQuery}`
    : (queryAt >= 0 ? req.url.slice(0, queryAt) : req.url) + signedQuery

  const expected = await hmacSha1Hex(signedUrl, API_SECRET)
  if (!timingSafeEqual(supplied.toLowerCase(), expected)) {
    console.warn('Notik hash mismatch', { url: signedUrl })
    return text('Invalid hash', 403)
  }

  const params = new URL(req.url).searchParams
  const field = (name: string) => (params.get(name) ?? '').trim()

  // Guard against a postback aimed at a different app or publisher.
  if (APP_ID && field('app_id') && field('app_id') !== APP_ID) return text('Unknown app', 403)
  if (PUB_ID && field('pub_id') && field('pub_id') !== PUB_ID) return text('Unknown publisher', 403)

  const txnId = field('txn_id')
  if (!txnId || txnId.length > 200) return text('Invalid txn_id', 422)

  // Chargebacks arrive with negative payout and amount, so negatives are valid.
  const payout = Number(field('payout') || '0')
  const coins = Number(field('amount') || '0')
  if (!Number.isFinite(payout) || !Number.isFinite(coins)) return text('Invalid amounts', 422)

  const rewardUsd = coins * USD_PER_COIN
  if (Math.abs(rewardUsd) > MAX_REWARD) {
    console.error('Notik reward above cap', { txnId, coins, rewardUsd })
    return text('Reward above cap', 422)
  }

  const player = field('user_id')
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await admin.rpc('credit_notik_reward', {
    p_txn_id: txnId,
    p_player: validUuid(player) ? player : null,
    p_click_id: field('s1') || null,
    p_offer_id: field('offer_id') || null,
    p_offer_name: field('offer_name') || null,
    p_event_id: field('event_id') || null,
    p_event_name: field('event_name') || null,
    p_payout: payout.toFixed(6),
    p_rewarded: rewardUsd.toFixed(6),
    p_reward_units: coins.toFixed(6),
    p_currency: field('currency_name') || null,
    p_rewarded_txn_id: field('rewarded_txn_id') || null,
    p_ip: field('conversion_ip') || null,
    p_raw: Object.fromEntries(params.entries()),
  })

  if (error) {
    console.error('Could not process Notik postback', { txnId, message: error.message })
    return text('Processing failed', 500)
  }

  console.log('Notik postback processed', { txnId, result: data })
  return text('1')
})
