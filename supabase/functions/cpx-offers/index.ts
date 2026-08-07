// Authenticated CPX Research survey list proxy.
//
// The app secure hash never reaches the browser. This pulls the surveys CPX
// has matched to the caller and returns a publisher-safe list with a ready-made
// click URL per survey.
//
// ext_user_id always comes from the verified JWT, never the request body, so
// nobody can list or open surveys as another worker and have the postback
// credit that account.
//
// CPX's list endpoint returns no click URL; it is constructed from the same
// app_id + ext_user_id + secure_hash triple plus survey_id. Verified against
// live inventory: that form serves the real survey page.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { md5 } from 'npm:js-md5@0.8.3'
import { cors, json } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_ID = Deno.env.get('CPX_APP_ID') ?? ''
const SECURE_HASH = Deno.env.get('CPX_SECURE_HASH') ?? ''
// Same rate the postback uses. Sharing it is deliberate: the card and the
// wallet must agree, and two independent constants would eventually drift.
const USD_PER_CREDIT = Number(Deno.env.get('CPX_USD_PER_CREDIT') ?? '')

const LIST_ENDPOINT = 'https://live-api.cpx-research.com/api/get-surveys.php'

type PublicSurvey = {
  surveyId: string
  category: string
  /** Length of interview in minutes. */
  minutes: number
  /** Worker payout in USD, already converted from CPX's local currency. */
  rewardUsd: number
  /** CPX's 0-5 star average, 0 when too few ratings to mean anything. */
  rating: number
  ratingCount: number
  /** True when the survey screens the worker before it pays. */
  needsQualification: boolean
  link: string
}

function clientIp(req: Request): string {
  const fwd = req.headers.get('cf-connecting-ip')
    ?? req.headers.get('x-forwarded-for')?.split(',')[0]
    ?? ''
  const ip = fwd.trim().replace(/^\[|\]$/g, '')
  return /^[0-9a-f:.]{3,45}$/i.test(ip) ? ip : ''
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  if (!APP_ID || !SECURE_HASH || !Number.isFinite(USD_PER_CREDIT) || USD_PER_CREDIT <= 0) {
    return json({ status: 'error', error: 'Surveys are awaiting publisher configuration.' })
  }

  const bearer = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (!bearer) return json({ error: 'Please sign in first.' }, 401)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: { user }, error: authError } = await admin.auth.getUser(bearer)
  if (authError || !user) return json({ error: 'Please sign in first.' }, 401)

  const profile = await admin
    .from('profiles')
    .select('suspended')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile.data) return json({ error: 'Profile not found' }, 404)
  if (profile.data.suspended) return json({ error: 'Account suspended' }, 403)

  const secureHash = md5(`${user.id}-${SECURE_HASH}`)

  // CPX targets on the real visitor's IP and user agent, exactly like Lootably.
  // Forwarding ours instead would hand every worker the same country's surveys.
  // ip_user is mandatory for output_method=api: without it CPX answers with
  // "Please add the &ip_user= information" and no inventory, so fail loudly
  // rather than showing an empty wall that looks like there is no work.
  const ip = clientIp(req)
  if (!ip) {
    console.warn('CPX list skipped: no caller IP')
    return json({ status: 'error', error: 'We could not verify your location. Please disable VPN and try again.' })
  }

  const url = new URL(LIST_ENDPOINT)
  url.searchParams.set('app_id', APP_ID)
  url.searchParams.set('ext_user_id', user.id)
  url.searchParams.set('secure_hash', secureHash)
  // Must be `api`, not `api_client`. api_client silently returns the rendered
  // HTML widget instead of JSON for some users (verified: same app, same
  // params, JSON for three accounts and HTML for a fourth), which surfaced as
  // an intermittent "surveys not available" that depended on who was signed in.
  url.searchParams.set('output_method', 'api')
  url.searchParams.set('limit', '40')
  url.searchParams.set('ip_user', ip)
  const ua = req.headers.get('user-agent') ?? ''
  if (ua) url.searchParams.set('user_agent', ua.slice(0, 500))

  let res: Response
  try {
    res = await fetch(url.toString(), { signal: AbortSignal.timeout(15_000) })
  } catch (error) {
    console.error('CPX list request failed', error)
    return json({ status: 'error', error: 'Could not load surveys right now. Please try again.' })
  }
  if (!res.ok) {
    console.warn('CPX list rejected', { status: res.status })
    return json({ status: 'error', error: 'Could not load surveys right now. Please try again.' })
  }

  // Read as text first: when CPX rejects a request it answers with an HTML
  // error page, and res.json() would throw away the reason. Logging a prefix of
  // the real body is the difference between a five minute fix and guesswork.
  const bodyText = await res.text()
  let payload: { status?: string; surveys?: unknown[]; error_message?: string } | null = null
  try {
    payload = JSON.parse(bodyText)
  } catch {
    console.warn('CPX list returned non-JSON', { body: bodyText.slice(0, 400) })
    return json({ status: 'error', error: 'Could not load surveys right now. Please try again.' })
  }
  if (!payload || payload.status !== 'success' || !Array.isArray(payload.surveys)) {
    console.warn('CPX list returned an unexpected body', {
      status: payload?.status,
      body: bodyText.slice(0, 400),
    })
    return json({ status: 'error', error: 'Could not load surveys right now. Please try again.' })
  }

  const surveys: PublicSurvey[] = []
  for (const raw of payload.surveys) {
    const s = raw as Record<string, unknown>
    const surveyId = String(s.id ?? '').trim()
    if (!surveyId) continue

    // `payout` is the worker-facing amount in the app's local currency;
    // `payout_publisher_usd` is what CPX pays us. Confirmed against live
    // inventory: payout / payout_publisher_usd == 0.80, the Reward Settings
    // factor. USD_PER_CREDIT converts payout to what the postback will actually
    // credit, so the card can never promise more than the wallet delivers.
    const local = Number(s.payout ?? 0)
    if (!Number.isFinite(local) || local <= 0) continue
    const rewardUsd = Number((local * USD_PER_CREDIT).toFixed(4))

    // CPX's own signed click link. Building one by hand also works, but theirs
    // carries the click token their attribution expects, so prefer it and skip
    // any survey that arrives without one rather than sending a broken link.
    const link = typeof s.href === 'string' ? s.href.trim() : ''
    if (!link.startsWith('https://')) continue

    const ratingCount = Number(s.statistics_rating_count ?? 0)
    surveys.push({
      surveyId,
      category: String(s.category ?? 'General').trim() || 'General',
      minutes: Math.max(1, Math.round(Number(s.loi ?? 0)) || 1),
      rewardUsd,
      // A 5-star average off two votes is noise, so it is suppressed rather
      // than shown as if it were a real signal.
      rating: ratingCount >= 3 ? Number(s.statistics_rating_avg ?? 0) : 0,
      ratingCount: Number.isFinite(ratingCount) ? ratingCount : 0,
      needsQualification: String(s.type ?? '') === 'need_qualification',
      link,
    })
  }

  // Best paying first; workers scan for the number, not the category.
  surveys.sort((a, b) => b.rewardUsd - a.rewardUsd)

  return json({ status: 'success', surveys })
})
