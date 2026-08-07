// Authenticated signed URL generator for the CPX Research survey frame.
//
// The app secure hash never reaches the browser. CPX's own PHP example builds
// the iframe src inline with the secret in the page, which would expose it to
// anyone viewing source; minting here instead keeps it in Supabase secrets.
//
// ext_user_id is always taken from the verified JWT, never from the request
// body, so nobody can open the wall as somebody else and have the postback
// credit that other account.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { md5 } from 'npm:js-md5@0.8.3'
import { cors, json } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_ID = Deno.env.get('CPX_APP_ID') ?? ''
const SECURE_HASH = Deno.env.get('CPX_SECURE_HASH') ?? ''

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  if (!APP_ID || !SECURE_HASH) {
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
    .select('display_name, suspended')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile.data) return json({ error: 'Profile not found' }, 404)
  if (profile.data.suspended) return json({ error: 'Account suspended' }, 403)

  // Same construction CPX documents for the frame: md5(ext_user_id-secure_hash).
  const secureHash = md5(`${user.id}-${SECURE_HASH}`)

  const url = new URL('https://offers.cpx-research.com/index.php')
  url.searchParams.set('app_id', APP_ID)
  url.searchParams.set('ext_user_id', user.id)
  url.searchParams.set('secure_hash', secureHash)
  if (profile.data.display_name) url.searchParams.set('username', profile.data.display_name)
  // CPX uses the email to de-duplicate users across publishers. Omitting it
  // makes them prompt the worker for one before any survey can start, so send
  // it when we have it.
  if (user.email) url.searchParams.set('email', user.email)

  return json({ status: 'success', url: url.toString() })
})
