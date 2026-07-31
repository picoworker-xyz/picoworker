// Public Lootably Conversion Webhook receiver.
//
// Deploy with JWT verification disabled — Lootably is the caller. Authenticated
// by the shared secret in the x-lootably-webhook-secret header.
//
// One function serves all three URLs (approved, pending, rejected). The event
// is taken from the JSON body rather than from which URL was called, so a
// misconfigured dashboard cannot turn a rejection into a payment.
//
// Only `approved` moves money. Pending and rejected are recorded so the UI can
// show work in flight and so the rejection rate stays measurable.
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const WEBHOOK_SECRET = Deno.env.get('LOOTABLY_WEBHOOK_SECRET') ?? ''
const PLACEMENT_ID = Deno.env.get('LOOTABLY_PLACEMENT_ID') ?? ''
const configuredMax = Number(Deno.env.get('LOOTABLY_MAX_REVENUE') ?? '500')
const MAX_REVENUE = Number.isFinite(configuredMax) && configuredMax > 0 ? configuredMax : 500

function text(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

function validUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

/** Compare without leaking length or position through timing. */
function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const x = enc.encode(a)
  const y = enc.encode(b)
  let diff = x.length ^ y.length
  const n = Math.max(x.length, y.length)
  for (let i = 0; i < n; i += 1) diff |= (x[i] ?? 0) ^ (y[i] ?? 0)
  return diff === 0
}

function str(v: unknown, max = 500): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}

Deno.serve(async (req) => {
  // Non-2xx triggers up to five resends, so it is the correct answer whenever a
  // retry could help and the wrong one whenever it cannot.
  if (req.method !== 'POST') return text('Method not allowed', 405)
  if (!WEBHOOK_SECRET) {
    console.error('LOOTABLY_WEBHOOK_SECRET is not configured')
    return text('Not configured', 503)
  }

  const supplied = req.headers.get('x-lootably-webhook-secret') ?? ''
  if (!supplied || !timingSafeEqual(supplied, WEBHOOK_SECRET)) {
    console.warn('Lootably webhook secret mismatch')
    return text('Unauthorized', 401)
  }

  let payload: { event?: unknown; data?: Record<string, unknown> }
  try {
    payload = await req.json()
  } catch {
    return text('Bad payload', 400)
  }

  const event = str(payload?.event, 20)
  if (event !== 'approved' && event !== 'pending' && event !== 'rejected') {
    console.error('Lootably unknown webhook event', { event })
    return text('Unknown event', 422)
  }

  const d = payload?.data ?? {}

  // Reject a webhook aimed at a different placement rather than crediting from it.
  const placement = str(d.placementID, 100)
  if (PLACEMENT_ID && placement && placement !== PLACEMENT_ID) {
    console.warn('Lootably webhook for unknown placement', { placement })
    return text('Unknown placement', 403)
  }

  const transactionId = str(d.transactionID, 200)
  if (!transactionId) return text('Missing transactionID', 422)

  const revenue = Number(d.revenue ?? 0)
  const currencyReward = Number(d.currencyReward ?? 0)
  if (!Number.isFinite(revenue) || revenue < 0 || !Number.isFinite(currencyReward) || currencyReward < 0) {
    return text('Invalid amounts', 422)
  }
  if (revenue > MAX_REVENUE) {
    console.error('Lootably webhook revenue above cap', { transactionId, revenue })
    return text('Revenue above cap', 422)
  }

  const percentRaw = Number(d.multistepOfferPercentageComplete)
  const percent = Number.isFinite(percentRaw) ? percentRaw : null
  const player = str(d.userID, 100)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await admin.rpc('credit_lootably_webhook', {
    p_transaction_id: transactionId,
    p_event: event,
    p_player: validUuid(player) ? player : null,
    p_offer_id: str(d.offerID, 100) || null,
    p_offer_name: str(d.offerName, 200) || null,
    p_goal_id: str(d.goalID, 100) || null,
    // Webhooks call it goalDescription; the postback calls the same thing
    // goalName. One column, so normalise here.
    p_goal_name: str(d.goalDescription, 300) || null,
    p_percent: percent,
    p_revenue: revenue.toFixed(6),
    p_currency_reward: currencyReward.toFixed(6),
    p_ip: str(d.ip, 60) || null,
    p_country: str(d.countryCode, 4) || null,
    p_webhook_id: req.headers.get('x-lootably-webhook-id') ?? null,
    p_raw: payload as unknown,
  })

  if (error) {
    // Missing wallet and similar are transient: a non-2xx earns a resend.
    console.error('Could not process Lootably webhook', { transactionId, event, message: error.message })
    return text('Processing failed', 500)
  }

  console.log('Lootably webhook processed', { transactionId, event, result: data })
  return text('ok')
})
