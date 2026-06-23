// Scans the caller's Solana deposit address for incoming USDC and credits their
// escrow for any confirmed transfers not already processed (idempotent by tx
// signature). Call this when the user taps "I've sent it", or from a cron.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { Connection, PublicKey } from 'npm:@solana/web3.js@1.95.8'
import { getAssociatedTokenAddressSync } from 'npm:@solana/spl-token@0.4.9'
import { cors, json } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RPC_URL = Deno.env.get('SOLANA_RPC_URL')! // e.g. https://api.mainnet-beta.solana.com or a Helius URL
const USDC_MINT = new PublicKey(Deno.env.get('USDC_MINT')!) // mainnet: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
    const { data: { user } } = await admin.auth.getUser(jwt)
    if (!user) return json({ error: 'Unauthorized' }, 401)

    const w = await admin.from('deposit_wallets').select('address').eq('profile_id', user.id).maybeSingle()
    if (!w.data?.address) return json({ error: 'No deposit address yet' }, 400)

    const owner = new PublicKey(w.data.address)
    const ata = getAssociatedTokenAddressSync(USDC_MINT, owner, true)
    const conn = new Connection(RPC_URL, 'confirmed')

    const sigs = await conn.getSignaturesForAddress(ata, { limit: 25 }, 'confirmed')
    let credited = 0
    let balance: number | null = null

    for (const s of sigs.reverse()) {
      if (s.err) continue
      // already processed?
      const seen = await admin.from('deposits').select('id').eq('signature', s.signature).maybeSingle()
      if (seen.data) continue

      const tx = await conn.getParsedTransaction(s.signature, { maxSupportedTransactionVersion: 0 })
      const post = tx?.meta?.postTokenBalances ?? []
      const pre = tx?.meta?.preTokenBalances ?? []
      const mintStr = USDC_MINT.toBase58()
      const ownerStr = owner.toBase58()

      const postBal = post.find((b) => b.mint === mintStr && b.owner === ownerStr)
      if (!postBal) continue
      const preBal = pre.find((b) => b.accountIndex === postBal.accountIndex)
      const delta = (postBal.uiTokenAmount.uiAmount ?? 0) - (preBal?.uiTokenAmount.uiAmount ?? 0)
      if (delta <= 0) continue

      const res = await admin.rpc('credit_deposit', { p_profile: user.id, p_amount: delta, p_sig: s.signature })
      credited += delta
      balance = Number(res.data ?? balance)
    }

    return json({ credited, balance })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
