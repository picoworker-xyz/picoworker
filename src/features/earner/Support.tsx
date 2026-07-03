import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { timeAgo } from '../../lib/format'
import { Page } from '../../components/Page'
import { Avatar } from '../../components/ui'
import { Send } from '../../components/icons'

type Msg = { from_admin: boolean; body: string; created_at: string }
const QUICK = ['Dispute a rejected task', 'Payment issue', 'Something else']

export function Support() {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const { data } = await supabase!
      .from('support_messages')
      .select('from_admin, body, created_at')
      .order('created_at', { ascending: true })
    setMsgs((data as Msg[]) ?? [])
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 8000) // poll for team replies
    return () => clearInterval(t)
  }, [load])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  async function send(body: string) {
    if (!body.trim() || sending) return
    setSending(true)
    setText('')
    // optimistic
    setMsgs((m) => [...m, { from_admin: false, body, created_at: new Date().toISOString() }])
    await supabase!.rpc('post_support_message', { p_body: body })
    await load()
    setSending(false)
  }

  return (
    <Page title="Pico Support" subtitle="Send us a message. The team replies here." back>
      <div className="max-w-[680px] rounded-[var(--r)] bg-[var(--card)] border border-[var(--line)] flex flex-col h-[min(64vh,600px)]">
        <div className="flex-1 overflow-y-auto no-scrollbar p-5 flex flex-col gap-3">
          {msgs.length === 0 ? (
            <div className="m-auto text-center text-[var(--ink-4)] text-[13.5px] font-semibold max-w-[320px]">
              No messages yet. Tell us what you need help with and the team will reply here.
            </div>
          ) : (
            msgs.map((m, i) =>
              m.from_admin ? (
                <div key={i} className="flex items-end gap-2 max-w-[80%]">
                  <Avatar name="P" size={28} gradient="linear-gradient(135deg,#3ee87e,#12924a)" />
                  <div>
                    <div className="rounded-[16px] rounded-bl-[4px] bg-[var(--fill)] px-4 py-3 text-[#E6E7EC] text-[14px] font-medium leading-[1.45]">{m.body}</div>
                    <div className="text-[var(--ink-5)] text-[10px] font-semibold mt-1 ml-1">PicoWorker team · {timeAgo(m.created_at)}</div>
                  </div>
                </div>
              ) : (
                <div key={i} className="self-end max-w-[80%]">
                  <div className="rounded-[16px] rounded-br-[4px] bg-[var(--accent)] text-[var(--accent-ink)] px-4 py-3 text-[14px] font-semibold leading-[1.45]">{m.body}</div>
                  <div className="text-[var(--ink-5)] text-[10px] font-semibold mt-1 mr-1 text-right">{timeAgo(m.created_at)}</div>
                </div>
              ),
            )
          )}
          <div ref={endRef} />
        </div>

        {msgs.length === 0 && (
          <div className="flex flex-wrap gap-2 px-5 pb-3">
            {QUICK.map((q) => (
              <button key={q} onClick={() => send(q)} className="px-3 py-2 rounded-full bg-[var(--fill)] border border-[var(--line-2)] text-[var(--ink-2)] text-[12.5px] font-bold hover:bg-[var(--fill-2)]">
                {q}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 p-3 border-t border-[var(--line)]">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send(text)}
            placeholder="Type a message…"
            className="flex-1 bg-[var(--fill)] border border-[var(--line)] rounded-[14px] px-4 py-3 text-[var(--ink)] text-[14px] font-medium placeholder:text-[var(--ink-5)] outline-none focus:border-[var(--accent)]/60"
          />
          <button onClick={() => send(text)} disabled={sending} className="w-11 h-11 flex-none rounded-[14px] bg-[var(--accent)] text-[var(--accent-ink)] flex items-center justify-center disabled:opacity-50">
            <Send width={18} height={18} />
          </button>
        </div>
      </div>
    </Page>
  )
}
