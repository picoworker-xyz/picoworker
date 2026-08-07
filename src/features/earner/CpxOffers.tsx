import { useCallback, useEffect, useState } from 'react'
import { Page } from '../../components/Page'
import { Globe } from '../../components/icons'
import { OfferTabs } from '../../components/OfferTabs'
import { CpxSurveyCard } from '../../components/CpxSurveyCard'
import { cpxFrameUrl, fetchCpxSurveys, type CpxState } from '../../lib/cpx'

export function CpxOffers() {
  const [state, setState] = useState<CpxState>({ status: 'loading' })
  const [frame, setFrame] = useState<string | null>(null)

  // Resolves asynchronously, so this never sets state during the effect itself.
  // The initial render already starts in 'loading'; Refresh sets it explicitly.
  const load = useCallback((force: boolean) => {
    void fetchCpxSurveys({ force }).then(setState)
  }, [])

  useEffect(() => { load(false) }, [load])

  // The frame is only fetched when the list comes back empty, so the common
  // path costs one request rather than two.
  const empty = state.status === 'ready' && state.surveys.length === 0
  useEffect(() => {
    if (!empty || frame) return
    let alive = true
    cpxFrameUrl().then((url) => { if (alive) setFrame(url) }).catch(() => {})
    return () => { alive = false }
  }, [empty, frame])

  return (
    <Page>
      <OfferTabs />

      <div className="mb-1 flex items-center gap-2 font-head text-[18px] font-extrabold text-[var(--ink)]">
        <Globe width={19} height={19} className="text-[var(--accent-strong)]" /> Paid surveys
      </div>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="text-[12.5px] font-semibold text-[var(--ink-4)]">
          Matched to you by CPX Research. Rewards are credited once the provider confirms your completion.
        </div>
        <button
          onClick={() => { setState({ status: 'loading' }); load(true) }}
          className="flex-none text-[12px] font-extrabold text-[var(--accent-strong)]"
        >
          Refresh
        </button>
      </div>

      {state.status === 'loading' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[152px] animate-pulse rounded-[18px] border border-[var(--line)] bg-[var(--card)]" />
          ))}
        </div>
      )}

      {state.status === 'error' && (
        <div className="rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-6 text-center" style={{ boxShadow: 'var(--shadow)' }}>
          <div className="font-head text-[17px] font-extrabold text-[var(--ink)]">Surveys are not available right now</div>
          <p className="mx-auto mt-2 max-w-[420px] text-[13px] font-semibold leading-[1.6] text-[var(--ink-3)]">{state.message}</p>
        </div>
      )}

      {state.status === 'ready' && state.surveys.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {state.surveys.map((s) => <CpxSurveyCard key={s.surveyId} survey={s} />)}
        </div>
      )}

      {empty && (
        <div className="overflow-hidden rounded-[18px] border border-[var(--line)] bg-[var(--card)]" style={{ boxShadow: 'var(--shadow)' }}>
          <div className="px-6 py-7 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[17px] bg-[#8B6CFF] text-white">
              <Globe width={26} height={26} />
            </div>
            <div className="mt-4 font-head text-[17px] font-extrabold text-[var(--ink)]">No surveys matched you yet</div>
            <p className="mx-auto mt-2 max-w-[440px] text-[13px] font-semibold leading-[1.6] text-[var(--ink-3)]">
              Answer the profile questions below and more surveys will open up for you.
            </p>
          </div>
          {frame && (
            <iframe
              title="CPX Research surveys"
              src={frame}
              width="100%"
              height="1600"
              frameBorder="0"
              className="block w-full"
            />
          )}
        </div>
      )}
    </Page>
  )
}
