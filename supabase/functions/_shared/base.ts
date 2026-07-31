// Base (Coinbase L2) USDC payouts.
//
// Why Base rather than Solana: measured per-transfer cost is effectively
// identical (~$0.0004 on both). The difference is that USDC on Solana needs an
// Associated Token Account per recipient, costing ~0.00204 SOL of rent that the
// treasury pays on a worker's first withdrawal. ERC-20 balances need no such
// setup, so there is no first-withdrawal surcharge and the minimum payout can
// drop from $0.20 to cents.
import { Contract, JsonRpcProvider, Wallet, isAddress, parseUnits } from 'npm:ethers@6.13.4'

export const RPC_URL = Deno.env.get('BASE_RPC_URL') ?? 'https://mainnet.base.org'
const USDC_ADDRESS = Deno.env.get('BASE_USDC') ?? '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
const USDC_DECIMALS = 6

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
]

export function provider(): JsonRpcProvider {
  return new JsonRpcProvider(RPC_URL)
}

export function treasury(p: JsonRpcProvider): Wallet {
  return new Wallet(Deno.env.get('BASE_TREASURY_SECRET')!, p)
}

/**
 * Validates an EVM address. Rejects the zero address and, when the string is
 * mixed case, enforces the EIP-55 checksum — a lowercase address is accepted
 * as-is since it carries no checksum to verify.
 */
export function validAddress(value: string): boolean {
  const a = (value ?? '').trim()
  if (!/^0x[0-9a-fA-F]{40}$/.test(a)) return false
  if (a.toLowerCase() === '0x0000000000000000000000000000000000000000') return false
  return isAddress(a)
}

export async function usdcBalance(p: JsonRpcProvider, owner: string): Promise<number> {
  const c = new Contract(USDC_ADDRESS, ERC20_ABI, p)
  const raw = await c.balanceOf(owner) as bigint
  return Number(raw) / 10 ** USDC_DECIMALS
}

/**
 * Sends USDC from the treasury and waits for one confirmation. Returns the
 * transaction hash. Throws if the treasury is short, so the caller can refund
 * the user rather than marking a payout sent that never happened.
 */
export async function transferUsdc(to: string, uiAmount: number): Promise<string> {
  const p = provider()
  const wallet = treasury(p)
  const usdc = new Contract(USDC_ADDRESS, ERC20_ABI, wallet)

  const amount = parseUnits(uiAmount.toFixed(USDC_DECIMALS), USDC_DECIMALS)
  const held = await usdc.balanceOf(wallet.address) as bigint
  if (held < amount) throw new Error('Treasury is short of USDC')

  const tx = await usdc.transfer(to, amount)
  const receipt = await tx.wait(1)
  if (!receipt || receipt.status !== 1) throw new Error('Transfer reverted')
  return tx.hash
}
