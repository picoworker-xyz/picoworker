// ============================================================================
// PAYOUT SEAM
// ----------------------------------------------------------------------------
// v1 ships *simulated* USDC payouts — a withdrawal just moves numbers in the
// store and resolves after a short delay ("arrives in seconds on Solana").
//
// To go live with real money later, replace the body of `submitWithdrawal`
// with a real Solana / Polygon USDC transfer (e.g. @solana/web3.js +
// @solana/spl-token). Nothing in the UI needs to change — it only awaits this
// function and reads the returned status.
// ============================================================================

export interface WithdrawalInput {
  amount: number
  asset: 'USDC' | 'USDT'
  network: string
  address: string
}

export interface WithdrawalResult {
  ok: boolean
  txRef: string
  fee: number
  netReceived: number
  etaSeconds: number
}

const NETWORK_FEE = 0.01 // simulated flat network fee

export async function submitWithdrawal(w: WithdrawalInput): Promise<WithdrawalResult> {
  // Simulate broadcast latency.
  await new Promise((r) => setTimeout(r, 700))

  const fee = NETWORK_FEE
  const netReceived = Math.max(0, w.amount - fee)

  return {
    ok: true,
    txRef: `sim_${Math.random().toString(36).slice(2, 10)}`,
    fee,
    netReceived,
    etaSeconds: 30,
  }
}

export function estimateWithdrawal(amount: number) {
  const fee = NETWORK_FEE
  return { fee, netReceived: Math.max(0, amount - fee) }
}
