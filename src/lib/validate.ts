// Signup validation — a real email and a strong password.

export function emailError(email: string): string | null {
  const e = email.trim()
  if (!e) return 'Enter your email.'
  // standard-enough email shape: something@something.tld
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return 'Enter a valid email address.'
  return null
}

export function passwordError(pw: string): string | null {
  if (pw.length < 8) return 'Password must be at least 8 characters.'
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw)) {
    return 'Use upper & lower case letters and a number.'
  }
  return null
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
