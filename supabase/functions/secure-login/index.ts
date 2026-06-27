// Password login with a lockout: after 5 wrong passwords for an email, password
// login is blocked for 1 hour. The user can still reset their password anytime.
// Returns 200 for all logical outcomes so the client can branch on the body.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { cors, json } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
const MAX = 5
const LOCK_MS = 60 * 60 * 1000 // 1 hour

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { email: rawEmail, password } = await req.json()
    const email = String(rawEmail ?? '').trim().toLowerCase()
    if (!email || !password) return json({ error: 'Enter your email and password.' })
    const db = createClient(SUPABASE_URL, SERVICE_ROLE)

    const { data: rec } = await db.from('login_attempts').select('fails, locked_until').eq('email', email).maybeSingle()
    if (rec?.locked_until && new Date(rec.locked_until) > new Date()) {
      const minutes = Math.ceil((new Date(rec.locked_until).getTime() - Date.now()) / 60000)
      return json({ locked: true, minutes })
    }

    // Verify the password via the auth token endpoint.
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: `Bearer ${ANON}` },
      body: JSON.stringify({ email, password }),
    })

    if (res.ok) {
      const s = await res.json()
      await db.from('login_attempts').delete().eq('email', email)
      return json({ ok: true, access_token: s.access_token, refresh_token: s.refresh_token })
    }

    const body = await res.json().catch(() => ({}))
    // Only count genuine wrong-password attempts; pass through other errors
    // (e.g. email not confirmed) without locking.
    const isBadCreds = /invalid login credentials|invalid_credentials|invalid_grant/i.test(JSON.stringify(body))
    if (!isBadCreds) {
      return json({ error: body.error_description || body.msg || body.message || 'Could not sign in.' })
    }

    const fails = (rec?.fails ?? 0) + 1
    const locked = fails >= MAX
    await db.from('login_attempts').upsert({
      email,
      fails: locked ? 0 : fails,
      locked_until: locked ? new Date(Date.now() + LOCK_MS).toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    if (locked) return json({ locked: true, minutes: 60 })
    return json({ error: 'Wrong email or password.', remaining: MAX - fails })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
