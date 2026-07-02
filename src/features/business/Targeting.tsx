import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page } from '../../components/Page'
import { Globe } from '../../components/icons'

const COUNTRIES = ['India', 'Pakistan', 'Philippines', 'Bangladesh', 'Nigeria', 'Indonesia', 'Global']
const LANGUAGES = ['English', 'Hindi', 'Urdu', 'Tagalog', 'Bahasa']
const DEVICES = ['All', 'iOS', 'Android']
const LEVELS = ['Any', 'Silver+', 'Gold']

export function Targeting() {
  const nav = useNavigate()
  const [countries, setCountries] = useState<string[]>(['India', 'Pakistan'])
  const [langs, setLangs] = useState<string[]>(['English'])
  const [device, setDevice] = useState('All')
  const [level, setLevel] = useState('Any')
  const [saved, setSaved] = useState(false)

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  // rough estimated-reach heuristic for the demo
  const base = 120000
  const reach = Math.round(
    base *
      (countries.includes('Global') || countries.length === 0 ? 1 : Math.min(1, countries.length * 0.18)) *
      (device === 'All' ? 1 : 0.55) *
      (level === 'Any' ? 1 : level === 'Silver+' ? 0.6 : 0.3),
  )

  return (
    <Page
      title="Targeting"
      subtitle="Optional · reach the right earners for your campaign."
      back
      narrow
      actions={<span className="text-[var(--ink-4)] text-[13px] font-semibold">Optional</span>}
    >
      <Section label="Countries">
        <Chips options={COUNTRIES} selected={countries} onToggle={(v) => toggle(countries, setCountries, v)} />
      </Section>
      <Section label="Languages">
        <Chips options={LANGUAGES} selected={langs} onToggle={(v) => toggle(langs, setLangs, v)} />
      </Section>
      <Section label="Device">
        <Single options={DEVICES} value={device} onChange={setDevice} />
      </Section>
      <Section label="Minimum level">
        <Single options={LEVELS} value={level} onChange={setLevel} />
      </Section>

      <div className="flex items-center justify-between rounded-[16px] p-5 bg-[rgba(194,249,77,.06)] border border-[rgba(194,249,77,.2)] mt-2">
        <div className="flex items-center gap-3">
          <Globe width={22} height={22} className="text-[var(--accent-strong)]" />
          <span className="text-[var(--ink-2)] text-[14px] font-semibold">Estimated reach</span>
        </div>
        <span className="font-head text-[22px] font-extrabold text-[var(--ink)]">~{reach.toLocaleString()}</span>
      </div>

      <button
        onClick={() => { setSaved(true); setTimeout(() => nav(-1), 600) }}
        className="w-full mt-6 font-head font-extrabold text-[16px] bg-[var(--accent)] text-[var(--accent-ink)] py-[16px] rounded-[16px]"
        style={{ boxShadow: 'var(--glow)' }}
      >
        {saved ? 'Saved ✓' : 'Save targeting'}
      </button>
    </Page>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="text-[var(--ink-4)] text-[12px] font-bold uppercase tracking-[.07em] mb-3">{label}</div>
      {children}
    </div>
  )
}
function Chips({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o)
        return (
          <button key={o} onClick={() => onToggle(o)} className={`px-4 py-[10px] rounded-full text-[13px] font-bold border ${on ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-transparent' : 'bg-[var(--fill)] text-[var(--ink-2)] border-[var(--line)]'}`}>
            {o}
          </button>
        )
      })}
    </div>
  )
}
function Single({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o} onClick={() => onChange(o)} className={`px-5 py-[11px] rounded-[12px] text-[14px] font-head font-extrabold border ${value === o ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-transparent' : 'bg-[var(--card)] text-[var(--ink-2)] border-[var(--line)]'}`}>
          {o}
        </button>
      ))}
    </div>
  )
}
