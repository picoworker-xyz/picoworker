// Public TaskWall rewarded-conversion postback receiver.
// Deploy with JWT verification disabled. TaskWall authenticates with the
// password macro and the RPC atomically deduplicates and credits the wallet.
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const POSTBACK_PASSWORD = Deno.env.get('TASKWALL_POSTBACK_PASSWORD') ?? ''
const USD_PER_CREDIT = Number(Deno.env.get('TASKWALL_USD_PER_CREDIT') ?? '')
const configuredMax = Number(Deno.env.get('TASKWALL_MAX_REWARD') ?? '1000')
const MAX_REWARD = Number.isFinite(configuredMax) && configuredMax > 0 ? configuredMax : 1000

function text(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

function validDecimal(value: string, allowZero = false): boolean {
  if (!/^\d{1,12}(?:\.\d{1,6})?$/.test(value)) return false
  const parsed = Number(value)
  return Number.isFinite(parsed) && (allowZero ? parsed >= 0 : parsed > 0)
}

function sameSecret(supplied: string, expected: string): boolean {
  const encoder = new TextEncoder()
  const a = encoder.encode(supplied)
  const b = encoder.encode(expected)
  let mismatch = a.length ^ b.length
  const length = Math.max(a.length, b.length)
  for (let i = 0; i < length; i += 1) mismatch |= (a[i] ?? 0) ^ (b[i] ?? 0)
  return mismatch === 0
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method !== 'GET') return text('Method not allowed', 405)
  if (!POSTBACK_PASSWORD || !Number.isFinite(USD_PER_CREDIT) || USD_PER_CREDIT <= 0) {
    console.error('TaskWall postback secrets are not configured')
    return text('Not configured', 503)
  }

  const url = new URL(req.url)
  const params = Object.fromEntries(url.searchParams.entries())
  const suppliedPassword = params.password ?? ''
  if (!sameSecret(suppliedPassword, POSTBACK_PASSWORD)) return text('Invalid password', 403)

  const playerId = (params.userid ?? '').trim()
  const offerId = (params.offer_id ?? '').trim()
  const userAmountRaw = params.user_amount ?? ''
  const payoutRaw = params.payout ?? ''
  const providerDate = (params.date ?? '').trim()
  if (!validUuid(playerId)) return text('Invalid userid', 422)
  if (!offerId || offerId.length > 200) return text('Invalid offer_id', 422)
  if (!validDecimal(userAmountRaw)) return text('Invalid user_amount', 422)
  if (!validDecimal(payoutRaw, true)) return text('Invalid payout', 422)
  if (!providerDate || providerDate.length > 100) return text('Invalid date', 422)

  const userAmount = Number(userAmountRaw)
  const creditedAmount = userAmount * USD_PER_CREDIT
  if (!Number.isFinite(creditedAmount) || creditedAmount <= 0 || creditedAmount > MAX_REWARD) {
    return text('Invalid or excessive reward', 422)
  }

  // TaskWall has no transaction-id macro. This canonical fingerprint makes
  // exact provider retries harmless without merging distinct users/offers.
  //
  // offer_name is part of the key because milestones of one offer share a
  // single offer_id — 19658911 carries both Dragon_Down_Collect_150_gems and
  // Dragon_Down_Collect_1000_gems — and TaskWall pays a flat $0.01 on almost
  // every conversion. Without the name, a worker clearing two milestones of one
  // offer on one day produced an identical key and the second was dropped
  // silently by `on conflict do nothing`, which is indistinguishable from the
  // provider never sending it. The name is the only milestone discriminator
  // they give us. A genuine retry resends the same name, so retries still
  // dedup; two different milestones no longer collide.
  const eventKey = await sha256([
    playerId.toLowerCase(),
    offerId,
    (params.offer_name ?? '').trim().toLowerCase(),
    providerDate,
    userAmount.toFixed(6),
    Number(payoutRaw).toFixed(6),
  ].join('|'))

  const rawPayload = { ...params }
  delete rawPayload.password

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await admin.rpc('credit_taskwall_reward', {
    p_event_key: eventKey,
    p_player: playerId,
    p_offer_id: offerId,
    p_offer_name: params.offer_name ?? null,
    p_app_name: params.app_name ?? null,
    p_user_amount: userAmountRaw,
    p_payout: payoutRaw,
    p_credited_amount: creditedAmount.toFixed(6),
    p_currency_name: params.currency_name ?? null,
    p_provider_date: providerDate,
    p_ip_address: params.ip_address ?? null,
    p_raw_payload: rawPayload,
  })

  if (error) {
    console.error('Could not process TaskWall postback', {
      eventKey,
      offerId,
      code: error.code,
      message: error.message,
    })
    return text('Processing failed', 500)
  }

  console.log('TaskWall postback processed', { eventKey, offerId, result: data })
  return text('OK')
})
