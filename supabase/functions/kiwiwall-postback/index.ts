// Public KiwiWall server-to-server postback receiver.
//
// Deploy with JWT verification disabled — KiwiWall is the caller. Requests are
// authenticated by an HMAC-SHA256 signature over the payload, and optionally by
// KiwiWall's published outbound IP ranges.
//
// Accepts both transports KiwiWall offers: GET with a query string, and POST
// with a JSON body. The field set is identical.
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SIGNING_SECRET = Deno.env.get('KIWIWALL_SIGNING_SECRET') ?? ''
const PLACEMENT_ID = Deno.env.get('KIWIWALL_PLACEMENT_ID') ?? ''
// rewarded_amount arrives in the PLACEMENT'S virtual currency, not USD — their
// own sample sends rewarded_amount 100.0000 against earned_amount 1.2500. This
// rate converts a unit to dollars and must match the placement's exchange rate
// in the KiwiWall dashboard, or workers are paid the wrong amount.
const USD_PER_CREDIT = Number(Deno.env.get('KIWIWALL_USD_PER_CREDIT') ?? '')
const configuredMax = Number(Deno.env.get('KIWIWALL_MAX_REWARD') ?? '500')
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

/**
 * Rebuild KiwiWall's canonical string: every field except `signature`, sorted
 * alphabetically by key, joined as a query string.
 *
 * Their reference implementation is PHP's http_build_query, which uses RFC1738
 * encoding. JavaScript's URLSearchParams matches it for spaces (`+`) but not
 * for every character — PHP percent-encodes `~` and `*` where JS does not. We
 * therefore encode by hand rather than trusting URLSearchParams, because a
 * single unusual character in an advertiser-supplied offer_name would otherwise
 * produce a mismatch and silently reject a real conversion.
 */
function rfc1738(value: string): string {
  return encodeURIComponent(value)
    .replace(/[!'()*~]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())
    .replace(/%20/g, '+')
}

function canonical(fields: Record<string, string>): string {
  return Object.keys(fields)
    .filter((k) => k !== 'signature')
    .sort()
    .map((k) => `${rfc1738(k)}=${rfc1738(fields[k])}`)
    .join('&')
}

async function hmacHex(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
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
  if (req.method !== 'GET' && req.method !== 'POST') return text('Method not allowed', 405)
  if (!SIGNING_SECRET || !Number.isFinite(USD_PER_CREDIT) || USD_PER_CREDIT <= 0) {
    console.error('KiwiWall secrets are not configured')
    return text('Not configured', 503)
  }

  // Collect the payload from whichever transport the placement is set to.
  let fields: Record<string, string> = {}
  try {
    if (req.method === 'GET') {
      fields = Object.fromEntries(new URL(req.url).searchParams.entries())
    } else {
      const body = await req.json() as Record<string, unknown>
      for (const [k, v] of Object.entries(body)) {
        if (v !== null && v !== undefined) fields[k] = String(v)
      }
    }
  } catch {
    return text('Bad payload', 400)
  }

  const supplied = fields.signature ?? ''
  if (!supplied) return text('Missing signature', 403)
  const expected = await hmacHex(canonical(fields), SIGNING_SECRET)
  if (!timingSafeEqual(supplied.toLowerCase(), expected)) {
    console.warn('KiwiWall signature mismatch', { click_id: fields.click_id })
    return text('Invalid signature', 403)
  }

  // Guard against a postback aimed at a different placement.
  if (PLACEMENT_ID && fields.placement_id && fields.placement_id !== PLACEMENT_ID) {
    return text('Unknown placement', 403)
  }

  const clickId = (fields.click_id ?? '').trim()
  if (!clickId || clickId.length > 200) return text('Invalid click_id', 422)

  const status = Number(fields.status)
  if (!Number.isInteger(status) || status < 0 || status > 6) return text('Invalid status', 422)

  // sub_id carries the PicoWorker user id we put on the wall URL.
  const player = (fields.sub_id ?? '').trim()
  const earned = Number(fields.earned_amount ?? '0')
  const rewarded = Number(fields.rewarded_amount ?? '0')
  if (!Number.isFinite(earned) || !Number.isFinite(rewarded) || earned < 0 || rewarded < 0) {
    return text('Invalid amounts', 422)
  }
  // Convert the provider's virtual currency into the dollars we actually credit.
  const rewardedUsd = rewarded * USD_PER_CREDIT
  if (!Number.isFinite(rewardedUsd) || rewardedUsd > MAX_REWARD) {
    console.error('KiwiWall reward above cap', { clickId, rewarded, rewardedUsd })
    return text('Reward above cap', 422)
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await admin.rpc('credit_kiwiwall_reward', {
    p_click_id: clickId,
    p_status: status,
    p_player: validUuid(player) ? player : null,
    p_offer_id: fields.offer_id ?? null,
    p_offer_name: fields.offer_name ?? null,
    p_category: fields.category ?? null,
    p_earned: earned.toFixed(6),
    p_rewarded: rewardedUsd.toFixed(6),
    p_reward_units: rewarded.toFixed(6),
    p_currency: fields.currency ?? null,
    p_country: fields.country_code ?? null,
    p_ip: fields.ip_address ?? null,
    p_raw: fields,
  })

  if (error) {
    console.error('Could not process KiwiWall postback', { clickId, status, message: error.message })
    return text('Processing failed', 500)
  }

  console.log('KiwiWall postback processed', { clickId, status, result: data })
  return text('ok')
})
