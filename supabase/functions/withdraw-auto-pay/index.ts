// Pays held withdrawals whose 15 day review window has passed. Called hourly by
// pg_cron (see withdraw_auto.sql) with the internal x-sweep-secret header; an
// admin approving early goes through admin-withdraw-approve instead.
//
// A short treasury stops the run and leaves the rest held: they are retried on
// the next hour, and nobody is refunded for our cash problem. Any other payout
// error refunds that one withdrawal and marks it failed, as approve does.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { json } from '../_shared/cors.ts'
import { isTreasuryShort, transferUsdc, validAddress } from '../_shared/base.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SWEEP_SECRET = Deno.env.get('SWEEP_SECRET') ?? ''

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  if (!SWEEP_SECRET || req.headers.get('x-sweep-secret') !== SWEEP_SECRET) return json({ error: 'Forbidden' }, 403)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: due, error } = await admin.rpc('due_withdrawals', { p_limit: 20 })
  if (error) return json({ error: error.message }, 500)

  const paid: string[] = []
  const failed: string[] = []
  let heldForTreasury = 0

  for (const w of (due ?? []) as { id: string; amount: number; fee: number; address: string }[]) {
    const to = String(w.address ?? '').trim()
    const net = +(Number(w.amount) - Number(w.fee)).toFixed(6)
    if (!validAddress(to) || net <= 0) {
      await admin.rpc('finish_withdrawal', { p_id: w.id, p_sig: null, p_ok: false })
      failed.push(w.id)
      continue
    }
    try {
      const sig = await transferUsdc(to, net)
      await admin.rpc('finish_withdrawal', { p_id: w.id, p_sig: sig, p_ok: true })
      paid.push(w.id)
    } catch (e) {
      if (isTreasuryShort(e)) {
        console.warn('withdraw-auto-pay: treasury short, leaving the rest held', { remaining: (due?.length ?? 0) - paid.length - failed.length })
        heldForTreasury = (due?.length ?? 0) - paid.length - failed.length
        break
      }
      console.error('withdraw-auto-pay: payout failed, refunded', { id: w.id, message: String(e) })
      await admin.rpc('finish_withdrawal', { p_id: w.id, p_sig: null, p_ok: false })
      failed.push(w.id)
    }
  }

  return json({ ok: true, paid: paid.length, failed: failed.length, heldForTreasury })
})
