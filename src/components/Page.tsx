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
      {(title || back || actions) && (
        <div className={title || back ? 'mb-7 lg:mb-8' : 'mb-5 flex justify-end'}>
          {/* Back sits on its own line so it never floats next to a wrapping title */}
          {back && (
            <button
              onClick={() => nav(-1)}
              className="inline-flex items-center gap-1 text-[var(--ink-3)] text-[13px] font-bold hover:text-[var(--ink)] mb-4 -ml-1"
            >
              <ChevronLeft width={17} height={17} /> Back
            </button>
          )}
          {/* Title and actions: stacked on mobile, side by side from sm up */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            {title && (
              <div className="min-w-0">
                <h1 className="font-head text-[22px] lg:text-[28px] font-extrabold text-[var(--ink)] tracking-[-.02em]">{title}</h1>
                {subtitle && <div className="text-[var(--ink-3)] text-[14px] font-semibold mt-1 max-w-[560px]">{subtitle}</div>}
              </div>
            )}
            {actions && <div className="flex items-center gap-2 flex-none">{actions}</div>}
          </div>
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
