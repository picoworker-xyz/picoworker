import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>

export const Bell = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M10 19a2 2 0 004 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

export const Trophy = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <path d="M7 4h10v4a5 5 0 01-10 0V4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M7 6H4v1a3 3 0 003 3M17 6h3v1a3 3 0 01-3 3M9 20h6M12 13v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const Globe = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" stroke="currentColor" strokeWidth="2" />
  </svg>
)

export const Chat = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <path d="M4 5h16v11H8l-4 4V5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
  </svg>
)

export const Star = (p: P) => (
  <svg viewBox="0 0 24 24" {...p}>
    <path d="M12 2l2.9 6.3 6.9.6-5.2 4.5 1.6 6.7L12 16.9 5.8 20.6l1.6-6.7L2.2 9.4l6.9-.6L12 2z" fill="currentColor" />
  </svg>
)

export const Zoom = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
    <path d="M16 16l4 4M11 8v6M8 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

export const Send = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <path d="M4 12l16-7-7 16-2.5-6.5L4 12z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
  </svg>
)

export const IdCard = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="2" />
    <circle cx="8.5" cy="11" r="2" stroke="currentColor" strokeWidth="2" />
    <path d="M13 10h5M13 14h5M5.5 15c.6-1.3 1.7-2 3-2s2.4.7 3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

export const X = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
)

export const PicoLogo = (p: P) => (
  <svg viewBox="0 0 24 24" {...p}>
    <path
      d="M7 4h6.2c3 0 5 1.9 5 4.7 0 2.9-2 4.8-5 4.8H10.4V20H7V4Zm3.4 3v3.4h2.5c1.2 0 2-.66 2-1.7 0-1.04-.8-1.7-2-1.7h-2.5Z"
      fill="currentColor"
    />
  </svg>
)

export const ArrowRight = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const ChevronLeft = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const ExternalLink = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <path d="M7 17L17 7M9 7h8v8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const Dots = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <circle cx="12" cy="6" r="1.4" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="12" r="1.4" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="18" r="1.4" stroke="currentColor" strokeWidth="2" />
  </svg>
)

export const Grid = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="2.2" stroke="currentColor" strokeWidth="2" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="2.2" stroke="currentColor" strokeWidth="2" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="2.2" stroke="currentColor" strokeWidth="2" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="2.2" stroke="currentColor" strokeWidth="2" />
  </svg>
)

export const Gear = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M19.4 13a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-2.7 1.1V21a2 2 0 01-4 0v-.1A1.6 1.6 0 005 19.4l-.1.1a2 2 0 11-2.8-2.8l.1-.1A1.6 1.6 0 003 13.9H3a2 2 0 010-4h.1A1.6 1.6 0 005 8.6l-.1-.1a2 2 0 112.8-2.8l.1.1A1.6 1.6 0 0010 5V5a2 2 0 014 0v.1a1.6 1.6 0 002.7 1.1l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00.3 1.8 1.6 1.6 0 001.5 1H21a2 2 0 010 4h-.1a1.6 1.6 0 00-1.5 1z"
      stroke="currentColor"
      strokeWidth="1.6"
    />
  </svg>
)

export const Flame = (p: P) => (
  <svg viewBox="0 0 14 16" {...p}>
    <path
      d="M7 0c1.2 2.6.4 4.2-.8 5.6C5 7 3.7 8.2 3.7 10.2 3.7 13 5.2 15 7 15s3.3-2 3.3-4.8c0-1.2-.5-2.2-1-3 .2 1-.4 1.8-1 1.8-.7 0-1-.7-.8-1.6C7.9 5 8.7 2.6 7 0Z"
      fill="currentColor"
    />
  </svg>
)

export const ArrowUp = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const ArrowDown = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const Shield = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const Check = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <path d="M5 12l4.5 4.5L19 6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const Plus = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
)

export const Wallet = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <rect x="3" y="6" width="18" height="13" rx="3" stroke="currentColor" strokeWidth="2" />
    <path d="M16 12h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

export const Bolt = (p: P) => (
  <svg viewBox="0 0 24 24" {...p}>
    <path d="M13 2L4.5 13.5H11l-1 8.5L19.5 10H13l1-8z" fill="currentColor" />
  </svg>
)

export const ListIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <path d="M8 6h12M8 12h12M8 18h12M3.5 6h.01M3.5 12h.01M3.5 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

export const User = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <circle cx="12" cy="8" r="3.6" stroke="currentColor" strokeWidth="2" />
    <path d="M5 20c1.4-3.6 4-5 7-5s5.6 1.4 7 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

export const Home = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <path d="M4 11l8-7 8 7M6 9.5V20h12V9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const XLogo = (p: P) => (
  <svg viewBox="0 0 24 24" {...p}>
    <path
      d="M18.244 2H21.5l-7.5 8.57L22.5 22h-6.9l-4.9-6.4L4.9 22H1.64l8.02-9.17L1.5 2h7.07l4.43 5.86L18.244 2Zm-1.21 18h1.78L7.05 3.9H5.14L17.034 20Z"
      fill="currentColor"
    />
  </svg>
)

export const Google = (p: P) => (
  <svg viewBox="0 0 24 24" {...p}>
    <path fill="#4285F4" d="M22.5 12.2c0-.7-.06-1.4-.18-2.05H12v3.9h5.9a5 5 0 01-2.18 3.3v2.7h3.52c2.06-1.9 3.26-4.7 3.26-7.85z" />
    <path fill="#34A853" d="M12 23c2.95 0 5.43-.98 7.24-2.65l-3.52-2.7c-.98.66-2.23 1.05-3.72 1.05-2.86 0-5.28-1.93-6.15-4.52H2.2v2.78A11 11 0 0012 23z" />
    <path fill="#FBBC05" d="M5.85 14.18a6.6 6.6 0 010-4.36V7.04H2.2a11 11 0 000 9.92l3.65-2.78z" />
    <path fill="#EA4335" d="M12 4.75c1.61 0 3.06.55 4.2 1.64l3.13-3.13C17.43 1.46 14.95.5 12 .5A11 11 0 002.2 7.04l3.65 2.78C6.72 7.23 9.14 4.75 12 4.75z" />
  </svg>
)

export const Apple = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M16.4 12.9c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.15-2.8.85-3.5.85-.7 0-1.85-.83-3-.8-1.55.02-2.98.9-3.78 2.3-1.6 2.8-.4 6.95 1.15 9.2.76 1.1 1.66 2.35 2.85 2.3 1.14-.05 1.57-.74 2.95-.74 1.37 0 1.76.74 2.96.72 1.22-.02 2-1.12 2.75-2.23.86-1.28 1.22-2.52 1.24-2.58-.03-.01-2.38-.91-2.4-3.6zM14.1 6.3c.63-.77 1.06-1.83.94-2.9-.91.04-2.02.61-2.67 1.37-.58.67-1.09 1.75-.95 2.78 1.02.08 2.05-.52 2.68-1.25z" />
  </svg>
)

export const Phone = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <rect x="6" y="2" width="12" height="20" rx="3" stroke="currentColor" strokeWidth="2" />
    <path d="M11 18h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

export const Play = (p: P) => (
  <svg viewBox="0 0 24 24" {...p}>
    <path d="M9 6.5v11l9-5.5z" fill="currentColor" />
  </svg>
)

export const Camera = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="2" />
  </svg>
)

export const Clock = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const Share = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 6l-4-4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 2v13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const Eye = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <path d="M1 12S5 4 12 4s11 8 11 8-5 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const EyeOff = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M1 1l22 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
