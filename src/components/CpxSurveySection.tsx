import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchCpxSurveys, type CpxState } from '../lib/cpx'
import { CpxSurveyCard } from './CpxSurveyCard'
import { ArrowRight, Globe } from './icons'

/**
 * "Paid surveys" strip, used on the Earn feed and the Offers page.
 *
 * Renders nothing at all when CPX has matched the worker to no surveys: the
 * strip is additive to whatever page hosts it, and an empty header reads as a
 * broken section rather than an honest "nothing right now".
 *
 * The underlying fetch is cached per user in lib/cpx, so mounting this on two
 * pages costs one request, not two.
 */
export function CpxSurveySection({ limit = 6 }: { limit?: number }) {
  const nav = useNavigate()
  const [state, setState] = useState<CpxState>({ status: 'loading' })

  useEffect(() => {
    let active = true
    void fetchCpxSurveys().then((r) => { if (active) setState(r) })
    return () => { active = false }
  }, [])

  if (state.status !== 'ready' || state.surveys.length === 0) return null

  return (
    <section className="mt-7">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-head text-[18px] font-extrabold text-[var(--ink)]">
            <Globe width={19} height={19} className="text-[var(--accent-strong)]" /> Paid surveys
          </div>
          <div className="mt-1 text-[12px] font-semibold text-[var(--ink-4)]">
            matched to you · paid after the provider confirms
          </div>
        </div>
        <button
          onClick={() => nav('/offers/surveys')}
          className="flex items-center gap-1 text-[12px] font-extrabold text-[var(--accent-strong)]"
        >
          View all <ArrowRight width={14} height={14} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {state.surveys.slice(0, limit).map((s) => <CpxSurveyCard key={s.surveyId} survey={s} />)}
      </div>
    </section>
  )
}
