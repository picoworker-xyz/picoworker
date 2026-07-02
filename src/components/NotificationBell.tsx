import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { timeAgo } from '../lib/format'
import { useNotifications } from '../features/earner/Notifications'
import { Bell } from './icons'

// Bell that opens a small dismissible dropdown instead of navigating away,
// so a working user can glance and close without leaving their task.
export function NotificationBell({ round = false, align = 'right' }: { round?: boolean; align?: 'left' | 'right' }) {
  const nav = useNavigate()
  const notes = useNotifications()
  const [open, setOpen] = useState(false)
  const [cleared, setCleared] = useState(() => Number(localStorage.getItem('pico-notif-cleared') || 0))
  const [seen, setSeen] = useState(() => Number(localStorage.getItem('pico-notif-seen') || 0))

  const visible = notes.filter((n) => n.at > cleared)
  const unread = visible.filter((n) => n.at > seen).length

  function openPanel() {
    setOpen(true)
    const t = Date.now()
    setSeen(t)
    try { localStorage.setItem('pico-notif-seen', String(t)) } catch { /* ignore */ }
  }
  function clearAll() {
    const t = Date.now()
    setCleared(t)
    try { localStorage.setItem('pico-notif-cleared', String(t)) } catch { /* ignore */ }
  }

  const shape = round ? 'rounded-full border border-[var(--line-2)]' : 'rounded-[11px]'

  return (
    <div className="relative">
      <button
        onClick={() => (open ? setOpen(false) : openPanel())}
        title="Notifications"
        className={`relative w-9 h-9 ${shape} bg-[var(--fill)] flex items-center justify-center text-[var(--ink-2)] hover:text-[var(--ink)]`}
      >
        <Bell width={17} height={17} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[var(--coral)] text-[#fff] text-[10px] font-extrabold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* tap-outside to close, without leaving the page */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} mt-2 w-[320px] max-w-[calc(100vw-24px)] z-50 rounded-[16px] bg-[var(--card)] border border-[var(--line-2)] shadow-xl overflow-hidden`}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line)]">
              <span className="text-[var(--ink)] text-[14px] font-extrabold font-head">Notifications</span>
              {visible.length > 0 && (
                <button onClick={clearAll} className="text-[var(--accent-strong)] text-[12px] font-extrabold">Clear</button>
              )}
            </div>

            {visible.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell width={22} height={22} className="text-[var(--ink-5)] mx-auto" />
                <div className="text-[var(--ink-2)] text-[13px] font-bold mt-2">You're all caught up</div>
              </div>
            ) : (
              <div className="max-h-[360px] overflow-y-auto">
                {visible.slice(0, 8).map((n, i) => (
                  <div key={n.id} className={`flex items-center gap-3 px-4 py-3 ${i === 0 ? '' : 'border-t border-[var(--line)]'}`}>
                    <div className="w-9 h-9 flex-none rounded-[11px] flex items-center justify-center" style={{ background: n.tint }}>
                      {n.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[var(--ink)] text-[13px] font-bold truncate">{n.title}</div>
                      <div className="text-[var(--ink-4)] text-[11px] font-semibold truncate">{n.sub}</div>
                    </div>
                    <div className="text-[var(--ink-5)] text-[10.5px] font-semibold whitespace-nowrap">{timeAgo(new Date(n.at).toISOString())}</div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => { setOpen(false); nav('/notifications') }}
              className="w-full px-4 py-3 border-t border-[var(--line)] text-[var(--ink-2)] text-[12.5px] font-extrabold hover:bg-[var(--fill)]"
            >
              See all
            </button>
          </div>
        </>
      )}
    </div>
  )
}
