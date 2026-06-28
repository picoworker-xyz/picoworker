import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { supabase } from '../../lib/supabase'
import { usd, earnerNet } from '../../lib/format'
import { Page, CenteredPage } from '../../components/Page'
import { Camera, Check } from '../../components/icons'

type Shot = { file: File; preview: string }

export function ProofUpload() {
  const { id } = useParams()
  const nav = useNavigate()
  const { task, completeTask, myCompletions, userId } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const activeSlot = useRef(0)
  const [shots, setShots] = useState<(Shot | null)[]>([])
  const [handle, setHandle] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const t = id ? task(id) : undefined
  if (!t) return <Page title="Proof" back><div className="text-[#767884] py-16 text-center">Task not found.</div></Page>

  // Allow a redo if the only prior submission(s) were rejected.
  const mine = myCompletions().filter((c) => c.task_id === t.id)
  const hasActive = mine.some((c) => c.status !== 'rejected')

  const need = Math.max(1, t.screenshots_required ?? 1)
  const specs = t.screenshot_specs ?? []
  const handleLabel =
    t.type === 'follow_x' ? 'Your X (Twitter) @username'
    : t.type === 'yt_views' ? 'Your YouTube handle'
    : 'Your username / reference'

  function openPicker(i: number) { activeSlot.current = i; fileRef.current?.click() }
  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setShots((s) => { const c = [...s]; c[activeSlot.current] = { file: f, preview: URL.createObjectURL(f) }; return c })
    if (fileRef.current) fileRef.current.value = ''
  }

  async function submit() {
    setErr('')
    if (!handle.trim()) return setErr('Enter your username so the task giver can verify it.')
    const chosen = Array.from({ length: need }, (_, i) => shots[i]).filter(Boolean) as Shot[]
    if (chosen.length < need) return setErr(need === 1 ? 'Add a screenshot of your completed action.' : `Add all ${need} screenshots.`)
    setBusy(true)
    try {
      const urls: string[] = []
      for (let i = 0; i < chosen.length; i++) {
        const f = chosen[i].file
        const ext = (f.name.split('.').pop() || 'jpg').toLowerCase()
        const path = `${userId}/${t!.id}-${Date.now()}-${i}.${ext}`
        const up = await supabase!.storage.from('proofs').upload(path, f, { upsert: true, contentType: f.type })
        if (up.error) throw new Error(up.error.message)
        urls.push(supabase!.storage.from('proofs').getPublicUrl(path).data.publicUrl)
      }
      await completeTask(t!.id, urls[0], handle.trim(), urls)
      setSubmitted(true)
    } catch (e) {
      setErr((e as Error).message || 'Could not submit. Try again.')
    } finally {
      setBusy(false)
    }
  }

  if (submitted || hasActive) {
    return (
      <CenteredPage>
        <div className="rounded-[24px] bg-[#15161C] border border-white/7 p-8 text-center">
          <div className="flex flex-col items-center" style={{ animation: 'pico-pop .4s ease both' }}>
            <div className="w-[80px] h-[80px] rounded-full bg-[rgba(68,209,122,.16)] border border-[rgba(68,209,122,.4)] flex items-center justify-center">
              <Check width={38} height={38} className="text-[var(--green)]" />
            </div>
            <div className="font-head font-bold text-[24px] text-white mt-6">Submitted for review</div>
            <div className="text-[#A9ABB6] text-[14px] font-semibold mt-2 leading-[1.5]">
              The task giver will review your proof. Once approved, you're paid instantly in USDC. If it isn't reviewed within 7 days, it auto-approves.
            </div>
            <div className="mt-5 px-4 py-2 rounded-full bg-white/6 text-white text-[14px] font-bold font-head">{usd(earnerNet(t.reward), { sign: true })} pending approval</div>
          </div>
          <button onClick={() => nav('/', { replace: true })} className="w-full mt-8 font-head font-extrabold text-[16px] bg-[var(--accent)] text-[var(--accent-ink)] py-[15px] rounded-[15px]" style={{ boxShadow: 'var(--glow)' }}>
            Back to feed
          </button>
        </div>
      </CenteredPage>
    )
  }

  return (
    <Page title="Submit proof" back narrow>
      <div className="flex items-center justify-between rounded-[18px] p-4 bg-[#15161C] border border-white/6 mb-6">
        <div>
          <div className="text-white text-[15px] font-bold">{t.title}</div>
          <div className="text-[#8A8C98] text-[12px] font-semibold mt-1">Manual check · approved by the task giver</div>
        </div>
        <div className="font-head text-[18px] font-extrabold text-[var(--accent)]">{usd(earnerNet(t.reward), { sign: true })}</div>
      </div>

      {/* what the task giver wants as proof */}
      {(specs.some((s) => s) || t.proof_instructions || (t.reference_images && t.reference_images.length > 0)) && (
        <div className="rounded-[16px] p-4 bg-[#15161C] border border-white/6 mb-5">
          <div className="text-[#8B8D99] text-[11px] font-bold uppercase tracking-[.07em] mb-2">Proof required ({need} screenshot{need > 1 ? 's' : ''})</div>
          {t.proof_instructions && <div className="text-[#D9DAE2] text-[14px] font-semibold leading-[1.5] whitespace-pre-line mb-2">{t.proof_instructions}</div>}
          {specs.some((s) => s) && (
            <div className="flex flex-col gap-1.5">
              {Array.from({ length: need }, (_, i) => (
                <div key={i} className="flex items-start gap-2 text-[#D9DAE2] text-[13.5px] font-semibold">
                  <span className="w-5 h-5 rounded-full bg-white/8 text-[#9A9CA8] text-[10px] font-extrabold flex items-center justify-center flex-none mt-[1px]">{i + 1}</span>
                  <span>{specs[i] || 'A clear screenshot of your completed action'}</span>
                </div>
              ))}
            </div>
          )}
          {t.reference_images && t.reference_images.length > 0 && (
            <>
              <div className="text-[#767884] text-[12px] font-semibold mt-3 mb-2">Example{t.reference_images.length > 1 ? 's' : ''}:</div>
              <div className="flex flex-wrap gap-2">
                {t.reference_images.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer" className="w-20 h-20 rounded-[10px] overflow-hidden border border-white/10 block">
                    <img src={url} alt="example proof" className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* username / handle */}
      <div className="text-[#8B8D99] text-[12px] font-bold uppercase tracking-[.07em] mb-2">{handleLabel}</div>
      <input
        value={handle}
        onChange={(e) => setHandle(e.target.value)}
        placeholder={t.type === 'follow_x' ? '@yourhandle' : 'your username'}
        autoCapitalize="none"
        className="w-full bg-[#15161C] border border-white/10 rounded-[14px] px-4 py-[13px] text-white text-[15px] font-semibold placeholder:text-[#6E6F7A] outline-none focus:border-[var(--accent)]/60 mb-5"
      />

      {/* screenshots, one slot per required screenshot */}
      <div className="text-[#8B8D99] text-[12px] font-bold uppercase tracking-[.07em] mb-2">Your screenshot{need > 1 ? 's' : ''}</div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: need }, (_, i) => {
          const shot = shots[i]
          return (
            <div key={i}>
              {specs[i] && <div className="text-[#9A9CA8] text-[12px] font-semibold mb-1.5">{i + 1}. {specs[i]}</div>}
              {shot ? (
                <div className="relative rounded-[16px] overflow-hidden border border-white/10">
                  <img src={shot.preview} alt="proof" className="w-full max-h-[280px] object-contain bg-black/30" />
                  <button onClick={() => openPicker(i)} className="absolute bottom-2 right-2 px-3 py-1.5 rounded-[10px] bg-black/60 text-white text-[12px] font-bold">Change</button>
                </div>
              ) : (
                <button onClick={() => openPicker(i)} className="w-full rounded-[16px] border border-dashed border-white/15 bg-white/4 py-8 flex flex-col items-center justify-center gap-2 text-[#9A9CA8] hover:bg-white/8">
                  <Camera width={24} height={24} />
                  <span className="text-[12px] font-bold">Upload screenshot {need > 1 ? i + 1 : ''}</span>
                </button>
              )}
            </div>
          )
        })}
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />

      <div className="text-[#767884] text-[12.5px] font-semibold mt-4 leading-[1.5]">
        Show your username and the completed action clearly. The task giver checks every proof before paying.
      </div>

      {err && <div className="text-[var(--coral)] text-[13px] font-semibold mt-3">{err}</div>}

      <button onClick={submit} disabled={busy} className="w-full mt-5 font-head font-extrabold text-[16px] bg-[var(--accent)] text-[var(--accent-ink)] py-[16px] rounded-[16px] disabled:opacity-50" style={{ boxShadow: 'var(--glow)' }}>
        {busy ? 'Submitting…' : 'Submit for review'}
      </button>
    </Page>
  )
}
