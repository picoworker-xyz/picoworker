import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { supabase } from '../../lib/supabase'
import { usd } from '../../lib/format'
import { Page, CenteredPage } from '../../components/Page'
import { Camera, Check } from '../../components/icons'

export function ProofUpload() {
  const { id } = useParams()
  const nav = useNavigate()
  const { task, completeTask, hasCompleted, userId } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [handle, setHandle] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const t = id ? task(id) : undefined
  if (!t) return <Page title="Proof" back><div className="text-[#767884] py-16 text-center">Task not found.</div></Page>

  const already = hasCompleted(t.id)
  const handleLabel =
    t.type === 'follow_x' ? 'Your X (Twitter) @username'
    : t.type === 'yt_views' ? 'Your YouTube handle'
    : 'Your username / reference'

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function submit() {
    setErr('')
    if (!handle.trim()) return setErr('Enter your username so the task giver can verify it.')
    if (!file) return setErr('Add a screenshot of your completed action.')
    setBusy(true)
    try {
      // Upload the screenshot to the public `proofs` bucket, then record the
      // completion with the URL + the username (provider approves it).
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${userId}/${t!.id}-${Date.now()}.${ext}`
      const up = await supabase!.storage.from('proofs').upload(path, file, { upsert: true, contentType: file.type })
      if (up.error) throw new Error(up.error.message)
      const url = supabase!.storage.from('proofs').getPublicUrl(path).data.publicUrl
      await completeTask(t!.id, url, handle.trim())
      setSubmitted(true)
    } catch (e) {
      setErr((e as Error).message || 'Could not submit. Try again.')
    } finally {
      setBusy(false)
    }
  }

  if (submitted || already) {
    return (
      <CenteredPage>
        <div className="rounded-[24px] bg-[#15161C] border border-white/7 p-8 text-center">
          <div className="flex flex-col items-center" style={{ animation: 'pico-pop .4s ease both' }}>
            <div className="w-[80px] h-[80px] rounded-full bg-[rgba(68,209,122,.16)] border border-[rgba(68,209,122,.4)] flex items-center justify-center">
              <Check width={38} height={38} className="text-[var(--green)]" />
            </div>
            <div className="font-head font-bold text-[24px] text-white mt-6">Submitted for review</div>
            <div className="text-[#A9ABB6] text-[14px] font-semibold mt-2 leading-[1.5]">
              The task giver will review your proof. Once approved, you're paid instantly in USDC.
            </div>
            <div className="mt-5 px-4 py-2 rounded-full bg-white/6 text-white text-[14px] font-bold font-head">{usd(t.reward, { sign: true })} pending approval</div>
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
        <div className="font-head text-[18px] font-extrabold text-[var(--accent)]">{usd(t.reward, { sign: true })}</div>
      </div>

      {/* username / handle */}
      <div className="text-[#8B8D99] text-[12px] font-bold uppercase tracking-[.07em] mb-2">{handleLabel}</div>
      <input
        value={handle}
        onChange={(e) => setHandle(e.target.value)}
        placeholder={t.type === 'follow_x' ? '@yourhandle' : 'your username'}
        autoCapitalize="none"
        className="w-full bg-[#15161C] border border-white/10 rounded-[14px] px-4 py-[13px] text-white text-[15px] font-semibold placeholder:text-[#6E6F7A] outline-none focus:border-[var(--accent)]/60 mb-5"
      />

      {/* screenshot */}
      <div className="text-[#8B8D99] text-[12px] font-bold uppercase tracking-[.07em] mb-2">Screenshot proof</div>
      {preview ? (
        <div className="relative rounded-[16px] overflow-hidden border border-white/10 mb-2">
          <img src={preview} alt="proof" className="w-full max-h-[320px] object-contain bg-black/30" />
          <button onClick={() => fileRef.current?.click()} className="absolute bottom-2 right-2 px-3 py-1.5 rounded-[10px] bg-black/60 text-white text-[12px] font-bold">Change</button>
        </div>
      ) : (
        <button onClick={() => fileRef.current?.click()} className="w-full rounded-[16px] border border-dashed border-white/15 bg-white/4 py-10 flex flex-col items-center justify-center gap-2 text-[#9A9CA8] hover:bg-white/8">
          <Camera width={26} height={26} />
          <span className="text-[12px] font-bold">Upload a screenshot</span>
        </button>
      )}
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
