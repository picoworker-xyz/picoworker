// Sweeps USDC from every per-user deposit address into the treasury, so the
// treasury can fund withdrawals. Protected by SWEEP_SECRET (deploy with
// --no-verify-jwt and call with header: x-sweep-secret: <SWEEP_SECRET>).
import { createClient } from 'npm:@supabase/supabase-js@2'
import { PublicKey } from 'npm:@solana/web3.js@1.95.8'
import { cors, json } from '../_shared/cors.ts'
import { conn, depositKeypair, transferUsdc, treasury, usdcBalance } from '../_shared/solana.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SWEEP_SECRET = Deno.env.get('SWEEP_SECRET')!
const MIN_SWEEP = 0.01 // ignore dust

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.headers.get('x-sweep-secret') !== SWEEP_SECRET) return json({ error: 'Forbidden' }, 403)
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
    const { data: wallets } = await admin.from('deposit_wallets').select('derivation_index, address')
    const c = conn()
    const t = treasury()

    let swept = 0
    const results: unknown[] = []
    for (const w of wallets ?? []) {
      const owner = new PublicKey(w.address)
      const bal = await usdcBalance(c, owner)
      if (bal < MIN_SWEEP) continue
      const kp = depositKeypair(w.derivation_index)
      try {
        const sig = await transferUsdc(c, kp, t.publicKey, bal, t)
        swept += bal
        results.push({ address: w.address, amount: bal, signature: sig })
      } catch (e) {
        results.push({ address: w.address, error: String(e) })
      }
    }
    return json({ swept, count: results.length, results })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
