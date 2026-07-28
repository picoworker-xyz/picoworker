import { useCallback, useEffect, useState } from 'react'
import { Page } from '../../components/Page'
import { Globe } from '../../components/icons'
import { Button } from '../../components/ui'
import { TaskwallOfferDetails } from '../../components/TaskwallOfferDetails'
import {
  detectTaskwallDevice,
  requestTaskwallOffers,
  TASKWALL_DEVICE_OPTIONS,
  isTaskwallProviderWall,
  type TaskwallDevice,
  type TaskwallOffer,
  type TaskwallOffersState,
  taskwallRewardLabel,
} from '../../lib/taskwall'

export function TaskwallOffers() {
  const [state, setState] = useState<TaskwallOffersState>({ status: 'loading' })
  const [selectedOs, setSelectedOs] = useState<TaskwallDevice>(() => detectTaskwallDevice())
  const [selectedOffer, setSelectedOffer] = useState<TaskwallOffer | null>(null)

  const load = useCallback(async () => {
    setState({ status: 'loading' })
    setState(await requestTaskwallOffers(selectedOs, { force: true }))
  }, [selectedOs])

  useEffect(() => {
    let active = true
    void requestTaskwallOffers(selectedOs).then((result) => {
      if (active) setState(result)
    })
    return () => {
      active = false
    }
  }, [selectedOs])

  return (
    <Page>
      <div className="mb-4 rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-[.08em] text-[var(--ink-5)]">Country</div>
            <div className="mt-1 flex items-center gap-2 font-head text-[14px] font-extrabold text-[var(--ink)]">
              <Globe width={17} height={17} className="text-[var(--accent-strong)]" />
              {state.status === 'ready' && state.country ? state.country : 'Auto-detected'}
              <span className="rounded-full bg-[rgba(68,209,122,.12)] px-2 py-0.5 text-[10px] font-bold text-[var(--green)]">Secure</span>
            </div>
            <div className="mt-1 text-[11px] font-semibold text-[var(--ink-5)]">Only offers allowed in your current country are shown.</div>
          </div>

          <div className="sm:text-right">
            <div className="text-[11px] font-extrabold uppercase tracking-[.08em] text-[var(--ink-5)]">Device</div>
            <div className="mt-2 flex flex-wrap gap-1.5 sm:justify-end">
              {TASKWALL_DEVICE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedOs(option.value)}
                  className={`rounded-full px-3 py-2 text-[11.5px] font-extrabold transition ${
                    selectedOs === option.value
                      ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                      : 'border border-[var(--line-2)] bg-[var(--fill)] text-[var(--ink-3)]'
                  }`}
                >
                  {option.label}{option.value === detectTaskwallDevice() ? ' · This device' : ''}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {state.status === 'loading' && (
        <div className="flex min-h-[280px] items-center justify-center rounded-[22px] border border-[var(--line)] bg-[var(--card)]">
          <div className="text-center">
            <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-3 border-[var(--line-2)] border-t-[var(--accent)]" />
            <div className="mt-3 text-[13px] font-bold text-[var(--ink-3)]">Loading available offers…</div>
          </div>
        </div>
      )}

      {state.status === 'error' && (
        <div className="rounded-[18px] border border-[rgba(255,107,90,.28)] bg-[rgba(255,107,90,.08)] p-5">
          <div className="font-head text-[16px] font-extrabold text-[var(--ink)]">Offers unavailable</div>
          <div className="mt-1 text-[13px] font-semibold leading-[1.5] text-[var(--ink-3)]">{state.message}</div>
          <button onClick={() => void load()} className="mt-3 text-[13px] font-extrabold text-[var(--accent-strong)]">
            Try again
          </button>
        </div>
      )}

      {state.status === 'ready' && state.offers.length === 0 && (
        <div className="rounded-[22px] border border-[var(--line)] bg-[var(--card)] p-8 text-center">
          <Globe width={32} height={32} className="mx-auto text-[var(--ink-5)]" />
          <div className="mt-3 font-head text-[17px] font-extrabold text-[var(--ink)]">No offers right now</div>
          <div className="mt-1 text-[13px] font-semibold text-[var(--ink-3)]">
            Availability changes by device and region. Please check again later.
          </div>
          <Button variant="ghost" onClick={() => void load()} className="mx-auto mt-4 px-5 py-2.5">
            Refresh offers
          </Button>
        </div>
      )}

      {state.status === 'ready' && state.offers.length > 0 && (
        <>
          <div className="mb-3 flex items-center justify-between">
            <div className="font-head text-[14px] font-extrabold text-[var(--ink)]">
              {state.offers.length} available {state.offers.length === 1 ? 'offer' : 'offers'}
            </div>
            <button onClick={() => void load()} className="text-[12px] font-extrabold text-[var(--accent-strong)]">
              Refresh
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {state.offers.map((offer) => (
              <article
                key={offer.offerId}
                className="flex flex-col rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-4"
                style={{ boxShadow: 'var(--shadow)' }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-14 w-14 flex-none items-center justify-center overflow-hidden rounded-[14px] bg-[var(--fill)]">
                    {offer.icon ? (
                      <img src={offer.icon} alt="" className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                    ) : (
                      <Globe width={25} height={25} className="text-[var(--accent-strong)]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-head text-[15px] font-extrabold leading-[1.3] text-[var(--ink)]">{offer.title}</h2>
                    {isTaskwallProviderWall(offer) && <div className="mt-1 text-[10.5px] font-extrabold uppercase tracking-[.05em] text-[var(--accent-strong)]">Offerwall · requirements inside</div>}
                    <div className="mt-1 font-head text-[15px] font-extrabold text-[var(--green)]">
                      {taskwallRewardLabel(offer)}
                    </div>
                  </div>
                </div>

                {(offer.conversion || offer.description) && (
                  <p className="mt-3 line-clamp-3 text-[12.5px] font-semibold leading-[1.5] text-[var(--ink-3)]">
                    {isTaskwallProviderWall(offer) ? 'Choose a task inside to see its exact steps and reward.' : offer.conversion || offer.description}
                  </p>
                )}

                <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                  {offer.devices.slice(0, 3).map((device) => (
                    <span key={device} className="rounded-full bg-[var(--fill)] px-2.5 py-1 text-[10.5px] font-bold text-[var(--ink-3)]">
                      {device}
                    </span>
                  ))}
                  {offer.countries.length > 0 && (
                    <span className="rounded-full bg-[var(--fill)] px-2.5 py-1 text-[10.5px] font-bold text-[var(--ink-3)]">
                      {offer.countries.length === 1 ? offer.countries[0] : `${offer.countries.length} countries`}
                    </span>
                  )}
                </div>

                <Button
                  block
                  className="mt-4 h-[43px] text-[13px]"
                  onClick={() => setSelectedOffer(offer)}
                >
                  View details
                </Button>
              </article>
            ))}
          </div>
        </>
      )}

      <p className="mt-5 text-center text-[11.5px] font-semibold leading-[1.5] text-[var(--ink-5)]">
        The offer provider verifies eligibility and completion. Rewards appear after its server confirmation; VPNs, duplicate accounts, and automated traffic are not allowed.
      </p>
      {selectedOffer && <TaskwallOfferDetails offer={selectedOffer} onClose={() => setSelectedOffer(null)} />}
    </Page>
  )
}
