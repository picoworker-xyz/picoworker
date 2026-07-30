import { fileNameFromUrl, isInlineImage } from '../lib/proofFiles'
import { ExternalLink, ListIcon, Zoom } from './icons'

/**
 * Renders submitted proof. Raster images preview inline; PDF, SVG and ZIP are
 * offered as downloads.
 *
 * Non-image proofs are deliberately NOT embedded in an iframe or object tag.
 * They live on a public bucket on our own origin, so rendering one inline would
 * execute whatever it contains in our origin. They are uploaded as
 * application/octet-stream (see lib/proofFiles.ts) so a browser downloads them
 * rather than running them.
 */
export function ProofFiles({ urls, onZoom }: { urls: string[]; onZoom?: (url: string) => void }) {
  if (urls.length === 0) return null
  return (
    <div className="flex flex-col gap-3">
      {urls.map((url, i) =>
        isInlineImage(url) ? (
          <button
            key={url}
            onClick={() => onZoom?.(url)}
            className="relative rounded-[14px] overflow-hidden border border-[var(--line-2)] block w-full"
          >
            <img src={url} alt={`proof ${i + 1}`} className="w-full max-h-[300px] object-contain bg-black/40" />
            {onZoom && (
              <span className="absolute bottom-2 right-2 w-8 h-8 rounded-[10px] bg-black/60 flex items-center justify-center">
                <Zoom width={15} height={15} className="text-[#fff]" />
              </span>
            )}
          </button>
        ) : (
          <a
            key={url}
            href={url}
            download={fileNameFromUrl(url)}
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center gap-3 rounded-[14px] border border-[var(--line-2)] bg-[var(--fill)] px-4 py-3 hover:border-[var(--accent)]"
          >
            <ListIcon width={19} height={19} className="text-[var(--ink-3)] flex-none" />
            <span className="flex-1 min-w-0 text-[13px] font-bold text-[var(--ink)] truncate">
              {fileNameFromUrl(url)}
            </span>
            <span className="flex items-center gap-1 text-[12px] font-extrabold text-[var(--accent-strong)] flex-none">
              Download <ExternalLink width={13} height={13} />
            </span>
          </a>
        ),
      )}
    </div>
  )
}
