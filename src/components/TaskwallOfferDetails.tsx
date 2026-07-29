import { ExternalLink, Globe, Shield } from './icons'
import { Button } from './ui'
import { isTaskwallProviderWall, isTaskwallLegacy, taskwallRewardLabel, deviceLabel, countryLabel, type TaskwallOffer } from '../lib/taskwall'

export function TaskwallOfferDetails({
  offer,
  onClose,
}: {
  offer: TaskwallOffer
  onClose: () => void
}) {
  const providerWall = isTaskwallProviderWall(offer)
  const legacy = isTaskwallLegacy(offer)
  const instructions = providerWall
    ? 'This is an offerwall containing multiple tasks. Open it, choose one task, then read that task’s exact requirements, eligibility, deadline, and reward before you start.'
    : offer.conversion || offer.description || 'Complete the provider requirements shown after opening the offer.'

  function continueToProvider() {
    window.open(offer.link, '_blank', 'noopener,noreferrer')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label={`${offer.title} offer details`}>
      <button type="button" aria-label="Close offer details" onClick={onClose} className="absolute inset-0 cursor-default" />
      <div className="relative max-h-[92svh] w-full max-w-[560px] overflow-y-auto rounded-t-[24px] border border-[var(--line)] bg-[var(--card)] p-5 sm:rounded-[24px] sm:p-6" style={{ boxShadow: '0 24px 80px rgba(0,0,0,.45)' }}>
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-[16px] bg-[var(--fill)]">
            {offer.icon ? (
              <img src={offer.icon} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <Globe width={28} height={28} className="text-[var(--accent-strong)]" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-head text-[19px] font-extrabold leading-[1.3] text-[var(--ink)]">{offer.title}</h2>
            <div className="mt-1 font-head text-[17px] font-extrabold text-[var(--green)]">{taskwallRewardLabel(offer)}</div>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[var(--fill)] text-[20px] font-bold text-[var(--ink-3)]" aria-label="Close">×</button>
        </div>

        <div className="mt-5 rounded-[16px] border border-[var(--line)] bg-[var(--fill)] p-4">
          <div className="text-[11px] font-extrabold uppercase tracking-[.08em] text-[var(--ink-5)]">
            {providerWall ? 'How this offerwall works' : 'What you need to do'}
          </div>
          <p className="mt-2 whitespace-pre-line text-[13.5px] font-semibold leading-[1.6] text-[var(--ink-2)]">{instructions}</p>
          {providerWall && (
            <p className="mt-2 text-[12px] font-bold leading-[1.5] text-[var(--accent-strong)]">
              Each task inside this offerwall has its own requirements and reward. They are shown once you select a task.
            </p>
          )}
        </div>

        {offer.events.length > 0 && (
          <div className="mt-4">
            <div className="text-[11px] font-extrabold uppercase tracking-[.08em] text-[var(--ink-5)]">Milestones</div>
            <div className="mt-2 flex flex-col gap-2">
              {offer.events.map((event) => (
                <div key={`${event.eventId}-${event.instructions}`} className="flex items-start justify-between gap-3 rounded-[12px] border border-[var(--line)] bg-[var(--fill)] px-3 py-2.5">
                  <span className="text-[12px] font-semibold leading-[1.45] text-[var(--ink-2)]">{event.instructions}</span>
                  {event.reward > 0 && <span className="flex-none text-[12px] font-extrabold text-[var(--green)]">${event.reward.toFixed(2)}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {offer.devices.map((device) => <span key={device} className="rounded-full bg-[var(--fill)] px-3 py-1.5 text-[11px] font-bold text-[var(--ink-3)]">{deviceLabel(device)}</span>)}
          {offer.countries.map((country) => <span key={country} className="rounded-full bg-[var(--fill)] px-3 py-1.5 text-[11px] font-bold text-[var(--ink-3)]">{countryLabel(country)}</span>)}
        </div>

        {legacy && offer.events.length > 0 && (
          <div className="mt-4 flex items-start gap-2.5 rounded-[14px] border border-[rgba(255,107,90,.3)] bg-[rgba(255,107,90,.09)] p-3.5">
            <Shield width={17} height={17} className="mt-0.5 flex-none text-[var(--coral)]" />
            <p className="text-[11.5px] font-semibold leading-[1.5] text-[var(--ink-3)]">
              <span className="font-extrabold text-[var(--coral)]">Older version of this offer.</span> In our testing only
              the first milestone has ever paid on offers like this one. The later milestones are advertised by the
              provider but we have not seen one pay. Look for the same game without the dash in its name, which is the
              newer version and does pay every milestone.
            </p>
          </div>
        )}

        <div className="mt-4 flex items-start gap-2.5 rounded-[14px] border border-[rgba(242,163,60,.25)] bg-[rgba(242,163,60,.08)] p-3.5">
          <Shield width={17} height={17} className="mt-0.5 flex-none text-[#D99832]" />
          <p className="text-[11.5px] font-semibold leading-[1.5] text-[var(--ink-3)]">
            {providerWall
              ? 'Opening this offerwall or clicking a task does not earn a reward by itself. Complete the selected task exactly as shown, using the same device and without VPN. The provider confirms eligibility and the final reward.'
              : 'Opening the offer does not earn a reward by itself. Complete every listed requirement using the same device, without VPN. “Up to” rewards are maximums; the provider confirms the final amount before your wallet is credited.'}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button variant="ghost" block className="h-[46px]" onClick={onClose}>Cancel</Button>
          <Button block className="h-[46px]" onClick={continueToProvider}>
            {providerWall ? 'Open tasks' : 'Continue to provider'} <ExternalLink width={16} height={16} />
          </Button>
        </div>
      </div>
    </div>
  )
}
