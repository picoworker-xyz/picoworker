// The real PicoWorker mark. One tiny cached asset (public/logo-mark.webp, ~4KB)
// referenced by URL everywhere, so the browser fetches it once and reuses it.
export function BrandLogo({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <img
      src="/logo-mark.webp"
      alt="PicoWorker"
      width={size}
      height={size}
      decoding="async"
      className={`object-contain flex-none ${className}`}
      style={{ width: size, height: size }}
    />
  )
}
