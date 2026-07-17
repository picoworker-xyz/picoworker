export function signatureBase(params: Record<string, string>, secret: string): string {
  return Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('') + secret
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function signV3(params: Record<string, string>, secret: string): Promise<string> {
  return sha256Hex(signatureBase(params, secret))
}

export async function verifyV3(
  params: Record<string, string>,
  suppliedSignature: string,
  secret: string,
): Promise<boolean> {
  if (!/^[0-9a-f]{64}$/i.test(suppliedSignature)) return false
  const expected = await signV3(params, secret)
  let difference = 0
  for (let i = 0; i < expected.length; i += 1) {
    difference |= expected.charCodeAt(i) ^ suppliedSignature.toLowerCase().charCodeAt(i)
  }
  return difference === 0
}

