import { Connection, Keypair, PublicKey, Transaction } from 'npm:@solana/web3.js@1.95.8'
import {
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
} from 'npm:@solana/spl-token@0.4.9'
import { mnemonicToSeedSync } from 'npm:bip39@3.1.0'
import { derivePath } from 'npm:ed25519-hd-key@1.3.0'

export const RPC_URL = Deno.env.get('SOLANA_RPC_URL')!
export const USDC_MINT = new PublicKey(Deno.env.get('USDC_MINT')!)
const USDC_DECIMALS = 6
const MNEMONIC = Deno.env.get('SOLANA_MASTER_MNEMONIC')!

export function conn() {
  return new Connection(RPC_URL, 'confirmed')
}

// One central treasury wallet that holds swept funds and pays out withdrawals.
export function treasury(): Keypair {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(Deno.env.get('TREASURY_SECRET')!)))
}

// HD-derived per-user deposit keypair (same scheme as solana-deposit-address).
export function depositKeypair(index: number): Keypair {
  const seed = mnemonicToSeedSync(MNEMONIC, '')
  const { key } = derivePath(`m/44'/501'/${index}'/0'`, seed.toString('hex'))
  return Keypair.fromSeed(key)
}

export async function usdcBalance(c: Connection, owner: PublicKey): Promise<number> {
  const ata = getAssociatedTokenAddressSync(USDC_MINT, owner, true)
  try {
    const a = await getAccount(c, ata)
    return Number(a.amount) / 10 ** USDC_DECIMALS
  } catch {
    return 0
  }
}

// Send `uiAmount` USDC from `from` (the token authority) to `toOwner`. `feePayer`
// pays the SOL fee and any token-account rent. Returns the confirmed signature.
export async function transferUsdc(
  c: Connection,
  from: Keypair,
  toOwner: PublicKey,
  uiAmount: number,
  feePayer: Keypair,
): Promise<string> {
  const amount = BigInt(Math.round(uiAmount * 10 ** USDC_DECIMALS))
  const fromAta = getAssociatedTokenAddressSync(USDC_MINT, from.publicKey, true)
  const toAta = getAssociatedTokenAddressSync(USDC_MINT, toOwner, true)

  const tx = new Transaction()
  try {
    await getAccount(c, toAta)
  } catch {
    tx.add(createAssociatedTokenAccountInstruction(feePayer.publicKey, toAta, toOwner, USDC_MINT))
  }
  tx.add(createTransferCheckedInstruction(fromAta, USDC_MINT, toAta, from.publicKey, amount, USDC_DECIMALS))
  tx.feePayer = feePayer.publicKey
  const { blockhash } = await c.getLatestBlockhash('confirmed')
  tx.recentBlockhash = blockhash

  const signers = from.publicKey.equals(feePayer.publicKey) ? [feePayer] : [feePayer, from]
  const sig = await c.sendTransaction(tx, signers)
  await c.confirmTransaction(sig, 'confirmed')
  return sig
}
