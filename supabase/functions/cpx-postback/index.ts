// Public CPX Research server-to-server postback receiver.
//
// Deploy with JWT verification disabled — CPX is the caller. Requests are
// authenticated by the MD5 hash CPX puts on the URL.
//
// Configured postback URL (Postback Settings tab in the CPX dashboard):
//   https://<project>.supabase.co/functions/v1/cpx-postback
//     ?status={status}&trans_id={trans_id}&user_id={user_id}
//     &sub_id={subid}&sub_id_2={subid_2}
//     &amount_local={amount_local}&amount_usd={amount_usd}
//     &offer_id={offer_ID}&hash={secure_hash}&ip_click={ip_click}
//
// user_id is our ext_user_id, i.e. the PicoWorker profile id we put on the
// frame URL. amount_usd is what CPX pays us; amount_local is what the wall
// promised the user in app currency and is converted here before crediting.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { md5 } from 'npm:js-md5@0.8.3'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SECURE_HASH = Deno.env.get('CPX_SECURE_HASH') ?? ''
// amount_local is in the app's virtual currency (Reward Settings in the CPX
// dashboard). This rate converts one unit to dollars and MUST match that
// dashboard setting, or workers are paid the wrong amount.
const USD_PER_CREDIT = Number(Deno.env.get('CPX_USD_PER_CREDIT') ?? '')
const configuredMax = Number(Deno.env.get('CPX_MAX_REWARD') ?? '500')
const MAX_REWARD = Number.isFinite(configuredMax) && configuredMax > 0 ? configuredMax : 500

// CPX's published outbound addresses. Defence in depth behind the MD5 hash: if
// the secure hash ever leaks, an attacker still cannot mint conversions from
// somewhere else. Set CPX_SKIP_IP_CHECK=1 only to debug a delivery problem.
const CPX_IPS = new Set(['188.40.3.73', '2a01:4f8:d0a:30ff::2', '157.90.97.92'])
const SKIP_IP_CHECK = ['1', 'true', 'yes'].includes(
  (Deno.env.get('CPX_SKIP_IP_CHECK') ?? '').toLowerCase(),
)

function callerIp(req: Request): string {
  const fwd = req.headers.get('cf-connecting-ip')
    ?? req.headers.get('x-forwarded-for')?.split(',')[0]
    ?? ''
  return fwd.trim().replace(/^\[|\]$/g, '').toLowerCase()
}

function text(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

function validUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
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
  if (!SECURE_HASH || !Number.isFinite(USD_PER_CREDIT) || USD_PER_CREDIT <= 0) {
    console.error('CPX secrets are not configured')
    return text('Not configured', 503)
  }

  // Defence in depth only — the MD5 hash below is the real authentication. If
  // the platform ever stops populating the forwarding header we must NOT reject
  // every conversion, so an empty IP falls through with a warning rather than
  // silently costing every worker their reward.
  if (!SKIP_IP_CHECK) {
    const ip = callerIp(req)
    if (!ip) {
      console.warn('CPX postback with no caller IP; relying on hash only')
    } else if (!CPX_IPS.has(ip)) {
      console.warn('CPX postback from unexpected IP', { ip })
      return text('Forbidden', 403)
    }
  }

  // CPX sends GET; POST is accepted so the transport can be switched in their
  // dashboard without a redeploy.
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

  const transId = (fields.trans_id ?? '').trim()
  if (!transId || transId.length > 200) return text('Invalid trans_id', 422)

  // CPX signs the postback as md5(trans_id + "-" + app_secure_hash), the same
  // construction as the frame's secure_hash but keyed on the transaction. If a
  // live postback is rejected here, compare the logged prefixes against a hash
  // built by hand before assuming the secret is wrong.
  const supplied = (fields.hash ?? '').trim().toLowerCase()
  if (!supplied) return text('Missing hash', 403)
  const expected = md5(`${transId}-${SECURE_HASH}`)
  if (!timingSafeEqual(supplied, expected)) {
    console.warn('CPX hash mismatch', {
      transId,
      suppliedPrefix: supplied.slice(0, 8),
      expectedPrefix: expected.slice(0, 8),
    })
    return text('Invalid hash', 403)
  }

  const status = Number(fields.status)
  if (!Number.isInteger(status) || status < 0 || status > 10) return text('Invalid status', 422)

  // user_id is the ext_user_id we set on the frame, i.e. the profile id.
  const player = (fields.user_id ?? '').trim()
  const earned = Number(fields.amount_usd ?? '0')
  const local = Number(fields.amount_local ?? '0')
  if (!Number.isFinite(earned) || !Number.isFinite(local) || earned < 0 || local < 0) {
    return text('Invalid amounts', 422)
  }
  // Convert the app's virtual currency into the dollars we actually credit.
  const rewardedUsd = local * USD_PER_CREDIT
  if (!Number.isFinite(rewardedUsd) || rewardedUsd > MAX_REWARD) {
    console.error('CPX reward above cap', { transId, local, rewardedUsd })
    return text('Reward above cap', 422)
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await admin.rpc('credit_cpx_reward', {
    p_trans_id: transId,
    p_status: status,
    p_player: validUuid(player) ? player : null,
    p_offer_id: fields.offer_id ?? null,
    p_survey_id: fields.survey_id ?? fields.sub_id ?? null,
    p_type: fields.type ?? null,
    p_earned: earned.toFixed(6),
    p_rewarded: rewardedUsd.toFixed(6),
    p_reward_units: local.toFixed(6),
    p_ip: fields.ip_click ?? null,
    p_raw: fields,
  })

  if (error) {
    console.error('Could not process CPX postback', { transId, status, message: error.message })
    return text('Processing failed', 500)
  }

  console.log('CPX postback processed', { transId, status, result: data })
  return text('ok')
})
