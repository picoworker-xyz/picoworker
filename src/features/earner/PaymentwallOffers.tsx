import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Page } from '../../components/Page'
import { ArrowRight, Check, Globe, Shield } from '../../components/icons'
import { Button } from '../../components/ui'
import { supabase } from '../../lib/supabase'

type WidgetState =
  | { status: 'loading' }
  | { status: 'ready'; url: string; evaluation: boolean }
  | { status: 'error'; message: string }

async function requestWidget(): Promise<WidgetState> {
  if (!supabase) {
    return { status: 'error', message: 'Offerwall requires the production account service.' }
  }

  const { data, error } = await supabase.functions.invoke('paymentwall-widget', {
    body: {},
  })
  if (error || !data?.url) {
    return {
      status: 'error',
      message: data?.error ?? error?.message ?? 'Could not prepare the offerwall.',
    }
  }
  return {
    status: 'ready',
    url: String(data.url),
    evaluation: Boolean(data.evaluation),
  }
}

export function PaymentwallOffers() {
  const [query] = useSearchParams()
  const [widget, setWidget] = useState<WidgetState>({ status: 'loading' })

  const loadWidget = useCallback(async () => {
    setWidget({ status: 'loading' })
    setWidget(await requestWidget())
  }, [])

  useEffect(() => {
    let active = true
    void requestWidget().then((result) => {
      if (active) setWidget(result)
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <Page
      title="Paymentwall Offers"
      subtitle="Complete third-party offers and receive the confirmed reward in your PicoWorker wallet."
      back
      narrow
    >
      {query.get('status') === 'success' && (
        <div className="mb-4 flex items-start gap-3 rounded-[16px] border border-[rgba(68,209,122,.32)] bg-[rgba(68,209,122,.1)] p-4">
          <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-[var(--green)] text-white">
            <Check width={16} height={16} />
          </span>
          <div>
            <div className="font-head text-[14px] font-extrabold text-[var(--ink)]">Offer submitted</div>
            <div className="mt-0.5 text-[12.5px] font-semibold leading-[1.5] text-[var(--ink-3)]">
              Paymentwall will update your wallet after it confirms the completion. Some offers take a little longer to verify.
            </div>
          </div>
        </div>
      )}

      <div
        className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-[var(--card)]"
        style={{ boxShadow: 'var(--shadow)' }}
      >
        <div
          className="relative px-6 py-8 sm:px-8"
          style={{ background: 'linear-gradient(135deg,rgba(139,108,255,.2),rgba(46,224,110,.08))' }}
        >
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[17px] bg-[#8B6CFF] text-white shadow-lg">
            <Globe width={27} height={27} />
          </div>
          <h2 className="font-head text-[24px] font-extrabold tracking-[-.02em] text-[var(--ink)]">
            More ways to earn
          </h2>
          <p className="mt-2 max-w-[480px] text-[14px] font-semibold leading-[1.6] text-[var(--ink-3)]">
            Choose an available survey, app, signup, or other offer. Availability and reward values depend on your country and device.
          </p>
        </div>

        <div className="p-6 sm:p-8">
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Feature icon={<Shield width={17} height={17} />} text="Signed, secure tracking" />
            <Feature icon={<Check width={17} height={17} />} text="Automatic confirmation" />
            <Feature icon={<Globe width={17} height={17} />} text="Country-based offers" />
          </div>

          {widget.status === 'loading' && (
            <Button block disabled className="h-[52px]">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Preparing offers…
            </Button>
          )}

          {widget.status === 'ready' && (
            <>
              {widget.evaluation && (
                <div className="mb-3 rounded-[12px] border border-[rgba(242,163,60,.3)] bg-[rgba(242,163,60,.09)] px-4 py-3 text-[12px] font-bold text-[#C98729]">
                  Paymentwall evaluation mode is active. Test completions do not create withdrawable balance.
                </div>
              )}
              <Button
                block
                className="h-[52px] text-[15px]"
                onClick={() => window.location.assign(widget.url)}
              >
                Open Paymentwall Offerwall <ArrowRight width={18} height={18} />
              </Button>
            </>
          )}

          {widget.status === 'error' && (
            <div className="rounded-[16px] border border-[rgba(255,107,90,.28)] bg-[rgba(255,107,90,.08)] p-4">
              <div className="font-head text-[14px] font-extrabold text-[var(--ink)]">Offerwall unavailable</div>
              <div className="mt-1 text-[12.5px] font-semibold leading-[1.5] text-[var(--ink-3)]">
                {widget.message}
              </div>
              <button
                onClick={() => void loadWidget()}
                className="mt-3 text-[12.5px] font-extrabold text-[var(--accent-strong)]"
              >
                Try again
              </button>
            </div>
          )}

          <p className="mt-4 text-center text-[11.5px] font-semibold leading-[1.5] text-[var(--ink-5)]">
            You will continue on Paymentwall. Reward disputes and offer eligibility are subject to the provider's verification.
          </p>
        </div>
      </div>
    </Page>
  )
}

function Feature({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-[12px] bg-[var(--fill)] px-3 py-2.5 text-[var(--ink-2)]">
      <span className="text-[var(--accent-strong)]">{icon}</span>
      <span className="text-[11.5px] font-bold">{text}</span>
    </div>
  )
}
