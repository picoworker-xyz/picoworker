import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { usd } from '../../lib/format'
import { Page } from '../../components/Page'

const QUESTIONS: { q: string; opts: string[] }[] = [
  { q: 'How often do you shop online?', opts: ['Almost every day', 'A few times a week', 'Once or twice a month', 'Rarely or never'] },
  { q: 'What do you buy most online?', opts: ['Clothing & fashion', 'Electronics', 'Groceries', 'Beauty & health'] },
  { q: 'How do you usually pay?', opts: ['Card', 'Mobile wallet', 'Cash on delivery', 'Crypto / USDC'] },
  { q: 'What matters most when buying?', opts: ['Price', 'Delivery speed', 'Reviews', 'Brand'] },
  { q: 'Which device do you shop on most?', opts: ['Phone', 'Laptop', 'Tablet', 'Desktop'] },
  { q: 'Roughly how much do you spend per month?', opts: ['Under $50', '$50–150', '$150–400', 'More than $400'] },
]

export function SurveyTask() {
  const { id } = useParams()
  const nav = useNavigate()
  const { task, completeTask } = useStore()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [busy, setBusy] = useState(false)

  const t = id ? task(id) : undefined
  if (!t) return <Page title="Survey" back><div className="text-center text-[#767884] py-16">This survey is no longer available.</div></Page>

  const cur = QUESTIONS[step]
  const picked = answers[step]
  const last = step === QUESTIONS.length - 1

  async function next() {
    if (picked === undefined) return
    if (!last) return setStep((s) => s + 1)
    setBusy(true)
    try {
      const res = await completeTask(t!.id)
      nav(`/task/${t!.id}/done`, { replace: true, state: { reward: res.reward, balance: res.balance } })
    } catch {
      setBusy(false)
    }
  }

  return (
    <Page back narrow title={t.title} subtitle={`Survey · ${usd(t.reward, { sign: true })}`}>
      {/* progress */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-[8px] rounded-full bg-white/8 overflow-hidden">
          <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }} />
        </div>
        <span className="text-[#9A9CA8] text-[13px] font-bold font-head">{step + 1}/{QUESTIONS.length}</span>
      </div>

      <div className="rounded-[var(--r)] bg-[#15161C] border border-white/6 p-6">
        <div className="text-[#8B8D99] text-[12px] font-bold uppercase tracking-[.07em] mb-2">Choose one</div>
        <h2 className="text-white text-[22px] font-extrabold font-head leading-[1.2] mb-5">{cur.q}</h2>
        <div className="flex flex-col gap-3">
          {cur.opts.map((o, i) => {
            const on = picked === i
            return (
              <button
                key={o}
                onClick={() => setAnswers((a) => ({ ...a, [step]: i }))}
                className={`flex items-center gap-3 p-4 rounded-[14px] border text-left transition-colors ${on ? 'bg-[rgba(194,249,77,.1)] border-[var(--accent)]' : 'bg-white/4 border-white/8 hover:bg-white/[.07]'}`}
              >
                <span className={`w-5 h-5 rounded-full border-2 flex-none flex items-center justify-center ${on ? 'border-[var(--accent)]' : 'border-white/25'}`}>
                  {on && <span className="w-[10px] h-[10px] rounded-full bg-[var(--accent)]" />}
                </span>
                <span className={`text-[15px] font-semibold ${on ? 'text-white' : 'text-[#C7C9D4]'}`}>{o}</span>
              </button>
            )
          })}
        </div>
      </div>

      <button onClick={next} disabled={picked === undefined || busy} className="w-full mt-6 font-head font-extrabold text-[16px] bg-[var(--accent)] text-[var(--accent-ink)] py-[16px] rounded-[16px] disabled:opacity-50" style={{ boxShadow: 'var(--glow)' }}>
        {busy ? 'Submitting…' : last ? `Finish & earn ${usd(t.reward, { sign: true })}` : 'Next question'}
      </button>
    </Page>
  )
}
