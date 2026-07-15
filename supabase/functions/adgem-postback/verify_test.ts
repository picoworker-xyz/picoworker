import { unsignedUrlAndVerifier, validDecimal, validUuid, verifyHmac } from './verify.ts'

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function hex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

Deno.test('extracts only a final verifier without normalizing the signed URL', () => {
  const raw = 'https://example.com/postback?amount=1.25&goal_name=Level%2020&verifier=abc%31%32%33'
  const result = unsignedUrlAndVerifier(raw)
  assert(result?.unsignedUrl === 'https://example.com/postback?amount=1.25&goal_name=Level%2020', 'wrong unsigned URL')
  assert(result?.verifier === 'abc123', 'wrong verifier')
  assert(unsignedUrlAndVerifier(`${raw}&extra=1`) === null, 'accepted a non-final verifier')
})

Deno.test('validates Postgres-compatible reward decimals', () => {
  assert(validDecimal('0.000001', false), 'rejected smallest positive reward')
  assert(validDecimal('1000', false), 'rejected integer reward')
  assert(validDecimal('0', true), 'rejected zero payout')
  assert(!validDecimal('0', false), 'accepted zero reward')
  assert(!validDecimal('-1', false), 'accepted negative reward')
  assert(!validDecimal('1.0000001', false), 'accepted excess precision')
  assert(!validDecimal('1000000000000', false), 'accepted numeric(18,6) overflow')
})

Deno.test('validates UUID shape', () => {
  assert(validUuid('01786456-b959-404a-baa7-05ef8a2e0290'), 'rejected UUID')
  assert(!validUuid('not-a-player'), 'accepted invalid UUID')
})

Deno.test('verifies HMAC-SHA256 and rejects URL tampering', async () => {
  const secret = 'test-postback-key'
  const unsignedUrl = 'https://example.com/postback?amount=1&player_id=01786456-b959-404a-baa7-05ef8a2e0290'
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const verifier = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(unsignedUrl)))

  assert(await verifyHmac(unsignedUrl, verifier, secret), 'rejected correct verifier')
  assert(!(await verifyHmac(`${unsignedUrl}&amount=9`, verifier, secret)), 'accepted a tampered URL')
  assert(!(await verifyHmac(unsignedUrl, 'not-hex', secret)), 'accepted malformed verifier')
})

