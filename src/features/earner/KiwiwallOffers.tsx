import { useEffect, useState } from 'react'
import { useStore } from '../../lib/store'
import { Page } from '../../components/Page'
import { Globe, Shield } from '../../components/icons'
import { OfferTabs } from '../../components/OfferTabs'

// Public placement key. It appears in the wall URL by design, so unlike the
// signing secret it is safe in the client bundle.
const PLACEMENT_ID = 'plc_fhes2g4o'

// The wall's own background (--kw-background: oklch(0.16 0.02 265)).
const WALL_SURFACE = '#090D16'

export function KiwiwallOffers() {
  const { userId } = useStore()
  const [loaded, setLoaded] = useState(false)
  // The provider restricts embedding with `frame-ancestors` to picoworker.xyz,
  // and some browsers block third-party frames outright. There is no reliable
  // event for "the frame was refused", so treat a frame that never loads as
  // blocked and steer the user to the direct link instead of a blank box.
  const [maybeBlocked, setMaybeBlocked] = useState(false)

  useEffect(() => {
    if (loaded) return
    const t = setTimeout(() => setMaybeBlocked(true), 4000)
    return () => clearTimeout(t)
  }, [loaded])

  if (!userId) {
    return (
      <Page>
        <div className="rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-8 text-center">
          <Globe width={30} height={30} className="mx-auto text-[var(--ink-5)]" />
          <div className="mt-3 font-head text-[16px] font-extrabold text-[var(--ink)]">Sign in to see offers</div>
        </div>
      </Page>
    )
  }

  // sub_id is how the provider tells us who converted, so it must be the real
  // account id. Never ship the placeholder from their docs.
  const src = `https://offers.kiwiwall.com/wall/${PLACEMENT_ID}?user_id=${encodeURIComponent(userId)}`

  return (
    <Page>
      <OfferTabs />
      <div className="mb-3 flex items-center gap-2 font-head text-[18px] font-extrabold text-[var(--ink)]">
        <Globe width={19} height={19} className="text-[var(--accent-strong)]" /> Worldwide offers
      </div>
      <div className="mb-4 text-[12.5px] font-semibold leading-[1.5] text-[var(--ink-4)]">
        Surveys and app offers from our worldwide partner. Rewards are credited automatically after the
        provider confirms your completion, which can take a few minutes.
      </div>

      {maybeBlocked && !loaded && (
        <div className="mb-4 rounded-[14px] border border-[rgba(242,163,60,.25)] bg-[rgba(242,163,60,.08)] p-3.5 text-[12px] font-semibold leading-[1.5] text-[var(--ink-3)]">
          The offers panel did not load. Your browser or an extension may be blocking embedded content.
          Turn off any content blocker for picoworker.xyz and refresh.
        </div>
      )}

      {/*
        The wall is a cross-origin document, so its interior cannot be styled and
        it ships no theme parameter — theme=dark/light change nothing. It is
        already dark with a green accent (#090D16 surface, #4ED589 primary),
        which sits close to our own #0B0C10 / #2EE06E. Matching the container to
        WALL_SURFACE hides the seam so the frame reads as part of the page
        rather than a pasted-in box. Keep this in sync if they restyle.
      */}
      <div
        className="relative overflow-hidden rounded-[18px] border border-[var(--line)]"
        style={{ background: WALL_SURFACE, boxShadow: 'var(--shadow)' }}
      >
        {!loaded && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: WALL_SURFACE }}
          >
            <div className="text-[13px] font-semibold text-[#8A93A6]">Loading offers…</div>
          </div>
        )}
        <iframe
          src={src}
          title="Worldwide offers"
          onLoad={() => setLoaded(true)}
          className="block h-[min(78svh,900px)] w-full border-0"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          // The wall is a third-party document. Allow it to run and navigate
          // itself, but not to reach back into this page's origin.
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
        />
      </div>

      <div className="mt-4 flex items-start gap-2.5 rounded-[14px] border border-[rgba(242,163,60,.25)] bg-[rgba(242,163,60,.08)] p-3.5">
        <Shield width={17} height={17} className="mt-0.5 flex-none text-[#D99832]" />
        <p className="text-[11.5px] font-semibold leading-[1.5] text-[var(--ink-3)]">
          Read each offer's requirements before you start. Some ask for a purchase or a paid subscription,
          which is not required to earn on PicoWorker. The provider confirms every completion, so VPNs,
          duplicate accounts and automated traffic will not be paid.
        </p>
      </div>
    </Page>
  )
}
