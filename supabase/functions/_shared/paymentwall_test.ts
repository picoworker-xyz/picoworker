import { sha256Hex, signatureBase, signV3, verifyV3 } from './paymentwall.ts'

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

Deno.test('Paymentwall signature base sorts parameter names', () => {
  const base = signatureBase(
    { uid: 'userid', type: '0', sign_version: '3', ref: 'b1491808025', currency: '200' },
    'SECRET_KEY',
  )
  assert(
    base === 'currency=200ref=b1491808025sign_version=3type=0uid=useridSECRET_KEY',
    `unexpected signature base: ${base}`,
  )
})

Deno.test('Paymentwall SHA-256 helper matches a standard vector', async () => {
  assert(
    await sha256Hex('abc') === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    'SHA-256 mismatch',
  )
})

Deno.test('Paymentwall v3 verifier rejects changed parameters', async () => {
  const secret = 'private-key'
  const params = { key: 'public-key', sign_version: '3', uid: 'user-1', widget: 'mw1' }
  const signature = await signV3(params, secret)
  assert(await verifyV3(params, signature, secret), 'correct signature rejected')
  assert(
    !(await verifyV3({ ...params, uid: 'user-2' }, signature, secret)),
    'tampered parameters accepted',
  )
})

