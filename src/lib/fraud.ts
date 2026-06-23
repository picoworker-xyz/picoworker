// ============================================================================
// Anti-fraud signals for signup: device fingerprint, IP, and VPN/proxy check.
//
// Honest scope: client-side checks RAISE THE BAR but are bypassable (incognito,
// a second device, a fresh browser). The strongest defense is the KYC step
// (Verify identity) gating withdrawals — see /verify. For production, move the
// IP + VPN lookup server-side (Supabase Edge Function) so the API key is hidden
// and the real client IP is used.
// ============================================================================

export interface FraudSignals {
  deviceHash: string
  ip: string | null
  vpn: boolean
  vpnReason?: string
}

// Stable-ish browser fingerprint hashed with SHA-256.
async function deviceFingerprint(): Promise<string> {
  const n = navigator as Navigator & { deviceMemory?: number }
  const parts = [
    n.userAgent,
    n.language,
    (n.languages || []).join(','),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    `${n.hardwareConcurrency ?? ''}`,
    `${n.deviceMemory ?? ''}`,
    canvasSignal(),
  ]
  return sha256(parts.join('|'))
}

function canvasSignal(): string {
  try {
    const c = document.createElement('canvas')
    const ctx = c.getContext('2d')
    if (!ctx) return 'no-canvas'
    ctx.textBaseline = 'top'
    ctx.font = "14px 'Arial'"
    ctx.fillStyle = '#f60'
    ctx.fillRect(125, 1, 62, 20)
    ctx.fillStyle = '#069'
    ctx.fillText('picoworker', 2, 15)
    return c.toDataURL().slice(-64)
  } catch {
    return 'canvas-err'
  }
}

async function sha256(s: string): Promise<string> {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32)
  } catch {
    // fallback: djb2
    let h = 5381
    for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i)
    return (h >>> 0).toString(16)
  }
}

async function lookupIp(): Promise<string | null> {
  try {
    const r = await fetch('https://api.ipify.org?format=json')
    return (await r.json()).ip ?? null
  } catch {
    return null
  }
}

// VPN/proxy detection. Uses proxycheck.io when VITE_PROXYCHECK_KEY is set
// (free tier: 1000/day). Without a key it can't reliably detect a VPN, so it
// fails open (vpn:false) — the duplicate-account check still applies.
async function detectVpn(ip: string | null): Promise<{ vpn: boolean; reason?: string }> {
  const key = (import.meta.env as Record<string, string | undefined>).VITE_PROXYCHECK_KEY
  if (!key || !ip) return { vpn: false }
  try {
    const r = await fetch(`https://proxycheck.io/v2/${ip}?key=${key}&vpn=1&risk=1`)
    const j = await r.json()
    const rec = j[ip]
    if (rec && (rec.proxy === 'yes' || rec.type === 'VPN' || rec.type === 'TOR')) {
      return { vpn: true, reason: rec.type ?? 'proxy' }
    }
    return { vpn: false }
  } catch {
    return { vpn: false }
  }
}

export async function collectSignals(): Promise<FraudSignals> {
  const deviceHash = await deviceFingerprint()
  const ip = await lookupIp()
  const { vpn, reason } = await detectVpn(ip)
  return { deviceHash, ip, vpn, vpnReason: reason }
}
