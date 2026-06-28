import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { supabase } from '../../lib/supabase'
import { usd } from '../../lib/format'
import type { TaskType } from '../../lib/types'
import { Page } from '../../components/Page'
import { TaskTypeIcon } from '../../components/layout'
import { Camera, X } from '../../components/icons'

const TYPES: { type: TaskType; label: string; category: string; needsTarget: 'handle' | 'url' | null; auto: boolean; reward: number }[] = [
  { type: 'follow_x', label: 'Follow X', category: 'Social', needsTarget: 'handle', auto: false, reward: 0.04 },
  { type: 'yt_views', label: 'YT views', category: 'Watch', needsTarget: 'url', auto: false, reward: 0.02 },
  { type: 'app_install', label: 'App install', category: 'Apps', needsTarget: 'url', auto: false, reward: 0.35 },
  { type: 'survey', label: 'Survey', category: 'Surveys', needsTarget: null, auto: true, reward: 0.18 },
  { type: 'visit_site', label: 'Visit site', category: 'Ads', needsTarget: 'url', auto: false, reward: 0.03 },
  { type: 'custom', label: 'Custom', category: 'Apps', needsTarget: null, auto: false, reward: 0.2 },
]

// Distinct, task-aware example hints so each screenshot field is clear.
const SHOT_HINTS: Partial<Record<TaskType, string[]>> = {
  follow_x: ['Your profile showing you now follow the account', "The account's page open in your app", 'The Following list with the account in it'],
  yt_views: ['The video playing or finished at full length', 'Your YouTube account that watched it', 'The like or subscribe button now active'],
  app_install: ['The app installed on your home screen', 'You opened and signed into the app', 'A screen from inside the app you reached'],
  visit_site: ['The website open in your browser', 'The exact page you were asked to visit', 'Any action you completed on the site'],
  custom: ['The completed action, clear and full screen', 'Your username or handle clearly visible', 'A second confirmation or angle'],
}
function shotHint(type: TaskType, i: number): string {
  const h = SHOT_HINTS[type]
  if (h && h[i]) return h[i]
  if (h && h.length) return h[h.length - 1]
  return 'A clear screenshot of your completed action'
}

const UNIT: Record<TaskType, string> = {
  follow_x: 'followers', yt_views: 'views', app_install: 'installs', survey: 'responses', visit_site: 'visits', custom: 'completions',
}

