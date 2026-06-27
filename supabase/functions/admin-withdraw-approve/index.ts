// Admin approves a held (pending_review) withdrawal: pays it out from the
// treasury and marks it sent. Reject/refund is done by the admin_reject_withdrawal RPC.
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
    const prof = await admin.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
    if (!prof.data?.is_admin) return json({ error: 'Admin only' }, 403)

    const { id } = await req.json()
    if (!id) return json({ error: 'Missing withdrawal id' }, 400)

    const wd = await admin.from('withdrawals').select('amount, address, fee, status').eq('id', id).maybeSingle()
    if (!wd.data) return json({ error: 'Withdrawal not found' }, 404)
    if (wd.data.status !== 'pending_review') return json({ error: 'Not awaiting approval' }, 400)

    let toOwner: PublicKey
    try { toOwner = new PublicKey(String(wd.data.address)) } catch { return json({ error: 'Invalid address' }, 400) }
    const netAmt = Number(wd.data.amount) - Number(wd.data.fee)

    try {
      const c = conn()
      const t = treasury()
      const sig = await transferUsdc(c, t, toOwner, netAmt, t)
      await admin.rpc('finish_withdrawal', { p_id: id, p_sig: sig, p_ok: true })
      return json({ ok: true, signature: sig })
    } catch (e) {
      // payout failed — refund and mark failed
      await admin.rpc('finish_withdrawal', { p_id: id, p_sig: null, p_ok: false })
      return json({ error: 'Payout failed, the user was refunded. ' + String(e) }, 500)
    }
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
