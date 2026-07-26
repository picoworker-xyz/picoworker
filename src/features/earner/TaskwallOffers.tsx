import { useCallback, useEffect, useState } from 'react'
import { Page } from '../../components/Page'
import { ExternalLink, Globe, Shield } from '../../components/icons'
import { Button } from '../../components/ui'
import { usd } from '../../lib/format'
import { supabase } from '../../lib/supabase'

type Offer = {
  offerId: string
  title: string
  description: string
  conversion: string
  icon: string
  link: string
  reward: number
  devices: string[]
  countries: string[]
}

type OffersState =
  | { status: 'loading' }
  | { status: 'ready'; offers: Offer[] }
  | { status: 'error'; message: string }

function detectOs(): 'android' | 'ios' | 'desktop' {
  const agent = navigator.userAgent.toLowerCase()
  if (agent.includes('android')) return 'android'
  if (/iphone|ipad|ipod/.test(agent)) return 'ios'
  return 'desktop'
}

async function requestOffers(): Promise<OffersState> {
  if (!supabase) {
    return { status: 'error', message: 'TaskWall requires the production account service.' }
  }

  const { data, error } = await supabase.functions.invoke('taskwall-offers', {
    body: { os: detectOs() },
  })
  if (error || data?.status !== 'success' || !Array.isArray(data?.offers)) {
    return {
      status: 'error',
      message: data?.error ?? error?.message ?? 'Could not load TaskWall offers.',
    }
  }
  return { status: 'ready', offers: data.offers as Offer[] }
}

export function TaskwallOffers() {
  const [state, setState] = useState<OffersState>({ status: 'loading' })

  const load = useCallback(async () => {
    setState({ status: 'loading' })
    setState(await requestOffers())
  }, [])

  useEffect(() => {
    let active = true
    void requestOffers().then((result) => {
      if (active) setState(result)
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <Page
      title="TaskWall Offers"
      subtitle="Complete an offer and receive its confirmed reward in your PicoWorker wallet."
      back
    >
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-[16px] border border-[var(--line)] bg-[var(--card)] px-4 py-3 text-[12px] font-bold text-[var(--ink-3)]">
        <Shield width={16} height={16} className="text-[var(--accent-strong)]" />
        Signed-in tracking
        <span className="text-[var(--ink-5)]">•</span>
        <Globe width={16} height={16} className="text-[var(--accent-strong)]" />
        Offers matched to this device
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
          <div className="font-head text-[16px] font-extrabold text-[var(--ink)]">TaskWall unavailable</div>
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
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
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
                    <div className="mt-1 font-head text-[15px] font-extrabold text-[var(--green)]">
                      {offer.reward > 0 ? usd(offer.reward) : 'Variable reward'}
                    </div>
                  </div>
                </div>

                {(offer.conversion || offer.description) && (
                  <p className="mt-3 line-clamp-3 text-[12.5px] font-semibold leading-[1.5] text-[var(--ink-3)]">
                    {offer.conversion || offer.description}
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
                  onClick={() => window.open(offer.link, '_blank', 'noopener,noreferrer')}
                >
                  Start offer <ExternalLink width={16} height={16} />
                </Button>
              </article>
            ))}
          </div>
        </>
      )}

      <p className="mt-5 text-center text-[11.5px] font-semibold leading-[1.5] text-[var(--ink-5)]">
        TaskWall verifies eligibility and completion. Rewards appear after its server confirmation; VPNs, duplicate accounts, and automated traffic are not allowed.
      </p>
    </Page>
  )
}
