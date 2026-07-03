// The real PicoWorker mark. One tiny cached asset (public/logo-mark.webp, ~4KB)
// referenced by URL everywhere, so the browser fetches it once and reuses it.
// On light backgrounds it sits on a subtle dark tile (--logo-bg) so the lime
// mark stays crisp; on dark the tile is transparent and the mark floats.
export function BrandLogo({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-[11px] flex-none overflow-hidden ${className}`}
      style={{ width: size, height: size, background: 'var(--logo-bg)' }}
    >
      <img
        src="/logo-mark.webp"
        alt="PicoWorker"
        width={size}
        height={size}
        decoding="async"
        className="object-contain"
        style={{ width: '100%', height: '100%' }}
      />
    </span>
  )
}
