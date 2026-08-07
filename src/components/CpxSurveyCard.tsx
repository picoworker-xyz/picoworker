import { usd } from '../lib/format'
import type { CpxSurvey } from '../lib/cpx'
import { Button } from './ui'

/**
 * One CPX survey. Shared by the Earn feed strip and the full surveys page so
 * the two cannot drift — the other walls duplicate their markup and their home
 * strip has already fallen behind the full page once.
 */
export function CpxSurveyCard({ survey }: { survey: CpxSurvey }) {
  return (
    <article
      className="flex min-h-[172px] flex-col rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-4"
      style={{ boxShadow: 'var(--shadow)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-head text-[13.5px] font-extrabold leading-[1.3] text-[var(--ink)]">
            {survey.category} survey
          </h3>
          <div className="mt-1 text-[12px] font-semibold text-[var(--ink-4)]">
            About {survey.minutes} min
            {survey.rating > 0 && ` · ${survey.rating.toFixed(1)}/5 from ${survey.ratingCount}`}
          </div>
        </div>
        <div className="flex-none text-[13px] font-extrabold text-[var(--green)]">{usd(survey.rewardUsd)}</div>
      </div>

      {/* Screening is the biggest source of "I did it and got nothing", so it
          is stated on the card rather than discovered halfway through. */}
      {survey.needsQualification && (
        <p className="mt-3 line-clamp-3 text-[12px] font-semibold leading-[1.5] text-[var(--ink-3)]">
          Starts with a few questions. You are paid a smaller amount if you do not qualify.
        </p>
      )}

      {/* Same-tab navigation, matching the other walls: CPX's click link sets
          attribution cookies that a new tab can lose. */}
      <Button
        block
        className="mt-auto h-[38px] text-[12px]"
        onClick={() => window.location.assign(survey.link)}
      >
        Start survey
      </Button>
    </article>
  )
}
