// Real USDC payout on Base: debit the user's balance, send USDC from the Base
// treasury to their address, and mark the withdrawal sent (or refund on
// failure). Mirrors solana-withdraw so the DB side is unchanged.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { cors, json } from '../_shared/cors.ts'
import { transferUsdc, validAddress } from '../_shared/base.ts'

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

    const to = String(address ?? '').trim()
    if (!validAddress(to)) {
      return json({ error: 'Enter a valid Base address. It starts with 0x and is 42 characters.' }, 400)
    }
    const src = source === 'business' ? 'business' : 'earner'

    // 1. Debit and create the pending row. Refunded below if the send fails.
    const start = await admin.rpc('start_withdrawal', {
      p_profile: user.id, p_amount: amt, p_address: to, p_source: src,
    })
    if (start.error) return json({ error: start.error.message }, 400)
    const { id, net, review } = start.data as { id: string; net: number; review: boolean }

    // Over the daily limit: held for admin approval, no payout now.
    if (review) return json({ ok: true, review: true, net })

    // 2. Pay out from the treasury.
    try {
      const hash = await transferUsdc(to, net)
      await admin.rpc('finish_withdrawal', { p_id: id, p_sig: hash, p_ok: true })
      return json({ ok: true, signature: hash, net })
    } catch (e) {
      await admin.rpc('finish_withdrawal', { p_id: id, p_sig: null, p_ok: false })
      console.error('Base payout failed', e)
      return json({ error: 'Payout failed, your balance was refunded.' }, 500)
    }
  } catch (e) {
    console.error('base-withdraw error', e)
    return json({ error: String(e) }, 500)
  }
})
