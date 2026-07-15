// AdGem rewarded-conversion postback receiver (GET /adgem-postback).
//
// This function must be deployed with JWT verification disabled because AdGem
// is the caller. Authentication is instead provided by AdGem v2's verifier:
// HMAC-SHA256(full postback URL without the final verifier parameter, key).
// Wallet movement is delegated to an atomic, service-role-only Postgres RPC.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { unsignedUrlAndVerifier, validDecimal, validUuid, verifyHmac } from './verify.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const POSTBACK_KEY = Deno.env.get('ADGEM_POSTBACK_KEY') ?? ''
const PUBLIC_URL = (Deno.env.get('ADGEM_PUBLIC_URL') ?? '').replace(/[?&]+$/, '')
const configuredMax = Number(Deno.env.get('ADGEM_MAX_REWARD') ?? '1000')
const MAX_REWARD = Number.isFinite(configuredMax) && configuredMax > 0 ? configuredMax : 1000

const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
}

function respond(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers })
}

Deno.serve(async (req) => {
  if (req.method !== 'GET') {
    return respond({ error: 'Method not allowed' }, 405)
  }
  if (!POSTBACK_KEY) {
    console.error('ADGEM_POSTBACK_KEY is not configured')
    return respond({ error: 'Postback is not configured' }, 503)
  }

  // When Netlify proxies picoworker.xyz to Supabase, req.url contains the
  // Supabase origin. AdGem signed the public URL, so preserve the raw query and
  // restore that configured origin/path before verification.
  const queryAt = req.url.indexOf('?')
  const signatureUrl = PUBLIC_URL
    ? `${PUBLIC_URL}${queryAt >= 0 ? req.url.slice(queryAt) : ''}`
    : req.url
  const signed = unsignedUrlAndVerifier(signatureUrl)
  if (!signed || !(await verifyHmac(signed.unsignedUrl, signed.verifier, POSTBACK_KEY))) {
    return respond({ error: 'Invalid AdGem verifier' }, 401)
  }

  const url = new URL(req.url)
  const amount = url.searchParams.get('amount') ?? ''
  const payout = url.searchParams.get('payout') ?? ''
  const playerId = url.searchParams.get('player_id')?.trim() ?? ''
  const transactionId = url.searchParams.get('transaction_id')?.trim() ?? ''
  const requestId = url.searchParams.get('request_id')?.trim() ?? ''

  if (!validUuid(playerId)) return respond({ error: 'Invalid player_id' }, 422)
  if (!validDecimal(amount, false) || Number(amount) > MAX_REWARD) {
    return respond({ error: 'Invalid or excessive amount' }, 422)
  }
  if (!validDecimal(payout, true)) return respond({ error: 'Invalid payout' }, 422)
  if (!requestId || requestId.length > 200) return respond({ error: 'Invalid request_id' }, 422)
  if (!transactionId || transactionId.length > 200) return respond({ error: 'Invalid transaction_id' }, 422)

  const rawPayload = Object.fromEntries(url.searchParams.entries())
  delete rawPayload.verifier

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await admin.rpc('credit_adgem_reward', {
    p_request_id: requestId,
    p_transaction_id: transactionId,
    p_player: playerId,
    p_amount: amount,
    p_payout: payout,
    p_campaign_id: url.searchParams.get('campaign_id'),
    p_goal_id: url.searchParams.get('goal_id'),
    p_goal_name: url.searchParams.get('goal_name'),
    p_offer_name: url.searchParams.get('offer_name'),
    p_raw_payload: rawPayload,
  })

  if (error) {
    console.error('Could not credit AdGem postback', {
      requestId,
      transactionId,
      code: error.code,
      message: error.message,
    })
    // A 5xx makes AdGem retry transient database failures.
    return respond({ error: 'Could not process postback' }, 500)
  }

  return respond({ ok: true, ...data })
})
