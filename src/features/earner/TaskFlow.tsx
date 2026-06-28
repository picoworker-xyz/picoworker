import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { usd, etaLabel, earnerNet } from '../../lib/format'
import type { TaskType } from '../../lib/types'
import { Page } from '../../components/Page'
import { TaskTypeIcon } from '../../components/layout'
import { Pill } from '../../components/ui'
import { ExternalLink, Shield } from '../../components/icons'

const STEPS: Record<TaskType, [string, string, string]> = {
  follow_x: ['Tap Open X — we drop you on the profile', 'Hit Follow', 'Come back — auto-verified in ~10s'],
  yt_views: ['Tap Open — the video starts', 'Watch the full 30s', 'Come back — auto-verified instantly'],
  app_install: ['Tap Open — install the app', 'Open it & sign up', 'Come back to verify'],
  survey: ['Tap Start survey', 'Answer a few quick questions', 'Submit — paid on completion'],
  visit_site: ['Tap Open site', 'Browse for a few seconds', 'Come back — auto-verified'],
  custom: ['Follow the instructions', 'Capture a screenshot as proof', 'Upload it for review'],
}
const CTA: Record<TaskType, string> = {
  follow_x: 'Open X',
  yt_views: 'Open video',
  app_install: 'Open app',
  survey: 'Start survey',
  visit_site: 'Open site',
  custom: 'Start task',
}

export function TaskFlow() {
  const { id } = useParams()
  const nav = useNavigate()
  const { task, completeTask } = useStore()
  const [started, setStarted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const t = id ? task(id) : undefined
  if (!t) {
    return (
      <Page title="Task" back>
        <div className="text-center text-[#767884] text-[14px] font-semibold py-16">This task is no longer available.</div>
      </Page>
    )
  }

  const steps = STEPS[t.type]

  async function verify() {
    setBusy(true)
    setErr('')
    try {
      const res = await completeTask(t!.id, undefined)
      if (res.manual) nav(`/task/${t!.id}/proof`)
      else nav(`/task/${t!.id}/done`, { state: { reward: res.reward, balance: res.balance } })
    } catch (e) {
      setErr((e as Error).message)
      setBusy(false)
    }
  }

  function open() {
    if (t!.type === 'survey') return nav(`/task/${t!.id}/survey`)
    // Build the real link to open (follow handle → x.com/<handle>).
    const url =
      t!.type === 'follow_x'
        ? `https://x.com/${(t!.target ?? '').replace(/^@/, '')}`
        : t!.target?.startsWith('http')
          ? t!.target
          : null
    if (url) window.open(url, '_blank')
    setStarted(true)
  }

  // After the user does the action: auto-verify tasks complete instantly;
  // manual tasks go to the proof screen (username + screenshot → provider approves).
  function proceed() {
    if (t!.auto_verify) verify()
    else nav(`/task/${t!.id}/proof`)
  }

  return (
    <Page back>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* detail */}
        <div className="lg:col-span-2 rounded-[var(--r)] bg-[#15161C] border border-white/6 p-6 lg:p-8">
          <div className="flex items-center gap-4">
            <TaskTypeIcon type={t.type} size={64} />
            <div>
              <div className="text-white text-[24px] font-bold font-head tracking-[-.01em]">{t.title}</div>
              <div className="flex gap-2 mt-2 flex-wrap">
                <Pill>{t.category}</Pill>
                <Pill>{etaLabel(t.est_seconds)}</Pill>
                {t.auto_verify ? <Pill tone="green">Auto-verify</Pill> : <Pill tone="green">Pays after review</Pill>}
              </div>
            </div>
          </div>

          {t.type === 'custom' && t.subtitle ? (
            <>
              <div className="text-white text-[15px] font-extrabold font-head mt-8 mb-3">What to do</div>
              <div className="text-[#D9DAE2] text-[15px] font-semibold leading-[1.55] whitespace-pre-line">{t.subtitle}</div>
              <div className="text-[#9A9CA8] text-[13px] font-semibold mt-4">Then capture a screenshot as proof and upload it for review.</div>
            </>
          ) : (
            <>
              <div className="text-white text-[15px] font-extrabold font-head mt-8 mb-4">How it works</div>
              <div className="flex flex-col gap-4">
                {steps.map((s, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className={`w-9 h-9 flex-none rounded-[12px] flex items-center justify-center font-head font-extrabold text-[15px] ${i === 0 ? 'bg-[var(--accent)] text-[var(--accent-ink)]' : 'bg-white/8 text-white'}`}>
                      {i + 1}
                    </div>
                    <div className="text-[#D9DAE2] text-[15px] font-semibold leading-[1.4]">{s}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="flex items-center gap-3 mt-8 px-4 py-4 rounded-[14px] bg-white/4 border border-white/7">
            <Shield width={18} height={18} className="text-[var(--green)] flex-none" />
            <span className="text-[#B6B8C2] text-[13px] font-semibold">No login or password needed. We never post for you.</span>
          </div>
        </div>

        {/* reward + CTA (sticky on desktop) */}
        <aside className="lg:sticky lg:top-6 flex flex-col gap-4">
          <div
            className="rounded-[var(--r)] p-6 border border-[rgba(194,249,77,.3)] text-center"
            style={{ background: 'linear-gradient(135deg,rgba(194,249,77,.16),rgba(194,249,77,.04))' }}
          >
            <div className="text-[#9DAA7E] text-[12px] font-bold uppercase tracking-[.07em]">Reward</div>
            <div className="font-head font-bold text-[48px] text-[var(--accent)] tracking-[-.02em] leading-tight my-1">{usd(earnerNet(t.reward), { sign: true })}</div>
            <div className="text-[#A9ABB6] text-[12px] font-semibold">Paid in USDC · instantly</div>
          </div>

          {err && <div className="text-[var(--coral)] text-[13px] font-semibold text-center">{err}</div>}

          {!started ? (
            <button onClick={open} className="w-full font-head font-extrabold text-[16px] bg-[var(--accent)] text-[var(--accent-ink)] py-[16px] rounded-[16px] flex items-center justify-center gap-2" style={{ boxShadow: 'var(--glow)' }}>
              {CTA[t.type]} <ExternalLink width={18} height={18} />
            </button>
          ) : (
            <button onClick={proceed} disabled={busy} className="w-full font-head font-extrabold text-[16px] bg-[var(--accent)] text-[var(--accent-ink)] py-[16px] rounded-[16px] disabled:opacity-60" style={{ boxShadow: 'var(--glow)' }}>
              {busy ? 'Verifying…' : t.auto_verify ? 'Verify now' : 'Submit proof'}
            </button>
          )}
          <div className="text-center text-[#767884] text-[13px] font-semibold">
            {t.auto_verify ? (
              <>Already done it? <button onClick={proceed} className="text-[var(--accent)] font-extrabold">Verify now</button></>
            ) : (
              'Manual review · paid after the provider approves'
            )}
          </div>
        </aside>
      </div>
    </Page>
  )
}
