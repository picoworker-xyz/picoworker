// Signup validation — a real email and a strong password.

export function emailError(email: string): string | null {
  const e = email.trim()
  if (!e) return 'Enter your email.'
  // standard-enough email shape: something@something.tld
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return 'Enter a valid email address.'
  return null
}

// Common mistyped email domains → the intended one. Returns a corrected email
// (e.g. user@email.com → user@gmail.com) or null if the domain looks fine.
const DOMAIN_TYPOS: Record<string, string> = {
  'email.com': 'gmail.com',
  'gmail.con': 'gmail.com', 'gmail.com.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.cm': 'gmail.com',
  'gmal.com': 'gmail.com', 'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmil.com': 'gmail.com',
  'gnail.com': 'gmail.com', 'gmaill.com': 'gmail.com', 'gmaul.com': 'gmail.com', ' gmail.com': 'gmail.com',
  'gmailcom': 'gmail.com', 'gmail.om': 'gmail.com', 'gmali.com': 'gmail.com', 'g.mail.com': 'gmail.com',
  'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com', 'yahoo.co': 'yahoo.com', 'yahoo.con': 'yahoo.com',
  'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hotmail.co': 'hotmail.com', 'hotmail.con': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outloo.com': 'outlook.com', 'outlook.co': 'outlook.com', 'outlook.con': 'outlook.com',
  'iclod.com': 'icloud.com', 'icloud.co': 'icloud.com', 'iclould.com': 'icloud.com',
}

export function suggestEmail(email: string): string | null {
  const e = email.trim()
  const at = e.lastIndexOf('@')
  if (at < 1) return null
  const local = e.slice(0, at)
  const domain = e.slice(at + 1).toLowerCase()
  const fix = DOMAIN_TYPOS[domain]
  if (fix && fix !== domain) return `${local}@${fix}`
  return null
}

export function passwordError(pw: string): string | null {
  if (pw.length < 8) return 'Password must be at least 8 characters.'
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw) || !/[^a-zA-Z0-9]/.test(pw)) {
    return 'Use upper & lower case letters, a number, and a special character.'
  }
  return null
}

// Turn a raw auth/network error into a friendly, never-blank message.
export function cleanAuthError(message?: string, status?: number): string {
  const m = (message ?? '').trim()
  const low = m.toLowerCase()
  if (status === 429 || low.includes('rate') || low.includes('security purposes') || low.includes('too many')) {
    return "Too many requests — please wait a few minutes and try again."
  }
  if (!m || m === '{}' || m === '[object Object]') return 'Something went wrong. Please try again.'
  if (low.includes('invalid login')) return 'Wrong email or password.'
  if (low.includes('email not confirmed')) return 'Please confirm your email first, then sign in.'
  return m
}

// 0–4 strength score for a small meter.
export function passwordStrength(pw: string): number {
  let s = 0
  if (pw.length >= 8) s++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^a-zA-Z0-9]/.test(pw) || pw.length >= 12) s++
  return s
}

export interface PasswordRequirement {
  label: string
  met: boolean
}

export function passwordRequirements(pw: string): PasswordRequirement[] {
  return [
    { label: '8+ characters', met: pw.length >= 8 },
    { label: 'Upper & lower case', met: /[a-z]/.test(pw) && /[A-Z]/.test(pw) },
    { label: 'At least one number', met: /[0-9]/.test(pw) },
    { label: 'Special character', met: /[^a-zA-Z0-9]/.test(pw) },
  ]
}
