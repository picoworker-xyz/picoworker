import type { ButtonHTMLAttributes, ReactNode } from 'react'

// ---- Button ----
type Variant = 'primary' | 'dark' | 'ghost' | 'white'
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  block?: boolean
}
export function Button({ variant = 'primary', block, className = '', children, ...rest }: BtnProps) {
  const base =
    'font-head font-extrabold rounded-[14px] flex items-center justify-center gap-[9px] transition-[transform,opacity] active:scale-[.98] disabled:opacity-50 disabled:active:scale-100'
  const styles: Record<Variant, string> = {
    primary: 'bg-[var(--accent)] text-[var(--accent-ink)]',
    dark: 'bg-[#15161C] text-white border border-white/12',
    ghost: 'bg-white/5 text-white border border-white/12',
    white: 'bg-white text-[#111]',
  }
  return (
    <button
      className={`${base} ${styles[variant]} ${block ? 'w-full' : ''} ${className}`}
      style={variant === 'primary' ? { boxShadow: 'var(--glow)' } : undefined}
      {...rest}
    >
      {children}
    </button>
  )
}

// ---- Chip ----
export function Chip({
  active,
  children,
  onClick,
  tone = 'default',
}: {
  active?: boolean
  children: ReactNode
  onClick?: () => void
  tone?: 'default' | 'green'
}) {
  if (active) {
    return (
      <button
        onClick={onClick}
        className="flex-none px-4 py-[9px] rounded-full font-head text-[13px] font-extrabold bg-[var(--accent)] text-[var(--accent-ink)]"
      >
        {children}
      </button>
    )
  }
  const toneCls = tone === 'green' ? 'bg-[rgba(68,209,122,.14)] text-[var(--green)]' : 'bg-white/6 text-[#C2C4CE]'
  return (
    <button onClick={onClick} className={`flex-none px-[15px] py-[9px] rounded-full text-[13px] font-bold ${toneCls}`}>
      {children}
    </button>
  )
}

// ---- Card ----
export function Card({ children, className = '', glow }: { children: ReactNode; className?: string; glow?: boolean }) {
  return (
    <div
      className={`rounded-[var(--r)] bg-[#15161C] border border-white/6 ${className}`}
      style={glow ? { boxShadow: 'var(--glow)' } : undefined}
    >
      {children}
    </div>
  )
}

// ---- ProgressBar ----
export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-[8px] rounded-full bg-white/8 overflow-hidden">
      <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  )
}

// ---- StatTile ----
export function StatTile({ value, label, accent }: { value: ReactNode; label: string; accent?: boolean }) {
  return (
    <div className="flex-1 rounded-[16px] p-[14px] bg-[#15161C] border border-white/6">
      <div className={`font-head text-[18px] font-extrabold ${accent ? 'text-[var(--accent)]' : 'text-white'}`}>{value}</div>
      <div className="text-[#767884] text-[11px] font-semibold mt-[2px]">{label}</div>
    </div>
  )
}

// ---- Avatar ----
export function Avatar({ name, size = 42, gradient }: { name: string; size?: number; gradient?: string }) {
  return (
    <div
      className="flex-none rounded-[13px] flex items-center justify-center font-head font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: gradient ?? 'linear-gradient(135deg,#8B6CFF,#FF6B5A)',
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

// ---- Pill (small tag) ----
export function Pill({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'green' | 'violet' }) {
  const tones = {
    default: 'bg-white/6 text-[#B6B8C2]',
    green: 'bg-[rgba(68,209,122,.14)] text-[var(--green)]',
    violet: 'bg-[#8B6CFF] text-white',
  }
  return <span className={`px-3 py-[6px] rounded-full text-[12px] font-bold ${tones[tone]}`}>{children}</span>
}
