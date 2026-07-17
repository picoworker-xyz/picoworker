// Authenticated signed URL generator for Paymentwall's Virtual Currency
// Offerwall. Project and secret keys never reach the application source.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { cors, json } from '../_shared/cors.ts'
import { signV3 } from '../_shared/paymentwall.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const PROJECT_KEY = Deno.env.get('PAYMENTWALL_PROJECT_KEY') ?? ''
const SECRET_KEY = Deno.env.get('PAYMENTWALL_SECRET_KEY') ?? ''
const WIDGET_CODE = Deno.env.get('PAYMENTWALL_WIDGET_CODE') ?? ''
const USD_PER_CREDIT = Number(Deno.env.get('PAYMENTWALL_USD_PER_CREDIT') ?? '')
const EVALUATION = ['1', 'true', 'yes'].includes(
  (Deno.env.get('PAYMENTWALL_EVALUATION') ?? '').toLowerCase(),
)
const SUCCESS_URL = Deno.env.get('PAYMENTWALL_SUCCESS_URL')
  ?? 'https://picoworker.xyz/offers/paymentwall?status=success'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  if (!PROJECT_KEY || !SECRET_KEY || !WIDGET_CODE || !Number.isFinite(USD_PER_CREDIT) || USD_PER_CREDIT <= 0) {
    return json({ error: 'Paymentwall is awaiting project configuration' }, 503)
  }

  const bearer = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (!bearer) return json({ error: 'Unauthorized' }, 401)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: { user }, error: authError } = await admin.auth.getUser(bearer)
  if (authError || !user) return json({ error: 'Unauthorized' }, 401)

  const profile = await admin
    .from('profiles')
    .select('suspended')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile.data) return json({ error: 'Profile not found' }, 404)
  if (profile.data.suspended) return json({ error: 'Account suspended' }, 403)
  if (!user.email) return json({ error: 'An account email is required' }, 422)

  const params: Record<string, string> = {
    email: user.email,
    key: PROJECT_KEY,
    sign_version: '3',
    success_url: SUCCESS_URL,
    uid: user.id,
    widget: WIDGET_CODE,
  }
  if (EVALUATION) params.evaluation = '1'

  const sign = await signV3(params, SECRET_KEY)
  const widgetUrl = new URL('https://api.paymentwall.com/api/')
  for (const key of Object.keys(params).sort()) widgetUrl.searchParams.set(key, params[key])
  widgetUrl.searchParams.set('sign', sign)

  return json({
    url: widgetUrl.toString(),
    evaluation: EVALUATION,
    uid: user.id,
  })
})

