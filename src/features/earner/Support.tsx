import { useEffect, useRef, useState } from 'react'
import { Page } from '../../components/Page'
import { Avatar } from '../../components/ui'
import { Send } from '../../components/icons'

type Msg = { id: number; from: 'me' | 'them'; text: string; card?: boolean }

const INITIAL: Msg[] = [
  { id: 1, from: 'them', text: 'Hey — what can we help you with today?' },
]
const QUICK = ['Dispute a rejected task', 'Payment issue', 'Something else']

export function Support() {
  const [msgs, setMsgs] = useState<Msg[]>(INITIAL)
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  function send(body: string) {
    if (!body.trim()) return
    const id = Date.now()
    setMsgs((m) => [...m, { id, from: 'me', text: body }])
    setText('')
    setTimeout(() => {
      setMsgs((m) => [
        ...m,
        { id: id + 1, from: 'them', text: "Thanks — I've opened a ticket and our team will follow up here shortly. Typical reply time is a few minutes." },
      ])
    }, 800)
  }

  return (
    <Page title="Pico Support" subtitle="Typically replies in minutes." back>
      <div className="max-w-[640px] rounded-[var(--r)] bg-[#15161C] border border-white/6 flex flex-col h-[min(64vh,600px)]">
        {/* messages */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-5 flex flex-col gap-3">
          <div className="text-center text-[#5E606C] text-[11px] font-bold uppercase tracking-[.08em]">Today</div>
          {msgs.map((m) =>
            m.from === 'them' ? (
              <div key={m.id} className="flex items-end gap-2 max-w-[80%]">
                <Avatar name="P" size={28} gradient="linear-gradient(135deg,#C2F94D,#7ec900)" />
                <div className="rounded-[16px] rounded-bl-[4px] bg-white/6 px-4 py-3 text-[#E6E7EC] text-[14px] font-medium leading-[1.45]">{m.text}</div>
              </div>
            ) : (
              <div key={m.id} className="self-end max-w-[80%] rounded-[16px] rounded-br-[4px] bg-[var(--accent)] text-[var(--accent-ink)] px-4 py-3 text-[14px] font-semibold leading-[1.45]">
                {m.text}
              </div>
            ),
          )}
          <div ref={endRef} />
        </div>

        {/* quick replies */}
        <div className="flex flex-wrap gap-2 px-5 pb-3">
          {QUICK.map((q) => (
            <button key={q} onClick={() => send(q)} className="px-3 py-2 rounded-full bg-white/6 border border-white/10 text-[#C2C4CE] text-[12.5px] font-bold hover:bg-white/10">
              {q}
            </button>
          ))}
        </div>

        {/* input */}
        <div className="flex items-center gap-2 p-3 border-t border-white/6">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send(text)}
            placeholder="Type a message…"
            className="flex-1 bg-white/4 border border-white/8 rounded-[14px] px-4 py-3 text-white text-[14px] font-medium placeholder:text-[#6E6F7A] outline-none focus:border-[var(--accent)]/60"
          />
          <button onClick={() => send(text)} className="w-11 h-11 flex-none rounded-[14px] bg-[var(--accent)] text-[var(--accent-ink)] flex items-center justify-center">
            <Send width={18} height={18} />
          </button>
        </div>
      </div>
    </Page>
  )
}
