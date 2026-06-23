// Returns the caller's unique Solana deposit address, deriving (and storing
// just the index + public address) on first request. No private keys are saved
// — they are derived on demand from SOLANA_MASTER_MNEMONIC.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { Keypair } from 'npm:@solana/web3.js@1.95.8'
import { mnemonicToSeedSync } from 'npm:bip39@3.1.0'
import { derivePath } from 'npm:ed25519-hd-key@1.3.0'
import { cors, json } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MNEMONIC = Deno.env.get('SOLANA_MASTER_MNEMONIC')!

function deriveAddress(index: number): string {
  const seed = mnemonicToSeedSync(MNEMONIC, '')
  const path = `m/44'/501'/${index}'/0'`
  const { key } = derivePath(path, seed.toString('hex'))
  return Keypair.fromSeed(key).publicKey.toBase58()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
    const { data: { user } } = await admin.auth.getUser(jwt)
    if (!user) return json({ error: 'Unauthorized' }, 401)

    // Already have one?
    const existing = await admin.from('deposit_wallets').select('address').eq('profile_id', user.id).maybeSingle()
    if (existing.data?.address) return json({ address: existing.data.address })

    // Allocate the next derivation index and derive the address.
    const max = await admin.from('deposit_wallets').select('derivation_index').order('derivation_index', { ascending: false }).limit(1).maybeSingle()
    const index = (max.data?.derivation_index ?? -1) + 1
    const address = deriveAddress(index)

    const ins = await admin.from('deposit_wallets').insert({ profile_id: user.id, derivation_index: index, address }).select('address').single()
    if (ins.error) {
      // race: another request inserted first — return whatever exists now
      const again = await admin.from('deposit_wallets').select('address').eq('profile_id', user.id).maybeSingle()
      if (again.data?.address) return json({ address: again.data.address })
      return json({ error: ins.error.message }, 500)
    }
    return json({ address: ins.data.address })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
