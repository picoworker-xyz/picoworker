import { Page } from '../../components/Page'
import { Check, Globe } from '../../components/icons'

export function PaymentwallOffers() {
  return (
    <Page
      title="Paymentwall Offers"
      subtitle="A new way to earn on PicoWorker is being prepared."
      back
      narrow
    >
      <div
        className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-[var(--card)]"
        style={{ boxShadow: 'var(--shadow)' }}
      >
        <div
          className="px-6 py-9 text-center sm:px-8"
          style={{ background: 'linear-gradient(135deg,rgba(139,108,255,.18),rgba(46,224,110,.08))' }}
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[19px] bg-[#8B6CFF] text-white shadow-lg">
            <Globe width={30} height={30} />
          </div>
          <div className="mx-auto mt-5 inline-flex items-center gap-1.5 rounded-full bg-[rgba(139,108,255,.14)] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[.08em] text-[#8B6CFF]">
            Coming soon
          </div>
          <h2 className="mt-4 font-head text-[25px] font-extrabold tracking-[-.02em] text-[var(--ink)]">
            Paymentwall is not available yet
          </h2>
          <p className="mx-auto mt-2 max-w-[440px] text-[13.5px] font-semibold leading-[1.6] text-[var(--ink-3)]">
            We are completing the final provider checks. Paymentwall offers will be enabled after secure tracking and reward confirmation are ready.
          </p>
        </div>

        <div className="p-6 sm:p-8">
          <div className="rounded-[15px] border border-[var(--line)] bg-[var(--fill)] p-4">
            <div className="flex items-start gap-3 text-[12.5px] font-semibold leading-[1.5] text-[var(--ink-3)]">
              <Check width={17} height={17} className="mt-0.5 flex-none text-[var(--accent-strong)]" />
              Featured offers remain available on the Earn page while Paymentwall is being prepared.
            </div>
          </div>
        </div>
      </div>
    </Page>
  )
}
