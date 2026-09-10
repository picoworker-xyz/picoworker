import { useCallback, useEffect, useMemo, useState } from 'react'
import { Page } from '../../components/Page'
import { Button } from '../../components/ui'
import { ExternalLink, Globe, Shield } from '../../components/icons'
import { OfferTabs } from '../../components/OfferTabs'
import { countryLabel } from '../../lib/taskwall'
import { usd } from '../../lib/format'
import {
  detectNotikDevice,
  notikRewardCaption,
  notikRewardLabel,
  openNotikOffer,
  requestNotikOffers,
  type NotikOffer,
  type NotikState,
} from '../../lib/notik'

export function NotikOffers() {
  const [state, setState] = useState<NotikState>({ status: 'loading' })
  const [opening, setOpening] = useState<string | null>(null)
  const [detail, setDetail] = useState<NotikOffer | null>(null)
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
                    <div className="text-[10px] font-bold text-[var(--ink-5)]">
                      {notikRewardCaption(offer)}
                    </div>
                  </div>
                </div>

                {(offer.description || offer.details) && (
                  <p className="mt-3 line-clamp-3 text-[12px] font-semibold leading-[1.5] text-[var(--ink-3)]">
                    {offer.description || offer.details}
                  </p>
                )}

                <div className="mt-auto grid grid-cols-[1fr_auto] gap-2 pt-3">
                  <Button
                    block
                    className="h-[38px] text-[12px]"
                    disabled={opening === offer.offerId}
                    onClick={() => void open(offer)}
                  >
                    {opening === offer.offerId ? 'Taking you there…' : <>Start offer <ExternalLink width={14} height={14} /></>}
                  </Button>
                  {/* Multistep offers pay per event, and a worker who cannot see
                      the steps first has no way to judge whether the headline
                      total is reachable. */}
                  {offer.steps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setDetail(offer)}
                      className="h-[38px] rounded-[12px] border border-[var(--line-2)] bg-[var(--fill)] px-3 text-[11.5px] font-extrabold text-[var(--ink-2)]"
                    >
                      Steps
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {detail && (
        <StepSheet
          offer={detail}
          onClose={() => setDetail(null)}
          onStart={() => void open(detail)}
        />
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

function StepSheet({ offer, onClose, onStart }: { offer: NotikOffer; onClose: () => void; onStart: () => void }) {
  // Notik states a step's payout only on some events. Summing a partial list
  // and calling it a total would understate the offer, so the per-step figure
  // is simply omitted where it is missing and the headline stays the total.
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label={`${offer.title} steps`}>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-default" />
      <div className="relative max-h-[92svh] w-full max-w-[520px] overflow-y-auto rounded-t-[24px] border border-[var(--line)] bg-[var(--card)] p-5 sm:rounded-[24px] sm:p-6" style={{ boxShadow: '0 24px 80px rgba(0,0,0,.45)' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-head text-[18px] font-extrabold leading-[1.3] text-[var(--ink)]">{offer.title}</h2>
            <div className="mt-1 font-head text-[16px] font-extrabold text-[var(--green)]">
              {notikRewardLabel(offer)} <span className="text-[12px] font-bold text-[var(--ink-4)]">total</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[var(--fill)] text-[20px] font-bold text-[var(--ink-3)]" aria-label="Close">×</button>
        </div>

        <div className="mt-4 text-[11px] font-extrabold uppercase tracking-[.08em] text-[var(--ink-5)]">
          Steps · each one pays separately
        </div>
        <div className="mt-2 flex flex-col gap-2">
          {offer.steps.map((step, i) => (
            <div key={step.stepId || i} className="flex items-start justify-between gap-3 rounded-[12px] border border-[var(--line)] bg-[var(--fill)] px-3 py-2.5">
              <span className="text-[12px] font-semibold leading-[1.45] text-[var(--ink-2)]">
                <span className="text-[var(--ink-4)]">{i + 1}.</span> {step.description}
              </span>
              {step.rewardUsd > 0 && (
                <span className="flex-none text-[12px] font-extrabold text-[var(--green)]">{usd(step.rewardUsd)}</span>
              )}
            </div>
          ))}
        </div>

        <p className="mt-3 text-[11.5px] font-semibold leading-[1.5] text-[var(--ink-4)]">
          You are paid for every step you finish, so stopping part way still earns what you completed.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button variant="ghost" block className="h-[46px]" onClick={onClose}>Cancel</Button>
          <Button block className="h-[46px]" onClick={onStart}>
            Start offer <ExternalLink width={16} height={16} />
          </Button>
        </div>
      </div>
    </div>
  )
}
