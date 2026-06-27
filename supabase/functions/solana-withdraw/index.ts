// Real USDC payout: debit the user's balance, send USDC from the treasury to
// their Solana address, and mark the withdrawal sent (or refund on failure).
import { createClient } from 'npm:@supabase/supabase-js@2'
import { PublicKey } from 'npm:@solana/web3.js@1.95.8'
import { cors, json } from '../_shared/cors.ts'
import { conn, transferUsdc, treasury } from '../_shared/solana.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
    const { data: { user } } = await admin.auth.getUser(jwt)
    if (!user) return json({ error: 'Unauthorized' }, 401)

    const { amount, address, source } = await req.json()
    const amt = Number(amount)
    if (!amt || amt <= 0) return json({ error: 'Enter an amount.' }, 400)
    const src = source === 'business' ? 'business' : 'earner'
    let toOwner: PublicKey
    try { toOwner = new PublicKey(String(address)) } catch { return json({ error: 'Invalid Solana address.' }, 400) }

    // 1. Debit + create the pending withdrawal (refunded later if the send fails).
    const start = await admin.rpc('start_withdrawal', { p_profile: user.id, p_amount: amt, p_address: String(address), p_source: src })
    if (start.error) return json({ error: start.error.message }, 400)
    const { id, net, review } = start.data as { id: string; net: number; review: boolean }

    // Over the $5/day limit: held for admin approval, no payout now.
    if (review) return json({ ok: true, review: true, net })

    // 2. Pay out from the treasury.
    try {
      const c = conn()
      const t = treasury()
      const sig = await transferUsdc(c, t, toOwner, net, t)
      await admin.rpc('finish_withdrawal', { p_id: id, p_sig: sig, p_ok: true })
      return json({ ok: true, signature: sig, net })
    } catch (e) {
      await admin.rpc('finish_withdrawal', { p_id: id, p_sig: null, p_ok: false })
      return json({ error: 'Payout failed, your balance was refunded. ' + String(e) }, 500)
    }
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
