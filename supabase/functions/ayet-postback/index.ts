// ayet-studios S2S conversion callback (placement 24848).
//
// Every callback carries an X-Ayetstudios-Security-Hash header: HMAC-SHA256,
// keyed with the placement API key, over the GET parameters sorted by key and
// serialised the way PHP's http_build_query does (RFC 1738, spaces as "+").
// That is the authentication; there is no IP allowlist, because the last one
// (Notik) silently rejected every conversion for two weeks.
//
// Chargebacks arrive as a second callback for the same transaction_id with
// is_chargeback=1. Sandbox callbacks carry is_sandbox=1 and are recorded but
// never credited.
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const API_KEY = Deno.env.get('AYET_API_KEY') ?? ''
// Placement currency: 1000 coins = $1. Worker share 80% => $0.0008 per coin.
const USD_PER_COIN = Number(Deno.env.get('AYET_USD_PER_COIN') ?? '0.0008')
const configuredMax = Number(Deno.env.get('AYET_MAX_REWARD') ?? '500')
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

/** PHP urlencode(): RFC 1738, so spaces become "+" and !'()* are escaped. */
function phpUrlencode(value: string): string {
  return encodeURIComponent(value)
    .replace(/%20/g, '+')
    .replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())
    .replace(/~/g, '%7E')
}

async function hmacSha256Hex(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}

Deno.serve(async (req) => {
  if (req.method !== 'GET') return text('Method not allowed', 405)
  if (!API_KEY) {
    console.error('AYET_API_KEY is not configured')
    return text('Not configured', 500)
  }

  const params = new URL(req.url).searchParams
  const field = (name: string) => (params.get(name) ?? '').trim()

  const supplied = (req.headers.get('x-ayetstudios-security-hash') ?? '').trim().toLowerCase()
  if (!supplied) return text('Missing signature', 403)
  const sorted = Array.from(params.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${phpUrlencode(k)}=${phpUrlencode(v)}`)
    .join('&')
  const expected = await hmacSha256Hex(sorted, API_KEY)
  if (!timingSafeEqual(supplied, expected)) {
    console.warn('ayet signature mismatch', { sorted })
    return text('Invalid signature', 403)
  }

  const transactionId = field('transaction_id')
  if (!transactionId || transactionId.length > 200) return text('Invalid transaction_id', 422)

  const payoutUsd = Number(field('payout_usd') || '0')
  const coins = Number(field('currency_amount') || '0')
  if (!Number.isFinite(payoutUsd) || !Number.isFinite(coins)) return text('Invalid amounts', 422)

  const rewardUsd = Math.abs(coins) * USD_PER_COIN
  if (rewardUsd > MAX_REWARD) {
    console.error('ayet reward above cap', { transactionId, coins, rewardUsd })
    return text('Reward above cap', 422)
  }

  const chargeback = field('chargeback') === '1' || field('is_chargeback') === '1'
  const sandbox = field('is_sandbox') === '1'
  const player = field('uid')

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await admin.rpc('credit_ayet_reward', {
    p_transaction_id: transactionId,
    p_player: validUuid(player) ? player : null,
    p_offer_id: field('offer_id') || null,
    p_offer_name: field('offer_name') || null,
    p_payout_usd: Math.abs(payoutUsd).toFixed(6),
    p_currency_amount: coins.toFixed(6),
    p_rewarded: rewardUsd.toFixed(6),
    p_chargeback: chargeback,
    p_sandbox: sandbox,
    p_ip: field('ip') || null,
    p_raw: Object.fromEntries(params.entries()),
  })

  if (error) {
    console.error('Could not process ayet callback', { transactionId, message: error.message })
    return text('Processing failed', 500)
  }

  console.log('ayet callback processed', { transactionId, chargeback, sandbox, result: data })
  return text('OK')
})
