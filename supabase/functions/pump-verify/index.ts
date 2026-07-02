// pump.fun bounty verification (attestation).
// We are the integration: when a PicoWorker user completes the action a bounty
// checks for, our backend calls pump.fun to attest that their wallet did it.
//   action 'verify' -> POST /verifications  (attest a completion)
//   action 'bounty' -> GET  /bounties/{taskId}  (look up a bounty's public details)
// The API key is secret and must never reach the browser. pump.fun also requires


// the outgoing Origin header to match one of our integration's allowed origins.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { cors, json } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const PUMP_KEY = Deno.env.get('PUMP_FUN_API_KEY')!
const INTERNAL_SECRET = Deno.env.get('EMAIL_SECRET')! // reused as a server-to-server secret
const BASE = 'https://livestream-api.pump.fun/bounties/integrations/v1'
const ORIGIN = Deno.env.get('PUMP_ORIGIN') ?? 'https://picoworker.xyz' // must match an allowed origin

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const body = await req.json().catch(() => ({}))
    const action = body.action ?? 'verify'
    const db = createClient(SUPABASE_URL, SERVICE_ROLE)

    // Only an admin or our own server (internal secret) may trigger attestations.
    const internalOk = req.headers.get('x-internal-secret') === INTERNAL_SECRET
    if (!internalOk) {
      const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
      const { data: { user } } = await db.auth.getUser(jwt)
      if (!user) return json({ error: 'Unauthorized' }, 401)
      const prof = await db.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
      if (!prof.data?.is_admin) return json({ error: 'Admin only' }, 403)
    }

    const headers = {
      Authorization: `Bearer ${PUMP_KEY}`,
      Origin: ORIGIN,
      'Content-Type': 'application/json',
    }

    if (action === 'bounty') {
      const taskId = String(body.taskId ?? '')
      if (!taskId) return json({ error: 'Missing taskId' }, 400)
      const r = await fetch(`${BASE}/bounties/${encodeURIComponent(taskId)}`, { headers })
      const data = await r.json().catch(() => ({}))
      return json({ status: r.status, data }, r.ok ? 200 : r.status)
    }

    if (action === 'verify') {
      const { taskId, wallet, idempotencyKey } = body as { taskId: string; wallet: string; idempotencyKey?: string }
      if (!taskId || !wallet) return json({ error: 'Missing taskId or wallet' }, 400)
      const r = await fetch(`${BASE}/verifications`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          taskId,
          subject: { address: wallet },
          idempotencyKey: idempotencyKey ?? `${taskId}:${wallet}`,
        }),
      })
      const data = await r.json().catch(() => ({}))
      return json({ status: r.status, data }, r.ok ? 200 : r.status)
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
