import { useCallback, useEffect, useMemo, useState } from 'react'
import { Page } from '../../components/Page'
import { Button } from '../../components/ui'
import { ExternalLink, Globe, Shield } from '../../components/icons'
import { OfferTabs } from '../../components/OfferTabs'
import { countryLabel } from '../../lib/taskwall'
import {
  detectNotikDevice,
  notikRewardLabel,
  openNotikOffer,
  requestNotikOffers,
  type NotikOffer,
  type NotikState,
} from '../../lib/notik'

export function NotikOffers() {
  const [state, setState] = useState<NotikState>({ status: 'loading' })
  const [opening, setOpening] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const device = useMemo(() => detectNotikDevice(), [])

  const load = useCallback(async (force = false) => {
    setState({ status: 'loading' })
    setState(await requestNotikOffers(device, { force }))
  }, [device])

  useEffect(() => {
    let active = true
    void requestNotikOffers(device).then((r) => { if (active) setState(r) })
    return () => { active = false }
  }, [device])

  async function open(offer: NotikOffer) {
    setErr('')
    setOpening(offer.offerId)
    // Navigate in this tab rather than opening a new one: minting is a network
    // round trip, so a pre-opened tab sits on about:blank looking broken, and a
    // background tab is easy to lose on mobile. The back button returns here.
    try {
      const url = await openNotikOffer(offer, state.status === 'ready' ? state.country : null, device)
      window.location.assign(url)
    } catch (e) {
      setErr((e as Error).message)
      setOpening(null)
    }
  }

  return (
    <Page>
      <OfferTabs />

      <div className="mb-1 flex items-center gap-2 font-head text-[18px] font-extrabold text-[var(--ink)]">
        <Globe width={19} height={19} className="text-[var(--accent-strong)]" /> Bonus offers
      </div>
      <div className="mb-4 text-[12.5px] font-semibold text-[var(--ink-4)]">
        {state.status === 'ready' && state.country ? `${countryLabel(state.country)} · ` : ''}
        Rewards are credited after the provider confirms your completion.
      </div>

      {err && (
        <div className="mb-4 rounded-[14px] border border-[rgba(255,107,90,.25)] bg-[rgba(255,107,90,.07)] p-3.5 text-[12.5px] font-semibold text-[var(--ink-2)]">
          {err}
        </div>
      )}

      {state.status === 'loading' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-[168px] animate-pulse rounded-[18px] border border-[var(--line)] bg-[var(--card)]" />
          ))}
        </div>
      )}

      {state.status === 'error' && (
        <div className="rounded-[16px] border border-[rgba(255,107,90,.2)] bg-[rgba(255,107,90,.06)] p-4">
          <div className="text-[13px] font-bold text-[var(--ink-2)]">{state.message}</div>
          <button onClick={() => void load(true)} className="mt-2 text-[12px] font-extrabold text-[var(--accent-strong)]">
            Try again
          </button>
        </div>
      )}

      {state.status === 'ready' && state.offers.length === 0 && (
        <div className="rounded-[22px] border border-[var(--line)] bg-[var(--card)] p-8 text-center">
          <Globe width={30} height={30} className="mx-auto text-[var(--ink-5)]" />
          <div className="mt-3 font-head text-[16px] font-extrabold text-[var(--ink)]">No offers right now</div>
          <div className="mt-1 text-[13px] font-semibold text-[var(--ink-3)]">
            Availability changes by country and device. Please check again later.
          </div>
          <Button variant="ghost" onClick={() => void load(true)} className="mx-auto mt-4 px-5 py-2.5">
            Refresh
          </Button>
        </div>
      )}

      {state.status === 'ready' && state.offers.length > 0 && (
        <>
          <div className="mb-3 flex items-center justify-between">
            <div className="font-head text-[14px] font-extrabold text-[var(--ink)]">
              {state.offers.length} available {state.offers.length === 1 ? 'offer' : 'offers'}
            </div>
            <button onClick={() => void load(true)} className="text-[12px] font-extrabold text-[var(--accent-strong)]">
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {state.offers.map((offer) => (
              <article
                key={offer.offerId}
                className="flex min-h-[168px] flex-col rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-4"
                style={{ boxShadow: 'var(--shadow)' }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 flex-none items-center justify-center overflow-hidden rounded-[12px] bg-[var(--fill)]">
                    {offer.logo ? (
                      <img src={offer.logo} alt="" className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                    ) : (
                      <Globe width={20} height={20} className="text-[var(--accent-strong)]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 font-head text-[13.5px] font-extrabold leading-[1.3] text-[var(--ink)]">
                      {offer.title}
                    </h3>
                    {offer.category && (
                      <div className="mt-1 text-[9.5px] font-extrabold uppercase tracking-[.04em] text-[var(--ink-5)]">
                        {offer.category}
                      </div>
                    )}
                    <div className="mt-1 text-[13px] font-extrabold text-[var(--green)]">
                      {notikRewardLabel(offer)}
                    </div>
                  </div>
                </div>

                {(offer.description || offer.details) && (
                  <p className="mt-3 line-clamp-3 text-[12px] font-semibold leading-[1.5] text-[var(--ink-3)]">
                    {offer.description || offer.details}
                  </p>
                )}

                <Button
                  block
                  className="mt-auto h-[38px] text-[12px]"
                  disabled={opening === offer.offerId}
                  onClick={() => void open(offer)}
                >
                  {opening === offer.offerId ? 'Taking you there…' : <>Start offer <ExternalLink width={14} height={14} /></>}
                </Button>
              </article>
            ))}
          </div>
        </>
      )}

      <div className="mt-5 flex items-start gap-2.5 rounded-[14px] border border-[rgba(242,163,60,.25)] bg-[rgba(242,163,60,.08)] p-3.5">
        <Shield width={17} height={17} className="mt-0.5 flex-none text-[#D99832]" />
        <p className="text-[11.5px] font-semibold leading-[1.5] text-[var(--ink-3)]">
          Read each offer's requirements before you start. Some ask for a purchase or a paid subscription,
          which is never required to earn on PicoWorker. The provider confirms every completion, so VPNs,
          duplicate accounts and automated traffic will not be paid.
        </p>
      </div>
    </Page>
  )
}
