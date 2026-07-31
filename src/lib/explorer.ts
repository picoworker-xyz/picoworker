// Block-explorer links.
//
// Payouts moved to Base while deposits are still taken on Solana, so the chain
// cannot be assumed from context — a hardcoded explorer sent Base withdrawal
// hashes to Solscan, which shows "not found". Route on the hash shape instead:
// an EVM hash is 0x plus 64 hex characters, a Solana signature is base58 and
// has no prefix.
function isEvmHash(sig: string | null | undefined): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test((sig ?? '').trim())
}

export function txUrl(sig: string | null | undefined): string {
  const s = (sig ?? '').trim()
  if (!s) return ''
  return isEvmHash(s) ? `https://basescan.org/tx/${s}` : `https://solscan.io/tx/${s}`
}

export function explorerName(sig: string | null | undefined): string {
  return isEvmHash(sig) ? 'BaseScan' : 'Solscan'
}
