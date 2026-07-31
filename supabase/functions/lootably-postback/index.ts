// Public Lootably server-to-server postback receiver.
//
// Deploy with JWT verification disabled — Lootably is the caller. Requests are
// authenticated by the SHA-256 hash they append as `hash`.
//
// Lootably sends GET only, but POST is accepted too so a manual replay during
// debugging does not need a hand-built query string.
//
// IMPORTANT: Lootably requires the response body to be exactly "1" on success.
// Anything else is treated as a failure and, if retries are enabled on the
// placement, will be redelivered. We therefore return "1" for every outcome we
// have durably recorded — including a duplicate, a chargeback, and an unknown
// user — and a non-"1" body only when a retry could actually succeed.
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const POSTBACK_SECRET = Deno.env.get('LOOTABLY_POSTBACK_SECRET') ?? ''
const configuredMax = Number(Deno.env.get('LOOTABLY_MAX_REVENUE') ?? '500')
const MAX_REVENUE = Number.isFinite(configuredMax) && configuredMax > 0 ? configuredMax : 500

function text(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

// Lootably reads the body literally: "1" means handled, anything else means
// failed and is retried up to the placement's retry limit. So every outcome we
// have durably recorded returns "1" — duplicates, chargebacks and unknown users
// included — and only genuinely transient failures return "0" to earn a retry.
const ack = () => text('1')
const retry = (why: string, status = 500) => {
  console.warn('Lootably postback not acknowledged', { why })
  return text('0', status)
}

function validUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

async function sha256Hex(message: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
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
  if (req.method !== 'GET' && req.method !== 'POST') return retry('method not allowed', 405)
  if (!POSTBACK_SECRET) {
    console.error('LOOTABLY_POSTBACK_SECRET is not configured')
    return retry('secret not configured', 503)
  }

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
    return retry('bad payload', 400)
  }

  // Lootably's signature is a plain SHA-256 of four values concatenated in a
  // fixed order with the secret — not an HMAC, and not sorted like KiwiWall's.
  // The values must be hashed exactly as they arrived on the wire: reformatting
  // a number (0.5 vs 0.50) changes the digest and rejects a real conversion.
  const supplied = (fields.hash ?? '').trim()
  if (!supplied) return retry('missing hash', 403)
  const canonical = `${fields.userID ?? ''}${fields.ip ?? ''}${fields.revenue ?? ''}${fields.currencyReward ?? ''}${POSTBACK_SECRET}`
  const expected = await sha256Hex(canonical)
  if (!timingSafeEqual(supplied.toLowerCase(), expected)) {
    console.warn('Lootably hash mismatch', { transactionID: fields.transactionID })
    return retry('invalid hash', 403)
  }

  const transactionId = (fields.transactionID ?? '').trim()
  if (!transactionId || transactionId.length > 200) return retry('invalid transactionID', 422)

  // "1" completion, "0" chargeback. Anything else is a contract change we should
  // notice rather than silently treat as one or the other.
  const status = Number(fields.status ?? '1')
  if (status !== 0 && status !== 1) {
    console.error('Lootably unknown status', { transactionId, status: fields.status })
    return retry('invalid status', 422)
  }

  const revenue = Number(fields.revenue ?? '0')
  const currencyReward = Number(fields.currencyReward ?? '0')
  if (!Number.isFinite(revenue) || revenue < 0 || !Number.isFinite(currencyReward) || currencyReward < 0) {
    return retry('invalid amounts', 422)
  }
  if (revenue > MAX_REVENUE) {
    console.error('Lootably revenue above cap', { transactionId, revenue })
    return retry('revenue above cap', 422)
  }

  const percentRaw = Number(fields.multistepOfferPercentageComplete ?? '')
  const percent = Number.isFinite(percentRaw) ? percentRaw : null

  const player = (fields.userID ?? '').trim()

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await admin.rpc('credit_lootably_reward', {
    p_transaction_id: transactionId,
    p_status: status,
    p_player: validUuid(player) ? player : null,
    p_offer_id: fields.offerID ?? null,
    p_offer_name: fields.offerName ?? null,
    p_goal_id: fields.goalID ?? null,
    p_goal_name: fields.goalName ?? null,
    p_percent: percent,
    p_revenue: revenue.toFixed(6),
    p_currency_reward: currencyReward.toFixed(6),
    p_ip: fields.ip ?? null,
    p_raw: fields,
  })

  if (error) {
    // A missing wallet is transient, so let Lootably retry by not returning "1".
    console.error('Could not process Lootably postback', { transactionId, status, message: error.message })
    return retry(error.message)
  }

  console.log('Lootably postback processed', { transactionId, status, result: data })
  return ack()
})
