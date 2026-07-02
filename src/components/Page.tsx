import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from './icons'

// Standard web page: centered max-width container with optional title row.
export function Page({
  title,
  subtitle,
  actions,
  children,
  narrow,
  back,
}: {
  title?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  children: ReactNode
  narrow?: boolean
  back?: boolean
}) {
  const nav = useNavigate()
  return (
    <div className={`app-container py-7 lg:py-12 ${narrow ? 'max-w-[640px]' : ''}`}>
      {(title || back) && (
        <div className="flex items-center justify-between gap-4 mb-7 lg:mb-8">
          <div className="flex items-center gap-3 min-w-0">
            {back && (
              <button
                onClick={() => nav(-1)}
                className="w-10 h-10 rounded-[12px] bg-[var(--fill)] flex items-center justify-center text-[var(--ink)] hover:bg-[var(--fill-2)] flex-none"
              >
                <ChevronLeft width={18} height={18} />
              </button>
            )}
            {title && (
              <div className="min-w-0">
                <h1 className="font-head text-[22px] lg:text-[28px] font-extrabold text-[var(--ink)] tracking-[-.02em] truncate">{title}</h1>
                {subtitle && <div className="text-[var(--ink-3)] text-[14px] font-semibold mt-1">{subtitle}</div>}
              </div>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 flex-none">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  )
}

// Centered single-card layout for auth / success / confirmation screens.
export function CenteredPage({ children }: { children: ReactNode }) {
  return (
    <div className="app-container min-h-[70svh] flex items-center justify-center py-10">
      <div className="w-full max-w-[460px] reveal">{children}</div>
    </div>
  )
}
