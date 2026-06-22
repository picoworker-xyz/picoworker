import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { usd } from '../../lib/format'
import { Page, CenteredPage } from '../../components/Page'
import { Camera, Check, Plus } from '../../components/icons'

export function ProofUpload() {
  const { id } = useParams()
  const nav = useNavigate()
  const { task, completeTask, hasCompleted } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [images, setImages] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const t = id ? task(id) : undefined
  if (!t) return <Page title="Proof" back><div className="text-[#767884] py-16 text-center">Task not found.</div></Page>

  const already = hasCompleted(t.id)

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImages((prev) => [...prev, URL.createObjectURL(file)])
  }

  async function submit() {
    setBusy(true)
    try {
      // Supabase: upload to the `proofs` storage bucket, then store the URL.
      await completeTask(t!.id, images[0] ?? 'pending-proof')
      setSubmitted(true)
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
              We'll check your proof within ~2 hours. Approved proofs are paid instantly in USDC.
            </div>
            <div className="mt-5 px-4 py-2 rounded-full bg-white/6 text-white text-[14px] font-bold font-head">{usd(t.reward, { sign: true })} pending</div>
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
          <div className="text-[#8A8C98] text-[12px] font-semibold mt-1">Manual check · ~2 min</div>
        </div>
        <div className="font-head text-[18px] font-extrabold text-[var(--accent)]">{usd(t.reward, { sign: true })}</div>
      </div>

      <div className="text-white text-[15px] font-extrabold font-head mb-3">What to do</div>
      <ol className="flex flex-col gap-[10px] mb-6">
        {['Open the app / page and complete the action', 'Screenshot your published result', 'Upload it below as proof'].map((s, i) => (
          <li key={i} className="flex gap-3 text-[#D9DAE2] text-[14px] font-semibold leading-[1.4]">
            <span className="text-[var(--accent)] font-extrabold font-head">{i + 1}.</span>
            {s}
          </li>
        ))}
      </ol>

      <div className="text-white text-[15px] font-extrabold font-head mb-3">Your screenshot</div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {images.map((src, i) => (
          <div key={i} className="aspect-square rounded-[14px] overflow-hidden border border-white/10">
            <img src={src} alt="proof" className="w-full h-full object-cover" />
          </div>
        ))}
        <button onClick={() => fileRef.current?.click()} className="aspect-square rounded-[14px] border border-dashed border-white/15 bg-white/4 flex flex-col items-center justify-center gap-2 text-[#9A9CA8] hover:bg-white/8">
          {images.length === 0 ? <Camera width={22} height={22} /> : <Plus width={22} height={22} />}
          <span className="text-[11px] font-bold">{images.length === 0 ? 'Upload' : 'Add'}</span>
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />

      <div className="text-[#767884] text-[12.5px] font-semibold mt-5 leading-[1.5]">Reviewed within ~2 hours. Approved proofs are paid instantly in USDC.</div>

      <button onClick={submit} disabled={busy || images.length === 0} className="w-full mt-6 font-head font-extrabold text-[16px] bg-[var(--accent)] text-[var(--accent-ink)] py-[16px] rounded-[16px] disabled:opacity-50" style={{ boxShadow: 'var(--glow)' }}>
        {busy ? 'Submitting…' : 'Submit for review'}
      </button>
    </Page>
  )
}
