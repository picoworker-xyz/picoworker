// Proof file handling for the `proofs` storage bucket.
//
// SECURITY: the bucket is public, so every uploaded file gets a direct URL on
// our own origin. An SVG is an XML document that can carry <script>, so a file
// served as image/svg+xml executes in our origin the moment anyone opens that
// URL — stored XSS, uploaded by any signed-up worker. Same for HTML and XML.
//
// The mitigation is to upload those types as application/octet-stream. The
// bytes are preserved, the business can still download the original, but no
// browser will ever execute them inline. Do not "fix" this by relying on a
// download attribute: that only governs our own anchor tag, not the raw URL.
const NEVER_INLINE = new Set([
  'image/svg+xml',
  'text/html',
  'application/xhtml+xml',
  'text/xml',
  'application/xml',
])

export type ProofFileKind = 'image' | 'pdf' | 'vector' | 'archive'

export const PROOF_FILE_KINDS: { value: ProofFileKind; label: string; accept: string }[] = [
  { value: 'image', label: 'Images', accept: 'image/png,image/jpeg,image/webp,image/gif' },
  { value: 'pdf', label: 'PDF', accept: 'application/pdf' },
  { value: 'vector', label: 'SVG', accept: 'image/svg+xml,.svg' },
  { value: 'archive', label: 'ZIP', accept: 'application/zip,.zip' },
]

export const DEFAULT_PROOF_KINDS: ProofFileKind[] = ['image']
export const DEFAULT_MAX_FILE_MB = 10

/** `accept` attribute for a file input, from the kinds a task allows. */
export function acceptAttr(kinds: string[] | undefined): string {
  const set = new Set(kinds?.length ? kinds : DEFAULT_PROOF_KINDS)
  const parts = PROOF_FILE_KINDS.filter((k) => set.has(k.value)).map((k) => k.accept)
  return parts.length ? parts.join(',') : PROOF_FILE_KINDS[0].accept
}

/** Content type to store the file as. Never returns an inline-executable type. */
export function safeContentType(file: File): string {
  const t = (file.type || '').toLowerCase()
  if (!t) return 'application/octet-stream'
  return NEVER_INLINE.has(t) ? 'application/octet-stream' : t
}

/** True when the URL can be shown with <img> rather than a download link. */
export function isInlineImage(url: string): boolean {
  return /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url)
}

export function fileNameFromUrl(url: string): string {
  try {
    return decodeURIComponent(new URL(url).pathname.split('/').pop() || 'file')
  } catch {
    return 'file'
  }
}

/** Returns an error message when the file is not acceptable, else null. */
export function validateProofFile(
  file: File,
  kinds: string[] | undefined,
  maxMb: number | undefined,
): string | null {
  const limit = (maxMb ?? DEFAULT_MAX_FILE_MB) * 1024 * 1024
  if (file.size > limit) {
    return `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${maxMb ?? DEFAULT_MAX_FILE_MB} MB.`
  }
  const set = new Set(kinds?.length ? kinds : DEFAULT_PROOF_KINDS)
  const t = (file.type || '').toLowerCase()
  const name = file.name.toLowerCase()
  const ok =
    (set.has('image') && /^image\/(png|jpeg|webp|gif)$/.test(t)) ||
    (set.has('pdf') && (t === 'application/pdf' || name.endsWith('.pdf'))) ||
    (set.has('vector') && (t === 'image/svg+xml' || name.endsWith('.svg'))) ||
    (set.has('archive') && (t === 'application/zip' || t === 'application/x-zip-compressed' || name.endsWith('.zip')))
  return ok ? null : 'That file type is not accepted for this task.'
}
