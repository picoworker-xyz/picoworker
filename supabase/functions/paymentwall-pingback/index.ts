// Public Paymentwall Virtual Currency pingback receiver.
// Deploy with Supabase JWT verification disabled; Paymentwall signature v3 is
// required instead. Successful processing must return exactly "OK".
import { createClient } from 'npm:@supabase/supabase-js@2'
import { verifyV3 } from '../_shared/paymentwall.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SECRET_KEY = Deno.env.get('PAYMENTWALL_SECRET_KEY') ?? ''
const USD_PER_CREDIT = Number(Deno.env.get('PAYMENTWALL_USD_PER_CREDIT') ?? '')
const configuredMax = Number(Deno.env.get('PAYMENTWALL_MAX_REWARD') ?? '1000')
const MAX_REWARD = Number.isFinite(configuredMax) && configuredMax > 0 ? configuredMax : 1000
const ALLOWED_IP_PREFIX = Deno.env.get('PAYMENTWALL_ALLOWED_IP_PREFIX') ?? ''

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

Deno.serve(async (req) => {
  if (req.method !== 'GET') return text('Method not allowed', 405)
  if (!SECRET_KEY || !Number.isFinite(USD_PER_CREDIT) || USD_PER_CREDIT <= 0) {
    console.error('Paymentwall pingback secrets are not configured')
    return text('Not configured', 503)
  }

  if (ALLOWED_IP_PREFIX) {
    const sourceIp = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim()
    if (!sourceIp.startsWith(ALLOWED_IP_PREFIX)) return text('Invalid source', 403)
  }

  const url = new URL(req.url)
  const suppliedSignature = url.searchParams.get('sig') ?? ''
  const params: Record<string, string> = {}
  for (const [key, value] of url.searchParams.entries()) {
    if (key !== 'sig') params[key] = value
  }

  if (params.sign_version !== '3') return text('Signature version 3 required', 400)
  if (!(await verifyV3(params, suppliedSignature, SECRET_KEY))) {
    return text('Invalid signature', 403)
  }

  const playerId = params.uid?.trim() ?? ''
  const ref = params.ref?.trim() ?? ''
  const currencyRaw = params.currency ?? ''
  const typeRaw = params.type ?? ''
  if (!validUuid(playerId)) return text('Invalid uid', 422)
  if (!/^[1-9]\d{0,11}$/.test(currencyRaw)) return text('Invalid currency', 422)
  if (!/^(0|1|2)$/.test(typeRaw)) return text('Invalid type', 422)
  if (!ref || ref.length > 200) return text('Invalid ref', 422)

  const currencyUnits = Number(currencyRaw)
  const amount = currencyUnits * USD_PER_CREDIT
  if (!Number.isSafeInteger(currencyUnits) || !Number.isFinite(amount) || amount <= 0 || amount > MAX_REWARD) {
    return text('Invalid or excessive reward', 422)
  }

  const rawPayload = { ...params }
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await admin.rpc('process_paymentwall_pingback', {
    p_ref: ref,
    p_player: playerId,
    p_currency_units: currencyUnits,
    p_amount: amount.toFixed(6),
    p_type: Number(typeRaw),
    p_is_test: params.is_test === '1',
    p_reason: params.reason ?? null,
    p_raw_payload: rawPayload,
  })

  if (error) {
    console.error('Could not process Paymentwall pingback', {
      ref,
      type: typeRaw,
      code: error.code,
      message: error.message,
    })
    return text('Processing failed', 500)
  }

  console.log('Paymentwall pingback processed', { ref, type: typeRaw, result: data })
  return text('OK')
})