export function CreateTask() {
  const nav = useNavigate()
  const { createTask, userId, wallet } = useStore()
  const [typeIdx, setTypeIdx] = useState(0)
  const [target, setTarget] = useState('')
  const [customTitle, setCustomTitle] = useState('')
  const [instructions, setInstructions] = useState('')
  const [reward, setReward] = useState('0.04')
  const [count, setCount] = useState('500')
  const [screenshots, setScreenshots] = useState(1)
  const [specs, setSpecs] = useState<string[]>([])
  const [refImages, setRefImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const setSpec = (i: number, val: string) => setSpecs((s) => { const c = [...s]; c[i] = val; return c })

  async function addImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f || !supabase || !userId) return
    setUploading(true)
    try {
      const ext = (f.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `ref/${userId}/${Date.now()}.${ext}`
      const up = await supabase.storage.from('proofs').upload(path, f, { upsert: true, contentType: f.type })
      if (!up.error) setRefImages((imgs) => [...imgs, supabase!.storage.from('proofs').getPublicUrl(path).data.publicUrl])
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const t = TYPES[typeIdx]
  const r = parseFloat(reward) || 0
  const n = parseInt(count) || 0
  const SCREENSHOT_FEE = 0.005
  const screenshotCost = t.auto ? 0 : screenshots * SCREENSHOT_FEE
  const effReward = +(r + screenshotCost).toFixed(4)
  const rewards = effReward * n
  const budget = rewards // no platform fee charged to the business
  const balance = wallet?.business_escrow ?? 0
  const maxQty = effReward > 0 ? Math.floor(balance / effReward) : 0
  const overBudget = budget > balance + 1e-6

  function pickType(i: number) {
    setTypeIdx(i)
    setReward(TYPES[i].reward.toFixed(2))
    setTarget('')
    setCustomTitle('')
    setInstructions('')
    setScreenshots(1)
    setSpecs([])
    setRefImages([])
  }

  const isCustom = t.type === 'custom'
  const customReady = !isCustom || (!!customTitle.trim() && !!instructions.trim())

  async function review() {
    const titleMap: Record<TaskType, string> = {
      follow_x: `Follow ${target || '@yourhandle'} on X`,
      yt_views: 'Watch your video',
      app_install: 'Install & try your app',
      survey: 'Complete your survey',
      visit_site: 'Visit your site',
      custom: 'Custom task',
    }
    const task = await createTask({
      type: t.type,
      title: isCustom ? customTitle.trim() : titleMap[t.type],
      subtitle: isCustom ? instructions.trim() : t.label,
      target: target.trim(),
      reward: effReward,
      goal_count: n,
      auto_verify: t.auto,
      category: t.category,
      reference_images: refImages,
      screenshots: t.auto ? 1 : screenshots,
      screenshot_specs: t.auto ? [] : Array.from({ length: screenshots }, (_, i) => (specs[i] ?? '').trim()),
    })
    nav(`/business/fund?task=${task.id}`)
  }

  return (
    <Page title="New task" subtitle="Step 1 of 2 · Set up your campaign" back>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* form */}
        <div className="lg:col-span-2 rounded-[var(--r)] bg-[#15161C] border border-white/6 p-6">
          <Label>Task type</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
            {TYPES.map((x, i) => (
              <button key={x.type} onClick={() => pickType(i)} className={`py-[14px] rounded-[14px] text-[13px] font-extrabold font-head border ${i === typeIdx ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-transparent' : 'bg-white/4 text-[#C2C4CE] border-white/8 hover:bg-white/8'}`}>
                {x.label}
              </button>
            ))}
          </div>

          {t.needsTarget && (
            <>
              <Label>{t.needsTarget === 'handle' ? 'Your handle to follow' : 'Link'}</Label>
              <div className="flex items-center bg-white/4 border border-white/8 rounded-[14px] px-4 mb-6">
                {t.needsTarget === 'handle' && <span className="text-[#9A9CA8] text-[16px] font-bold">@</span>}
                <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder={t.needsTarget === 'handle' ? 'yourhandle' : 'https://…'} className="flex-1 bg-transparent outline-none py-[14px] px-2 text-white text-[15px] font-semibold placeholder:text-[#6E6F7A]" />
              </div>
            </>
          )}

          {isCustom && (
            <>
              <Label>What should people do?</Label>
              <input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder="e.g. Join our Facebook group" className="w-full bg-white/4 border border-white/8 rounded-[14px] px-4 py-[14px] text-white text-[15px] font-semibold placeholder:text-[#6E6F7A] outline-none mb-5" />
              <Label>Link to open (optional)</Label>
              <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="https://facebook.com/groups/yourgroup" className="w-full bg-white/4 border border-white/8 rounded-[14px] px-4 py-[14px] text-white text-[15px] font-semibold placeholder:text-[#6E6F7A] outline-none mb-5" />
              <Label>Instructions for the worker</Label>
              <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={4} placeholder="Explain exactly what to do and what screenshot to send as proof. Example: Join the group, then send a screenshot showing you are a member." className="w-full bg-white/4 border border-white/8 rounded-[14px] px-4 py-[12px] text-white text-[14px] font-semibold placeholder:text-[#6E6F7A] outline-none mb-6 leading-[1.5] resize-none" />
            </>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <Label>Reward each</Label>
              <Stepper value={reward} prefix="$" onStep={(d) => setReward(Math.max(0.01, r + d * 0.01).toFixed(2))} onChange={setReward} />
            </div>
            <div>
              <Label>How many</Label>
              <Stepper value={count} onStep={(d) => setCount(String(Math.max(1, n + d * 50)))} onChange={(v) => setCount(v.replace(/[^0-9]/g, ''))} />
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-[14px] bg-[rgba(68,209,122,.08)] border border-[rgba(68,209,122,.2)] p-4">
            <span className="text-[var(--green)] text-[13px] font-bold">
              {t.auto ? 'Auto-verified — you only pay for real results' : 'Manual review — you only pay for approved proofs'}
            </span>
          </div>

          {!t.auto && (
            <div className="mt-5 rounded-[16px] border border-white/8 bg-white/[.02] p-4">
              <div className="text-white text-[15px] font-extrabold font-head">Proof you need from workers</div>
              <div className="text-[#767884] text-[12.5px] font-semibold mt-1 mb-4 leading-[1.5]">
                Workers send screenshots and you approve them before paying. Be specific so the proof is easy to check.
              </div>

              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-white text-[13.5px] font-bold">How many screenshots?</div>
                  <div className="text-[#767884] text-[11.5px] font-semibold">$0.005 each is added to the worker's reward</div>
                </div>
                <div className="flex items-center bg-white/4 border border-white/8 rounded-[12px] overflow-hidden">
                  <button onClick={() => setScreenshots((s) => Math.max(1, s - 1))} className="w-10 h-10 text-white text-[18px] font-bold hover:bg-white/6">−</button>
                  <div className="w-10 text-center text-white text-[16px] font-extrabold font-head">{screenshots}</div>
                  <button onClick={() => setScreenshots((s) => Math.min(10, s + 1))} className="w-10 h-10 text-white text-[18px] font-bold hover:bg-white/6">+</button>
                </div>
              </div>

              <div className="text-white text-[13.5px] font-bold mb-2">What should each screenshot show?</div>
              <div className="flex flex-col gap-3">
                {Array.from({ length: screenshots }, (_, i) => (
                  <div key={i}>
                    <div className="text-[#9A9CA8] text-[12px] font-bold mb-1">Screenshot {i + 1}</div>
                    <input
                      value={specs[i] ?? ''}
                      onChange={(e) => setSpec(i, e.target.value)}
                      placeholder={shotHint(t.type, i)}
                      className="w-full bg-white/4 border border-white/8 rounded-[12px] px-4 py-[12px] text-white text-[14px] font-semibold placeholder:text-[#6E6F7A] outline-none"
                    />
                  </div>
                ))}
              </div>

              <div className="text-white text-[13.5px] font-bold mt-4 mb-1">Show an example (optional)</div>
              <div className="text-[#767884] text-[11.5px] font-semibold mb-2">Attach a screenshot of what a good submission looks like.</div>
              <div className="flex flex-wrap gap-2">
                {refImages.map((url, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-[12px] overflow-hidden border border-white/10">
                    <img src={url} alt="example" className="w-full h-full object-cover" />
                    <button onClick={() => setRefImages((imgs) => imgs.filter((_, j) => j !== i))} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center">
                      <X width={11} height={11} />
                    </button>
                  </div>
                ))}
                <button onClick={() => fileRef.current?.click()} disabled={uploading} className="w-20 h-20 rounded-[12px] border border-dashed border-white/15 bg-white/4 flex flex-col items-center justify-center gap-1 text-[#9A9CA8] disabled:opacity-50">
                  <Camera width={18} height={18} />
                  <span className="text-[10px] font-bold">{uploading ? '…' : 'Add'}</span>
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={addImage} />
            </div>
          )}

          <button onClick={() => nav('/business/targeting')} className="w-full mt-4 flex items-center justify-between p-4 rounded-[14px] bg-white/4 border border-white/8 text-left hover:bg-white/[.07]">
            <div>
              <div className="text-white text-[14px] font-bold">Targeting</div>
              <div className="text-[#767884] text-[12px] font-semibold">Countries, languages, device, level · optional</div>
            </div>
            <span className="text-[var(--accent)] text-[13px] font-extrabold">Set up →</span>
          </button>
        </div>

        {/* summary */}
        <aside className="lg:sticky lg:top-6 rounded-[var(--r)] bg-[#15161C] border border-white/6 p-6">
          <div className="flex items-center gap-3 mb-5">
            <TaskTypeIcon type={t.type} size={46} />
            <div>
              <div className="text-white text-[15px] font-bold">{t.label}</div>
              <div className="text-[#767884] text-[12px] font-semibold">{t.category}</div>
            </div>
          </div>
          <div className="flex flex-col gap-[10px] mb-5">
            <Line label="Base reward" value={usd(r)} />
            {screenshotCost > 0 && <Line label={`Screenshots (${screenshots} × $0.005)`} value={usd(screenshotCost)} />}
            <Line label="Reward each" value={usd(effReward)} />
            <Line label="Quantity" value={String(n)} />
            <div className="h-px bg-white/8 my-1" />
            <Line label="Total budget" value={usd(budget)} strong />
          </div>

          <div className="rounded-[14px] bg-white/[.03] border border-white/8 p-3.5 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-[#9A9CA8] text-[12.5px] font-semibold">Your balance</span>
              <span className={`font-head text-[15px] font-extrabold ${overBudget ? 'text-[#FFB05A]' : 'text-white'}`}>{usd(balance)}</span>
            </div>
            {maxQty > 0 ? (
              <button onClick={() => setCount(String(maxQty))} className="w-full mt-2.5 text-[13px] font-extrabold font-head text-[var(--accent)] bg-[rgba(194,249,77,.1)] border border-[rgba(194,249,77,.25)] rounded-[11px] py-2.5">
                Fit to my balance: {maxQty.toLocaleString()} {UNIT[t.type]}
              </button>
            ) : (
              <button onClick={() => nav('/business/add-funds')} className="w-full mt-2.5 text-[13px] font-extrabold font-head text-[var(--accent-ink)] bg-[var(--accent)] rounded-[11px] py-2.5">
                Add funds to launch
              </button>
            )}
            {overBudget && maxQty > 0 && (
              <div className="text-[#FFB05A] text-[11.5px] font-semibold mt-2 leading-[1.4]">
                This task is {usd(budget - balance)} over your balance. Tap above to fit it, or add funds.
              </div>
            )}
          </div>

          <button onClick={review} disabled={n <= 0 || r <= 0 || !customReady} className="w-full font-head font-extrabold text-[16px] bg-[var(--accent)] text-[var(--accent-ink)] py-[15px] rounded-[15px] disabled:opacity-50" style={{ boxShadow: 'var(--glow)' }}>
            Review &amp; fund
          </button>
        </aside>
      </div>
    </Page>
  )
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[#8B8D99] text-[12px] font-bold uppercase tracking-[.07em] mb-2">{children}</div>
)
function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[#9A9CA8] text-[13px] font-semibold">{label}</span>
      <span className={`font-head ${strong ? 'text-white text-[18px] font-extrabold' : 'text-[#D9DAE2] text-[14px] font-bold'}`}>{value}</span>
    </div>
  )
}
function Stepper({ value, prefix, onStep, onChange }: { value: string; prefix?: string; onStep: (dir: number) => void; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center bg-white/4 border border-white/8 rounded-[14px] overflow-hidden">
      <button onClick={() => onStep(-1)} className="w-11 h-[50px] text-white text-[20px] font-bold hover:bg-white/6">−</button>
      <div className="flex-1 flex items-center justify-center">
        {prefix && <span className="text-white text-[16px] font-bold font-head">{prefix}</span>}
        <input value={value} onChange={(e) => onChange(e.target.value)} inputMode="decimal" className="w-full bg-transparent outline-none text-center text-white text-[16px] font-extrabold font-head" />
      </div>
      <button onClick={() => onStep(1)} className="w-11 h-[50px] text-white text-[20px] font-bold hover:bg-white/6">+</button>
    </div>
  )
}
