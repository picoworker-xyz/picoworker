export function unsignedUrlAndVerifier(rawUrl: string): { unsignedUrl: string; verifier: string } | null {
  // AdGem documents verifier as the final query parameter. Using the raw URL
  // avoids URLSearchParams re-encoding values before HMAC verification.
  const match = /([?&])verifier=([^&#]*)$/i.exec(rawUrl)
  if (!match || match.index === undefined) return null

  let verifier: string
  try {
    verifier = decodeURIComponent(match[2])
  } catch {
    return null
  }

  return { unsignedUrl: rawUrl.slice(0, match.index), verifier }
}

export function validDecimal(value: string, allowZero: boolean): boolean {
  // numeric(18,6) leaves at most 12 digits before the decimal point.
  if (!/^(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/.test(value)) return false
  const parsed = Number(value)
  return Number.isFinite(parsed) && (allowZero ? parsed >= 0 : parsed > 0)
}

export function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

function hexBytes(value: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[0-9a-f]{64}$/i.test(value)) return null
  const result = new Uint8Array(new ArrayBuffer(32))
  for (let i = 0; i < result.length; i += 1) result[i] = Number.parseInt(value.slice(i * 2, i * 2 + 2), 16)
  return result
}

export async function verifyHmac(unsignedUrl: string, verifier: string, secret: string): Promise<boolean> {
  const signature = hexBytes(verifier)
  if (!signature || !secret) return false

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )
  return crypto.subtle.verify('HMAC', key, signature, new TextEncoder().encode(unsignedUrl))
}

