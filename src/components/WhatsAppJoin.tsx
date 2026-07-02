import { WhatsApp, ArrowRight } from './icons'

export const WHATSAPP_URL = 'https://chat.whatsapp.com/I9cuPpq7VdN1eiyaDPtQHu?mode=gi_t'

// Community join card, styled in WhatsApp green. Works in light and dark.
export function WhatsAppJoin() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-[var(--r)] p-4 border transition-[transform] active:scale-[.99]"
      style={{
        background: 'linear-gradient(135deg, rgba(37,211,102,.16), rgba(37,211,102,.05))',
        borderColor: 'rgba(37,211,102,.38)',
      }}
    >
      <span className="w-11 h-11 rounded-[13px] bg-[#25D366] flex items-center justify-center flex-none">
        <WhatsApp width={24} height={24} className="text-[#fff]" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[var(--ink)] text-[15px] font-extrabold font-head">Join our WhatsApp community</span>
        <span className="block text-[var(--ink-3)] text-[12.5px] font-semibold">New tasks, payout news and tips</span>
      </span>
      <ArrowRight width={18} height={18} className="text-[#25D366] flex-none" />
    </a>
  )
}
