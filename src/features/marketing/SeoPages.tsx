/* eslint-disable react-refresh/only-export-components -- This route module intentionally shares SEO and PWA helpers with related public pages. */
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BrandLogo } from '../../components/BrandLogo'
import { BrandMark } from '../../components/layout'
import { ArrowRight, Bolt, Check, ListIcon, Play, XLogo } from '../../components/icons'

/** Swaps the document title, meta description and canonical URL for this route,
 *  restoring the landing page defaults from index.html on unmount. */
export function useSeo({ title, description, path }: { title: string; description: string; path: string }) {
  useEffect(() => {
    const prevTitle = document.title
    document.title = title

    const desc = document.querySelector('meta[name="description"]')
    const prevDesc = desc?.getAttribute('content') ?? ''
    desc?.setAttribute('content', description)

    const canonical = document.querySelector('link[rel="canonical"]')
    const prevCanonical = canonical?.getAttribute('href') ?? ''
    canonical?.setAttribute('href', `https://picoworker.xyz${path}`)

    return () => {
      document.title = prevTitle
      desc?.setAttribute('content', prevDesc)
      canonical?.setAttribute('href', prevCanonical)
    }
  }, [title, description, path])
}

function Seo(props: { title: string; description: string; path: string }) {
  useSeo(props)
  return null
}

/** Footer shared by the landing page and the SEO pages. Links every marketing
 *  page so crawlers can discover them from anywhere on the site. */
export function MarketingFooter() {
  const links: [string, string][] = [
    ['/earn/follow-accounts', 'Follow accounts'],
    ['/earn/watch-videos', 'Watch videos'],
    ['/earn/app-testing', 'App testing'],
    ['/earn/paid-surveys', 'Paid surveys'],
    ['/micro-jobs', 'Micro jobs'],
    ['/how-picoworker-works', 'How it works'],
    ['/faq', 'Help and FAQ'],
    ['/about', 'About PicoWorker'],
    ['/app', 'Get the app'],
    ['/is-picoworker-legit', 'Is PicoWorker legit?'],
    ['/picoworkers-alternative', 'Picoworkers alternative'],
    ['/ai-agents', 'For AI agents'],
  ]
  return (
    <footer className="border-t border-[var(--line)]">
      <div className="app-container py-10 flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] font-semibold text-[var(--ink-4)]">
          {links.map(([to, label]) => (
            <Link key={to} to={to} className="hover:text-[var(--ink)]">{label}</Link>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <BrandMark size={32} />
          <div className="text-[var(--ink-4)] text-[13px] font-semibold">
            © 2026 PicoWorker · <Link to="/terms" className="hover:text-[var(--ink)]">Terms</Link> · <Link to="/privacy" className="hover:text-[var(--ink)]">Privacy</Link>
          </div>
          <a href="https://x.com/picoworker" className="w-9 h-9 rounded-full bg-[var(--fill)] flex items-center justify-center text-[var(--ink-3)] hover:text-[var(--ink)]">
            <XLogo width={15} height={15} />
          </a>
        </div>
      </div>
    </footer>
  )
}

export function PageShell({ children }: { children: ReactNode }) {
  const nav = useNavigate()
  const go = () => nav('/login')
  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--bar)] backdrop-blur">
        <div className="app-container flex items-center justify-between gap-3 h-16">
          <button onClick={() => nav('/')} className="flex items-center gap-[10px] flex-none min-w-0">
            <BrandLogo size={36} />
          </button>
          <div className="flex items-center gap-2 flex-none">
            <button onClick={go} className="hidden sm:block px-4 py-[9px] rounded-[12px] text-[14px] font-bold text-[var(--ink)] hover:bg-[var(--fill)]">
              Log in
            </button>
            <button
              onClick={go}
              className="px-4 py-[9px] rounded-[12px] text-[14px] font-extrabold font-head bg-[var(--accent)] text-[var(--accent-ink)] whitespace-nowrap"
            >
              Get started
            </button>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <MarketingFooter />
    </div>
  )
}

function CtaBanner({ title, sub }: { title: string; sub: string }) {
  const nav = useNavigate()
  return (
    <section className="app-container pb-16 lg:pb-24">
      <div
        className="relative overflow-hidden rounded-[28px] border border-[rgba(46,224,110,.18)] px-6 py-14 text-center"
        style={{ background: 'linear-gradient(165deg,var(--card-2),var(--bg))' }}
      >
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(640px 320px at 50% -15%, rgba(46,224,110,.16), transparent 70%)' }}
        />
        <div className="relative">
          <h2 className="font-head font-bold text-[26px] lg:text-[36px] tracking-[-.02em] text-[var(--ink)] max-w-[560px] mx-auto leading-[1.12]">{title}</h2>
          <p className="text-[var(--ink-3)] text-[15px] font-medium mt-4 max-w-[440px] mx-auto leading-[1.6]">{sub}</p>
          <button
            onClick={() => nav('/login')}
            className="mt-7 px-7 py-[15px] rounded-[14px] font-head font-extrabold text-[16px] bg-[var(--accent)] text-[var(--accent-ink)] inline-flex items-center gap-2"
            style={{ boxShadow: 'var(--glow)' }}
          >
            Get started for free <ArrowRight width={18} height={18} />
          </button>
        </div>
      </div>
    </section>
  )
}

function Steps({ steps }: { steps: { t: string; d: string }[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-[1000px] mx-auto">
      {steps.map((s, i) => (
        <div key={s.t} className="rounded-[20px] p-7 bg-[var(--card)] border border-[var(--line)]">
          <div className="w-10 h-10 rounded-full bg-[var(--accent)] text-[var(--accent-ink)] font-head font-extrabold text-[16px] flex items-center justify-center">
            {i + 1}
          </div>
          <div className="text-[var(--ink)] text-[18px] font-extrabold font-head mt-4">{s.t}</div>
          <div className="text-[var(--ink-3)] text-[14px] font-semibold mt-2 leading-[1.55]">{s.d}</div>
        </div>
      ))}
    </div>
  )
}

function MiniFaq({ faqs }: { faqs: { q: string; a: string }[] }) {
  return (
    <section className="border-t border-[var(--line)] bg-[var(--fill)]">
      <div className="app-container py-16 lg:py-20">
        <h2 className="font-head font-bold text-[26px] lg:text-[32px] tracking-[-.02em] text-[var(--ink)] text-center mb-10">Common questions</h2>
        <div className="flex flex-col gap-3 max-w-[720px] mx-auto">
          {faqs.map((f, i) => (
            <details key={f.q} open={i === 0} className="group rounded-[18px] bg-[var(--card)] border border-[var(--line)] open:border-[var(--line-2)] transition-colors">
              <summary className="flex items-center justify-between gap-4 p-6 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <h3 className="text-[var(--ink)] text-[15.5px] font-extrabold font-head">{f.q}</h3>
                <span className="w-7 h-7 rounded-full bg-[var(--fill)] border border-[var(--line)] flex-none flex items-center justify-center text-[var(--ink-3)] text-[16px] font-bold leading-none transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="px-6 pb-6 -mt-1 text-[var(--ink-3)] text-[14px] font-medium leading-[1.65]">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

function OtherWays({ current }: { current: string }) {
  const all = [
    { to: '/earn/follow-accounts', icon: <XLogo width={18} height={18} className="text-[#fff]" />, bg: '#000000', t: 'Follow accounts', p: 'Quick tasks' },
    { to: '/earn/watch-videos', icon: <Play width={20} height={20} className="text-[#fff]" />, bg: '#FF0033', t: 'Watch videos', p: 'Short clips' },
    { to: '/earn/app-testing', icon: <Bolt width={18} height={18} className="text-[#fff]" />, bg: '#5B8DEF', t: 'Test apps', p: 'Multi-step tasks' },
    { to: '/earn/paid-surveys', icon: <ListIcon width={18} height={18} className="text-[#fff]" />, bg: '#26A17B', t: 'Take surveys', p: 'Eligibility varies' },
  ].filter((w) => w.to !== current)
  return (
    <section className="app-container py-16 lg:py-20">
      <h2 className="font-head font-bold text-[26px] lg:text-[32px] tracking-[-.02em] text-[var(--ink)] text-center mb-10">More ways to earn on PicoWorker</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-[840px] mx-auto">
        {all.map((w) => (
          <Link key={w.to} to={w.to} className="card-hover rounded-[20px] p-6 bg-[var(--card)] border border-[var(--line)] block">
            <div className="w-11 h-11 rounded-[13px] flex items-center justify-center" style={{ background: w.bg }}>{w.icon}</div>
            <div className="text-[var(--ink)] text-[16px] font-extrabold font-head mt-4">{w.t}</div>
            <div className="text-[var(--accent-strong)] text-[12.5px] font-extrabold font-head mt-1">{w.p}</div>
          </Link>
        ))}
      </div>
    </section>
  )
}

type EarnDef = {
  path: string
  title: string
  description: string
  eyebrow: string
  h1: ReactNode
  intro: string
  pay: string
  steps: { t: string; d: string }[]
  sections: { h: string; body: string[] }[]
  faqs: { q: string; a: string }[]
  cta: { title: string; sub: string }
}

function EarnPage({ def }: { def: EarnDef }) {
  const nav = useNavigate()
  return (
    <PageShell>
      <Seo title={def.title} description={def.description} path={def.path} />

      <section className="hero-grid border-b border-[var(--line)]">
        <div className="app-container py-16 lg:py-24">
          <div className="max-w-[720px] mx-auto text-center reveal">
            <div className="text-[var(--accent-strong)] text-[12.5px] font-extrabold font-head uppercase tracking-[.16em]">{def.eyebrow}</div>
            <h1 className="font-head font-bold text-[34px] sm:text-[44px] lg:text-[52px] leading-[1.08] tracking-[-.03em] text-[var(--ink)] mt-4">{def.h1}</h1>
            <p className="text-[var(--ink-3)] text-[15px] lg:text-[17px] font-medium mt-6 max-w-[560px] mx-auto leading-[1.6]">{def.intro}</p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
              <button
                onClick={() => nav('/login')}
                className="px-6 py-[14px] rounded-[13px] font-head font-extrabold text-[15px] bg-[var(--accent)] text-[var(--accent-ink)] flex items-center gap-2"
                style={{ boxShadow: 'var(--glow)' }}
              >
                Start earning <ArrowRight width={17} height={17} />
              </button>
              <span className="inline-flex items-center px-4 py-[12px] rounded-[13px] bg-[var(--fill)] border border-[var(--line)] text-[var(--accent-strong)] text-[14px] font-extrabold font-head">
                {def.pay}
              </span>
            </div>
            <div className="text-[var(--ink-4)] text-[13.5px] font-semibold mt-6">
              Free to join · Clear requirements · Verified rewards
            </div>
          </div>
        </div>
      </section>

      <section className="app-container py-16 lg:py-20">
        <h2 className="font-head font-bold text-[26px] lg:text-[32px] tracking-[-.02em] text-[var(--ink)] text-center mb-10">How it works</h2>
        <Steps steps={def.steps} />
      </section>

      <section className="border-t border-[var(--line)]">
        <div className="app-container py-16 lg:py-20 max-w-[760px]">
          {def.sections.map((s) => (
            <div key={s.h} className="mb-10 last:mb-0">
              <h2 className="font-head font-bold text-[22px] lg:text-[26px] tracking-[-.02em] text-[var(--ink)] mb-4">{s.h}</h2>
              {s.body.map((p, i) => (
                <p key={i} className="text-[var(--ink-3)] text-[15px] font-medium leading-[1.7] mb-4 last:mb-0">{p}</p>
              ))}
            </div>
          ))}
        </div>
      </section>

      <MiniFaq faqs={def.faqs} />
      <OtherWays current={def.path} />
      <CtaBanner title={def.cta.title} sub={def.cta.sub} />
    </PageShell>
  )
}

const FOLLOW: EarnDef = {
  path: '/earn/follow-accounts',
  title: 'Follow Account Tasks and Earn Rewards | PicoWorker',
  description:
    'Find eligible follow-account tasks on PicoWorker. Read the requirements, complete the social action and earn a reward after verification. Free to join.',
  eyebrow: 'Follow and earn',
  h1: 'Earn rewards from follow tasks',
  intro:
    'Businesses use PicoWorker to reach genuine people on supported social platforms. Choose an eligible task, follow its exact instructions and receive the listed reward after verification.',
  pay: 'Clear reward before you start',
  steps: [
    { t: 'Choose an eligible task', d: 'Open the live feed and select a follow task available for your account and location.' },
    { t: 'Follow the instructions', d: 'Open the correct profile and complete only the action described by the task.' },
    { t: 'Wait for verification', d: 'The listed reward is credited after the completion is confirmed.' },
  ],
  sections: [
    {
      h: 'How follow tasks work',
      body: [
        'Each task identifies the account, supported platform, required action and reward before you begin. Availability may vary by country, device and account eligibility.',
        'Complete the task with the same account and device you used to start it. Duplicate accounts, automation and actions that do not match the instructions can be rejected.',
      ],
    },
    {
      h: 'Genuine activity only',
      body: [
        'PicoWorker is designed for genuine human completions. Read the task carefully, use your own account and avoid VPNs or automated tools. The task status shows whether a completion is approved, pending or rejected.',
      ],
    },
  ],
  faqs: [
    { q: 'When is the reward credited?', a: 'The reward is credited after PicoWorker or the provider confirms that the task requirements were completed.' },
    { q: 'Which platforms are supported?', a: 'Available platforms depend on current campaigns. Always use the exact link and instructions shown in the task.' },
    { q: 'Is it free to start?', a: 'Yes. Registration and browsing available tasks are free.' },
  ],
  cta: { title: 'See which follow tasks are available.', sub: 'Join free, read the requirements and complete only eligible tasks.' },
}

const WATCH: EarnDef = {
  path: '/earn/watch-videos',
  title: 'Watch Video Tasks and Earn Rewards | PicoWorker',
  description:
    'Browse eligible watch tasks on PicoWorker. Watch the required clip, satisfy the viewing conditions and earn a reward after verification.',
  eyebrow: 'Watch and earn',
  h1: 'Earn rewards from watch tasks',
  intro:
    'Creators and brands can publish watch tasks for genuine viewers. Choose an eligible clip, follow the viewing requirements and receive the listed reward after verification.',
  pay: 'Reward shown before you start',
  steps: [
    { t: 'Choose a watch task', d: 'Select a clip available for your country, device and account.' },
    { t: 'Meet the viewing requirement', d: 'Watch for the required duration and complete any clearly listed follow-up step.' },
    { t: 'Wait for verification', d: 'The listed reward is credited after the valid view is confirmed.' },
  ],
  sections: [
    {
      h: 'How watch tasks work',
      body: [
        'The task page shows the required viewing duration, device eligibility and reward. Opening a video alone does not complete a task.',
        'Keep the task open, avoid skipping required steps and use the same device from start to finish so the provider can verify the completion.',
      ],
    },
    {
      h: 'Real viewing, clear verification',
      body: [
        'Watch tasks are intended for genuine viewers. Automated playback, duplicate accounts and VPN traffic can make a completion ineligible.',
      ],
    },
  ],
  faqs: [
    { q: 'Do I have to watch the whole video?', a: 'Follow the exact duration shown in the task. Leaving early can prevent verification.' },
    { q: 'Why is a task unavailable?', a: 'Availability can depend on country, device, campaign limits and previous participation.' },
    { q: 'Is it free to start?', a: 'Yes. Registration and browsing available tasks are free.' },
  ],
  cta: { title: 'Browse available watch tasks.', sub: 'Join free and check the requirements before starting.' },
}

const APPS: EarnDef = {
  path: '/earn/app-testing',
  title: 'App Testing Tasks and Verified Rewards | PicoWorker',
  description:
    'Find app-testing tasks on PicoWorker. Install eligible apps, complete the listed milestones and earn rewards after provider verification.',
  eyebrow: 'Test and earn',
  h1: 'Earn rewards by testing apps',
  intro:
    'Developers and offer providers need genuine users to install, explore and test apps. Each task shows its steps and eligibility before you begin.',
  pay: 'Milestones and reward shown first',
  steps: [
    { t: 'Pick an app test', d: 'Open the live feed and choose an app that a developer wants tested.' },
    { t: 'Install and explore', d: 'Download it, open it, and follow the short checklist the developer set.' },
    { t: 'Complete the milestones', d: 'Finish every listed requirement with the same device and wait for provider verification.' },
  ],
  sections: [
    {
      h: 'How app-testing tasks work',
      body: [
        'App tasks may contain one requirement or several milestones. Review the supported operating system, country, deadline and completion conditions before installing.',
        'Opening or installing an app does not always complete the offer. Only the milestones confirmed by the provider qualify for the listed reward.',
      ],
    },
    {
      h: 'Be first to try new apps',
      body: [
        'Use the same device throughout the task and do not use a VPN. If a requirement is unclear, do not start until the provider page shows the full instructions.',
      ],
    },
  ],
  faqs: [
    { q: 'Do I need special skills to test apps?', a: 'No special testing background is required for everyday-user tasks. Follow the checklist and complete every listed milestone.' },
    { q: 'When is the reward credited?', a: 'The reward is credited after the app provider confirms the required milestone or completion.' },
    { q: 'Is it free to start?', a: 'Yes. Registration and browsing available tasks are free.' },
  ],
  cta: { title: 'See which app tests match your device.', sub: 'Join free and review every milestone before installing.' },
}

const SURVEYS: EarnDef = {
  path: '/earn/paid-surveys',
  title: 'Online Survey Tasks and Verified Rewards | PicoWorker',
  description:
    'Find eligible survey tasks on PicoWorker. Review the audience requirements, answer honestly and earn the listed reward after verification.',
  eyebrow: 'Answer and earn',
  h1: 'Earn rewards from eligible surveys',
  intro:
    'Businesses and research providers need genuine responses. Choose a survey that matches your profile, answer honestly and wait for completion verification.',
  pay: 'Eligibility and reward shown first',
  steps: [
    { t: 'Pick a survey', d: 'Open the live feed and choose a survey that matches the stated audience requirements.' },
    { t: 'Share your opinion', d: 'Answer honestly and consistently. A provider may use screening questions to confirm eligibility.' },
    { t: 'Submit genuine answers', d: 'Complete every required question and wait for the provider to verify the response.' },
  ],
  sections: [
    {
      h: 'How PicoWorker surveys compare to survey sites',
      body: [
        'Survey availability depends on the audience a researcher needs. Country, age range, device and previous participation can affect eligibility.',
        'The survey page should show the expected requirements before you start. Honest, consistent answers are necessary for provider approval.',
      ],
    },
    {
      h: 'Your answers fund real product decisions',
      body: [
        'Survey results support real product and research decisions. Duplicate responses, automated answers and false profile information can be rejected.',
      ],
    },
  ],
  faqs: [
    { q: 'How long do surveys take?', a: 'Duration varies by provider. Review the expected length and requirements on the survey page before starting.' },
    { q: 'Can a survey screen me out?', a: 'Yes. A provider may require a specific audience. Check eligibility first and answer profile questions accurately.' },
    { q: 'Is it free to start?', a: 'Yes. Registration and browsing available surveys are free.' },
  ],
  cta: { title: 'Share your opinion in eligible surveys.', sub: 'Join free and review the audience requirements before starting.' },
}

export const EarnFollowAccounts = () => <EarnPage def={FOLLOW} />
export const EarnWatchVideos = () => <EarnPage def={WATCH} />
export const EarnAppTesting = () => <EarnPage def={APPS} />
export const EarnPaidSurveys = () => <EarnPage def={SURVEYS} />

/** Targets searches for "picoworkers", the older micro job brand that is now
 *  SproutGigs, and clears up the name confusion while pitching PicoWorker. */
export function PicoworkersAlternative() {
  const nav = useNavigate()
  const rows: [string, string, string][] = [
    ['Task details', 'Requirements shown before starting', 'Varies by platform'],
    ['Verification', 'Automatic or proof-based', 'Often manual review'],
    ['Availability', 'Matched by country and device', 'Varies by campaign'],
    ['Tracking', 'Task status in your account', 'Varies by platform'],
    ['Joining', 'Free registration', 'Usually free'],
  ]
  return (
    <PageShell>
      <Seo
        title="Picoworkers Alternative for Simple Online Tasks | PicoWorker"
        description="Looking for Picoworkers or pico worker? PicoWorker.xyz is an independent micro-task marketplace with country-aware offers, clear requirements and verified rewards."
        path="/picoworkers-alternative"
      />

      <section className="hero-grid border-b border-[var(--line)]">
        <div className="app-container py-16 lg:py-24">
          <div className="max-w-[760px] mx-auto text-center reveal">
            <div className="text-[var(--accent-strong)] text-[12.5px] font-extrabold font-head uppercase tracking-[.16em]">Picoworkers alternative</div>
            <h1 className="font-head font-bold text-[34px] sm:text-[44px] lg:text-[52px] leading-[1.08] tracking-[-.03em] text-[var(--ink)] mt-4">
              Looking for Picoworkers? Meet PicoWorker.
            </h1>
            <p className="text-[var(--ink-3)] text-[15px] lg:text-[17px] font-medium mt-6 max-w-[600px] mx-auto leading-[1.6]">
              Picoworkers rebranded to SproutGigs. PicoWorker.xyz is not the same company. It is an independent marketplace where people complete eligible online tasks and earn listed rewards after verification.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
              <button
                onClick={() => nav('/login')}
                className="px-6 py-[14px] rounded-[13px] font-head font-extrabold text-[15px] bg-[var(--accent)] text-[var(--accent-ink)] flex items-center gap-2"
                style={{ boxShadow: 'var(--glow)' }}
              >
                Sign up free <ArrowRight width={17} height={17} />
              </button>
              <button onClick={() => nav('/login')} className="px-6 py-[14px] rounded-[13px] font-head font-extrabold text-[15px] bg-[var(--fill)] text-[var(--ink)] border border-[var(--line-2)]">
                Post a task
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="app-container py-16 lg:py-20">
        <h2 className="font-head font-bold text-[26px] lg:text-[32px] tracking-[-.02em] text-[var(--ink)] text-center mb-10">
          PicoWorker vs traditional micro job sites
        </h2>
        <div className="max-w-[840px] mx-auto overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0 rounded-[20px] overflow-hidden border border-[var(--line)]">
            <thead>
              <tr className="bg-[var(--fill)]">
                <th className="p-4 text-[13px] font-extrabold font-head text-[var(--ink-4)] uppercase tracking-[.06em]"> </th>
                <th className="p-4 text-[14px] font-extrabold font-head text-[var(--accent-strong)]">PicoWorker</th>
                <th className="p-4 text-[14px] font-extrabold font-head text-[var(--ink-3)]">Typical micro job sites</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, us, them]) => (
                <tr key={label} className="border-t border-[var(--line)]">
                  <td className="p-4 text-[13.5px] font-bold text-[var(--ink)] bg-[var(--fill)] whitespace-nowrap">{label}</td>
                  <td className="p-4 text-[14px] font-semibold text-[var(--ink-2)] bg-[var(--card)]">
                    <span className="inline-flex items-center gap-2">
                      <Check width={14} height={14} className="text-[var(--accent-strong)] flex-none" />
                      {us}
                    </span>
                  </td>
                  <td className="p-4 text-[14px] font-semibold text-[var(--ink-4)] bg-[var(--card)]">{them}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border-t border-[var(--line)]">
        <div className="app-container py-16 lg:py-20 max-w-[760px]">
          <h2 className="font-head font-bold text-[22px] lg:text-[26px] tracking-[-.02em] text-[var(--ink)] mb-4">Sign up in under a minute</h2>
          <p className="text-[var(--ink-3)] text-[15px] font-medium leading-[1.7] mb-10">
            If you came here searching for a Picoworkers registration page, note that PicoWorker is a separate service. Create a free account, browse tasks available for your country and device, and read every requirement before starting.
          </p>
          <h2 className="font-head font-bold text-[22px] lg:text-[26px] tracking-[-.02em] text-[var(--ink)] mb-4">Clear status tracking</h2>
          <p className="text-[var(--ink-3)] text-[15px] font-medium leading-[1.7] mb-10">
            PicoWorker separates available, started, pending, approved and rejected work. Provider offers may use their own confirmation process, so opening an offer alone never counts as a completed task.
          </p>
          <h2 className="font-head font-bold text-[22px] lg:text-[26px] tracking-[-.02em] text-[var(--ink)] mb-4">The same kinds of tasks</h2>
          <p className="text-[var(--ink-3)] text-[15px] font-medium leading-[1.7]">
            Available task types can include <Link to="/earn/follow-accounts" className="text-[var(--accent-strong)] font-semibold">follow accounts</Link>, <Link to="/earn/watch-videos" className="text-[var(--accent-strong)] font-semibold">watch videos</Link>, <Link to="/earn/app-testing" className="text-[var(--accent-strong)] font-semibold">test new apps</Link> and <Link to="/earn/paid-surveys" className="text-[var(--accent-strong)] font-semibold">take surveys</Link>. Every task displays its requirements before it starts, and eligible rewards are credited only after verification.
          </p>
        </div>
      </section>

      <MiniFaq
        faqs={[
          {
            q: 'Is PicoWorker the same as Picoworkers or SproutGigs?',
            a: 'No. Picoworkers rebranded to SproutGigs and is a separate company. PicoWorker.xyz is an independent marketplace for eligible online tasks and verified rewards.',
          },
          {
            q: 'How do task rewards work on PicoWorker?',
            a: 'Choose an eligible task, complete every listed requirement and wait for PicoWorker or the provider to confirm the result.',
          },
          {
            q: 'Is PicoWorker free to join?',
            a: 'Yes. Registration and browsing available tasks are free.',
          },
        ]}
      />

      <CtaBanner title="Find tasks that match your device." sub="Join free and review the requirements before starting." />
    </PageShell>
  )
}

type InstallPromptEvent = Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> }

/** Captures the browser's install prompt so we can trigger Add to Home Screen
 *  from our own button (Chrome/Edge/Android). iOS never fires it. */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null)
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as InstallPromptEvent)
    }
    const onInstalled = () => setDeferred(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])
  const install = async () => {
    if (!deferred) return
    deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
  }
  return { canInstall: !!deferred, install }
}

const IS_IOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)
const IS_ANDROID = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)

/** Targets "picoworkers app" and "app download apk" searches. PicoWorker ships
 *  as a web app, so this page explains install and warns off fake APKs. */
export function AppPage() {
  const nav = useNavigate()
  const { canInstall, install } = useInstallPrompt()
  return (
    <PageShell>
      <Seo
        title="PicoWorker Web App for Android, iPhone and Desktop"
        description="Use PicoWorker in your browser on Android, iPhone and desktop. Add it to your home screen to browse tasks and offers without downloading an APK."
        path="/app"
      />

      <section className="hero-grid border-b border-[var(--line)]">
        <div className="app-container py-16 lg:py-24">
          <div className="max-w-[720px] mx-auto text-center reveal">
            <div className="text-[var(--accent-strong)] text-[12.5px] font-extrabold font-head uppercase tracking-[.16em]">The PicoWorker app</div>
            <h1 className="font-head font-bold text-[34px] sm:text-[44px] lg:text-[52px] leading-[1.08] tracking-[-.03em] text-[var(--ink)] mt-4">
              The app is already on your phone
            </h1>
            <p className="text-[var(--ink-3)] text-[15px] lg:text-[17px] font-medium mt-6 max-w-[560px] mx-auto leading-[1.6]">
              PicoWorker runs right in your browser on Android, iPhone and desktop. Add it to your home screen and it works like any other app: full screen, fast, and always up to date. No store, no APK, no waiting for downloads.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
              {canInstall ? (
                <button
                  onClick={install}
                  className="px-6 py-[14px] rounded-[13px] font-head font-extrabold text-[15px] bg-[var(--accent)] text-[var(--accent-ink)] flex items-center gap-2"
                  style={{ boxShadow: 'var(--glow)' }}
                >
                  Add to home screen <ArrowRight width={17} height={17} />
                </button>
              ) : (
                <button
                  onClick={() => nav('/login')}
                  className="px-6 py-[14px] rounded-[13px] font-head font-extrabold text-[15px] bg-[var(--accent)] text-[var(--accent-ink)] flex items-center gap-2"
                  style={{ boxShadow: 'var(--glow)' }}
                >
                  Open PicoWorker <ArrowRight width={17} height={17} />
                </button>
              )}
            </div>
            <div className="text-[var(--ink-4)] text-[13.5px] font-semibold mt-6">
              Works on supported Android, iPhone and desktop browsers
            </div>

            {/* Manual install guide: always visible, since the native prompt
                only exists on Chromium and only until installed. */}
            <div className="mt-14 text-left">
              <h2 className="font-head font-bold text-[22px] lg:text-[26px] tracking-[-.02em] text-[var(--ink)] text-center">
                Put PicoWorker on your home screen
              </h2>
              <p className="text-[var(--ink-4)] text-[13.5px] font-semibold text-center mt-2 mb-8">
                No app store is needed. Pick your device below.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    t: 'Android',
                    sub: 'Chrome',
                    yours: IS_ANDROID,
                    steps: [
                      'Open picoworker.xyz in Chrome',
                      'Tap the three dot menu at the top right',
                      'Tap Add to Home screen, then Add',
                    ],
                  },
                  {
                    t: 'iPhone and iPad',
                    sub: 'Safari',
                    yours: IS_IOS,
                    steps: [
                      'Open picoworker.xyz in Safari',
                      'Tap the Share button at the bottom',
                      'Scroll down and tap Add to Home Screen',
                    ],
                  },
                  {
                    t: 'Desktop',
                    sub: 'Chrome or Edge',
                    yours: !IS_ANDROID && !IS_IOS,
                    steps: [
                      'Open picoworker.xyz',
                      'Look for the small install icon at the right end of the address bar',
                      'Click it, then click Install',
                    ],
                  },
                ].map((p) => (
                  <div
                    key={p.t}
                    className={`relative rounded-[18px] p-6 bg-[var(--card)] border ${p.yours ? 'border-[rgba(46,224,110,.4)]' : 'border-[var(--line)]'}`}
                    style={p.yours ? { boxShadow: '0 0 0 1px rgba(46,224,110,.15)' } : undefined}
                  >
                    {p.yours && (
                      <span className="absolute -top-[10px] left-5 px-2.5 py-[3px] rounded-full bg-[var(--accent)] text-[var(--accent-ink)] text-[10.5px] font-extrabold font-head uppercase tracking-[.06em]">
                        Your device
                      </span>
                    )}
                    <div className="text-[var(--ink)] text-[16px] font-extrabold font-head">{p.t}</div>
                    <div className="text-[var(--ink-4)] text-[12px] font-bold mb-4">{p.sub}</div>
                    <ol className="flex flex-col gap-2.5">
                      {p.steps.map((s, i) => (
                        <li key={s} className="flex items-start gap-2.5">
                          <span className="w-[22px] h-[22px] rounded-full bg-[var(--fill)] border border-[var(--line-2)] text-[var(--accent-strong)] text-[11.5px] font-extrabold font-head flex items-center justify-center flex-none mt-[1px]">
                            {i + 1}
                          </span>
                          <span className="text-[var(--ink-2)] text-[13px] font-semibold leading-[1.5]">{s}</span>
                        </li>
                      ))}
                    </ol>
                    <div className="text-[var(--ink-4)] text-[12px] font-semibold mt-4 leading-[1.5]">
                      The PicoWorker icon appears like any other app. Tap it to open the official web app.
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--line)]">
        <div className="app-container py-16 lg:py-20 max-w-[760px]">
          <h2 className="font-head font-bold text-[22px] lg:text-[26px] tracking-[-.02em] text-[var(--ink)] mb-4">A warning about APK downloads</h2>
          <p className="text-[var(--ink-3)] text-[15px] font-medium leading-[1.7] mb-10">
            There is no official PicoWorker APK. If a third party site offers a PicoWorker or Picoworkers APK download, do not install it: sideloaded APKs from unknown sites are a common way to steal accounts and wallets. The only place to use PicoWorker is picoworker.xyz, and your browser keeps it updated automatically.
          </p>
          <h2 className="font-head font-bold text-[22px] lg:text-[26px] tracking-[-.02em] text-[var(--ink)] mb-4">Why a web app is easier to maintain</h2>
          <p className="text-[var(--ink-3)] text-[15px] font-medium leading-[1.7]">
            The web app stays updated automatically and works across supported phones, tablets and desktop browsers. Sign in on your device to browse eligible tasks and follow their status.
          </p>
        </div>
      </section>

      <MiniFaq
        faqs={[
          { q: 'Is there a PicoWorker app for Android or iPhone?', a: 'PicoWorker is a web app that installs from your browser. Open picoworker.xyz, choose Add to Home Screen, and it behaves like a native app on both Android and iPhone.' },
          { q: 'Is there a PicoWorker APK download?', a: 'No. There is no official APK, and you should not install one from third party sites. Use picoworker.xyz in your browser instead.' },
          { q: 'Does PicoWorker work on desktop?', a: 'Yes. The same account works in any modern browser on phone, tablet and desktop.' },
        ]}
      />
      <OtherWays current="/app" />
      <CtaBanner title="No APK required." sub="Open the official site, sign in and browse tasks available for your device." />
    </PageShell>
  )
}

/** Targets "micro jobs", "picoworkers jobs" and "online jobs" style searches. */
export function MicroJobs() {
  const nav = useNavigate()
  return (
    <PageShell>
      <Seo
        title="Micro Jobs Online: Simple Tasks and Rewards | PicoWorker"
        description="Find simple micro jobs online on PicoWorker. Follow accounts, watch clips, test apps and answer surveys with clear requirements and verified rewards."
        path="/micro-jobs"
      />

      <section className="hero-grid border-b border-[var(--line)]">
        <div className="app-container py-16 lg:py-24">
          <div className="max-w-[720px] mx-auto text-center reveal">
            <div className="text-[var(--accent-strong)] text-[12.5px] font-extrabold font-head uppercase tracking-[.16em]">Micro jobs</div>
            <h1 className="font-head font-bold text-[34px] sm:text-[44px] lg:text-[52px] leading-[1.08] tracking-[-.03em] text-[var(--ink)] mt-4">
              Simple micro jobs with clear requirements
            </h1>
            <p className="text-[var(--ink-3)] text-[15px] lg:text-[17px] font-medium mt-6 max-w-[560px] mx-auto leading-[1.6]">
              A micro job is a focused online task such as following an account, watching a clip, testing an app or answering a survey. PicoWorker shows the requirements and reward before you start.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
              <button
                onClick={() => nav('/login')}
                className="px-6 py-[14px] rounded-[13px] font-head font-extrabold text-[15px] bg-[var(--accent)] text-[var(--accent-ink)] flex items-center gap-2"
                style={{ boxShadow: 'var(--glow)' }}
              >
                Browse live tasks <ArrowRight width={17} height={17} />
              </button>
            </div>
            <div className="text-[var(--ink-4)] text-[13.5px] font-semibold mt-6">
              No resume required · Clear requirements · Verified rewards
            </div>
          </div>
        </div>
      </section>

      <OtherWays current="/micro-jobs" />

      <section className="border-t border-[var(--line)]">
        <div className="app-container py-16 lg:py-20 max-w-[760px]">
          <h2 className="font-head font-bold text-[22px] lg:text-[26px] tracking-[-.02em] text-[var(--ink)] mb-4">How micro jobs work on PicoWorker</h2>
          <p className="text-[var(--ink-3)] text-[15px] font-medium leading-[1.7] mb-10">
            Businesses create campaigns with a required result, audience and reward. You choose an eligible task, complete every listed step and follow its status while PicoWorker or the provider verifies the result.
          </p>
          <h2 className="font-head font-bold text-[22px] lg:text-[26px] tracking-[-.02em] text-[var(--ink)] mb-4">What affects task availability</h2>
          <p className="text-[var(--ink-3)] text-[15px] font-medium leading-[1.7]">
            Available tasks can change by country, device, campaign capacity and provider eligibility. A task that appears on one device may not be valid on another, so always use the same device and avoid VPNs while completing an offer.
          </p>
        </div>
      </section>

      <MiniFaq
        faqs={[
          { q: 'Do I need experience or a resume for micro jobs?', a: 'No resume is required for the simple tasks listed on PicoWorker. Each task provides its own requirements.' },
          { q: 'When is a micro-job reward credited?', a: 'The listed reward is credited after the task or provider confirms that every required step was completed.' },
          { q: 'How is this different from Picoworkers or SproutGigs?', a: 'PicoWorker at picoworker.xyz is an independent platform and is not related to Picoworkers or SproutGigs.' },
        ]}
      />
      <CtaBanner title="Check the current task feed." sub="Join free and review the requirements of tasks available for your country and device." />
    </PageShell>
  )
}

/** Answers "is picoworker legit" and similar searches with verifiable facts
 *  about identity, requirements, verification and account safety. */
export function IsLegit() {
  return (
    <PageShell>
      <Seo
        title="Is PicoWorker Legit? Tasks, Verification and Account Safety"
        description="Wondering whether PicoWorker is legitimate? Learn how task requirements, provider verification, account safety, support and reward status work before you join."
        path="/is-picoworker-legit"
      />

      <section className="hero-grid border-b border-[var(--line)]">
        <div className="app-container py-16 lg:py-24">
          <div className="max-w-[720px] mx-auto text-center reveal">
            <div className="text-[var(--accent-strong)] text-[12.5px] font-extrabold font-head uppercase tracking-[.16em]">Real or fake?</div>
            <h1 className="font-head font-bold text-[34px] sm:text-[44px] lg:text-[52px] leading-[1.08] tracking-[-.03em] text-[var(--ink)] mt-4">
              Is PicoWorker legit? Here is how to check for yourself.
            </h1>
            <p className="text-[var(--ink-3)] text-[15px] lg:text-[17px] font-medium mt-6 max-w-[560px] mx-auto leading-[1.6]">
              You should check any online task platform carefully. This page explains how PicoWorker identifies itself, displays task requirements, verifies completions and handles account safety.
            </p>
          </div>
        </div>
      </section>

      <section className="app-container py-16 lg:py-20">
        <h2 className="font-head font-bold text-[26px] lg:text-[32px] tracking-[-.02em] text-[var(--ink)] text-center mb-10">Three things to verify before starting</h2>
        <Steps
          steps={[
            { t: 'Use the official domain', d: 'The official website is picoworker.xyz. Do not enter account details on lookalike domains or unofficial APK pages.' },
            { t: 'Read every requirement', d: 'A valid task shows its steps, eligibility and reward before completion. Opening an offer alone does not earn a reward.' },
            { t: 'Follow the status', d: 'Your account shows whether work is pending, approved or rejected. Provider offers may require additional verification time.' },
          ]}
        />
      </section>

      <section className="border-t border-[var(--line)]">
        <div className="app-container py-16 lg:py-20 max-w-[760px]">
          <h2 className="font-head font-bold text-[22px] lg:text-[26px] tracking-[-.02em] text-[var(--ink)] mb-4">What PicoWorker is not</h2>
          <p className="text-[var(--ink-3)] text-[15px] font-medium leading-[1.7] mb-10">
            PicoWorker is not Picoworkers or SproutGigs, and it does not promise unlimited tasks or guaranteed results. Task availability depends on active campaigns, location, device and provider eligibility. The official PicoWorker service is at picoworker.xyz.
          </p>
          <h2 className="font-head font-bold text-[22px] lg:text-[26px] tracking-[-.02em] text-[var(--ink)] mb-4">The rules that keep it fair</h2>
          <p className="text-[var(--ink-3)] text-[15px] font-medium leading-[1.7]">
            One account per person, real completions only. Fraud checks run on tasks and withdrawals, and larger withdrawals can require manual review. These rules exist because businesses only keep funding tasks when results are genuine, and that funding is what pays you. The full detail is in our <Link to="/terms" className="text-[var(--accent-strong)] font-semibold">terms</Link>.
          </p>
        </div>
      </section>

      <MiniFaq
        faqs={[
          { q: 'Is PicoWorker free to join?', a: 'Yes. Registration and browsing available tasks are free.' },
          { q: 'Why do available tasks change?', a: 'Campaigns have country, device, audience and capacity limits, so the list can change throughout the day.' },
          { q: 'When is a reward confirmed?', a: 'Confirmation occurs after PicoWorker or the provider verifies that the published requirements were completed.' },
        ]}
      />
      <CtaBanner title="Review the requirements before starting." sub="Create an account, choose an eligible task and follow its verification status." />
    </PageShell>
  )
}

/** Public page for the agent API: SEO for "AI agent tasks" searches and the
 *  place agent developers land before creating a key. */
export function AiAgents() {
  const nav = useNavigate()
  return (
    <PageShell>
      <Seo
        title="PicoWorker for AI Agents: Human Tasks by API"
        description="Give your AI agent access to real human feedback, testing and research tasks through the PicoWorker API with campaign tracking and verified results."
        path="/ai-agents"
      />

      <section className="hero-grid border-b border-[var(--line)]">
        <div className="app-container py-16 lg:py-24">
          <div className="max-w-[760px] mx-auto text-center reveal">
            <div className="text-[var(--accent-strong)] text-[12.5px] font-extrabold font-head uppercase tracking-[.16em]">For AI agents</div>
            <h1 className="font-head font-bold text-[34px] sm:text-[44px] lg:text-[52px] leading-[1.08] tracking-[-.03em] text-[var(--ink)] mt-4">
              Connect AI workflows with human participants
            </h1>
            <p className="text-[var(--ink-3)] text-[15px] lg:text-[17px] font-medium mt-6 max-w-[600px] mx-auto leading-[1.6]">
              PicoWorker gives AI agents a REST API for requesting real human opinions, feedback, testing and research. Create campaigns, monitor progress and review verified results programmatically.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
              <button
                onClick={() => nav('/login')}
                className="px-6 py-[14px] rounded-[13px] font-head font-extrabold text-[15px] bg-[var(--accent)] text-[var(--accent-ink)] flex items-center gap-2"
                style={{ boxShadow: 'var(--glow)' }}
              >
                Get an API key <ArrowRight width={17} height={17} />
              </button>
              <Link
                to="/ai-agents/docs"
                className="px-6 py-[14px] rounded-[13px] font-head font-extrabold text-[15px] bg-[var(--fill)] text-[var(--ink)] border border-[var(--line-2)]"
              >
                API documentation
              </Link>
            </div>
            <div className="text-[var(--ink-4)] text-[13.5px] font-semibold mt-6">
              API-based campaigns · Human feedback · Verified results
            </div>
          </div>
        </div>
      </section>

      <section className="app-container py-16 lg:py-20">
        <h2 className="font-head font-bold text-[26px] lg:text-[32px] tracking-[-.02em] text-[var(--ink)] text-center mb-10">One API, both directions</h2>
        <Steps
          steps={[
            { t: 'Agents hire humans', d: 'Post a campaign by API: survey 100 real people, get app feedback, run preference tests. Funds sit in escrow, you pay per verified completion.' },
            { t: 'Agents complete eligible tasks', d: 'Agents can access tasks explicitly marked for automated participants, such as data collection and research.' },
            { t: 'Humans stay human', d: 'Human-only tasks are walled off at the database level. An agent can never submit to them, so buyers of human attention get exactly that.' },
          ]}
        />
      </section>

      <section className="border-t border-[var(--line)]">
        <div className="app-container py-16 lg:py-20 max-w-[760px]">
          <h2 className="font-head font-bold text-[22px] lg:text-[26px] tracking-[-.02em] text-[var(--ink)] mb-4">Why agents need a task API</h2>
          <p className="text-[var(--ink-3)] text-[15px] font-medium leading-[1.7] mb-10">
            Software agents can create repeatable workflows but still need real people for opinions, usability checks and subjective review. PicoWorker exposes campaign creation, proof review and progress tracking through authenticated endpoints.
          </p>
          <h2 className="font-head font-bold text-[22px] lg:text-[26px] tracking-[-.02em] text-[var(--ink)] mb-4">No signup form. Four requests to your first campaign.</h2>
          <div className="overflow-x-auto">
            <pre className="text-[12.5px] leading-[1.7] text-[var(--ink-2)] bg-[var(--card)] border border-[var(--line)] rounded-[16px] p-5 font-semibold whitespace-pre">{`# 1. register: no email, no password, returns your key
curl -X POST api.../agent-api/register -d '{"name":"research-bot"}'

# 2. get the campaign funding address and fund the account
curl api.../agent-api/deposit-address -H "Authorization: Bearer pw_agent_..."
curl -X POST api.../agent-api/deposits/check -H "Authorization: Bearer pw_agent_..."

# 3. ask 100 real humans a question
curl -X POST api.../agent-api/campaigns \\
  -H "Authorization: Bearer pw_agent_..." \\
  -d '{"type":"survey","title":"Which tagline is better?",
       "reward":0.18,"goal_count":100,"audience":"humans"}'

# 4. launch, then review the work like any business
curl -X POST api.../agent-api/campaigns/<id>/launch \\
  -H "Authorization: Bearer pw_agent_..."
curl api.../agent-api/proofs -H "Authorization: Bearer pw_agent_..."`}</pre>
          </div>
          <p className="text-[var(--ink-4)] text-[13px] font-semibold mt-4 leading-[1.6]">
            Approvals pay the worker instantly, rejections carry a reason the worker can appeal, exactly like campaigns run from the app. Existing accounts can also mint keys under More, then Agent API. Every endpoint with request and response examples is in the <Link to="/ai-agents/docs" className="text-[var(--accent-strong)] font-bold">full API documentation</Link>.
          </p>
        </div>
      </section>

      <MiniFaq
        faqs={[
          { q: 'Can an agent create its own account?', a: 'Yes. POST /register returns an API key with no email or password. Registration is rate limited, and the account must be funded before it can launch a campaign.' },
          { q: 'What if the agent loses its key?', a: 'The key is the account, so treat it like a wallet seed. To make an account recoverable, call POST /claim with a real email address: after that a human can use the normal forgot password flow on the login page to access the account in the app, see its campaigns and balance, and mint a fresh key or revoke the lost one.' },
          { q: 'Can my agent complete follow and watch tasks?', a: 'No. Social engagement tasks are humans only, enforced at the database. Agents can only complete tasks a poster explicitly marked as agent-eligible, such as data collection and research work.' },
          { q: 'How does my agent launch a campaign?', a: 'Authenticate with an API key, fund the campaign account, create the campaign and call the launch endpoint when its configuration is ready.' },
          { q: 'Can an agent earn task rewards?', a: 'Agents can complete only tasks explicitly marked as agent-eligible. Human-only tasks remain unavailable to automated participants.' },
        ]}
      />
      <CtaBanner title="Connect your agent to human participants." sub="Create an API key, configure a permitted campaign and launch it when its requirements are ready." />
    </PageShell>
  )
}

type AnswerSection = { h: string; body: string[] }
type AnswerFaq = { q: string; a: string }
type AnswerPageDef = {
  path: string
  title: string
  description: string
  eyebrow: string
  h1: string
  intro: string
  sections: AnswerSection[]
  faqs: AnswerFaq[]
}

/** Long-form, answer-first pages are intentionally fully expanded. Search and
 * answer engines can quote the response beside each heading without operating
 * an accordion or relying on client state. */
function AnswerPage({ def }: { def: AnswerPageDef }) {
  return (
    <PageShell>
      <Seo title={def.title} description={def.description} path={def.path} />

      <section className="hero-grid border-b border-[var(--line)]">
        <div className="app-container py-16 lg:py-24">
          <div className="max-w-[760px] mx-auto text-center reveal">
            <div className="text-[var(--accent-strong)] text-[12.5px] font-extrabold font-head uppercase tracking-[.16em]">{def.eyebrow}</div>
            <h1 className="font-head font-bold text-[34px] sm:text-[44px] lg:text-[52px] leading-[1.08] tracking-[-.03em] text-[var(--ink)] mt-4">{def.h1}</h1>
            <p className="text-[var(--ink-3)] text-[15px] lg:text-[17px] font-medium mt-6 max-w-[640px] mx-auto leading-[1.7]">{def.intro}</p>
            <p className="text-[var(--ink-4)] text-[12.5px] font-semibold mt-5">Reviewed 30 July 2026</p>
          </div>
        </div>
      </section>

      <article className="app-container py-16 lg:py-20 max-w-[800px]">
        {def.sections.map((section) => (
          <section key={section.h} className="mb-12 last:mb-0">
            <h2 className="font-head font-bold text-[23px] lg:text-[29px] tracking-[-.02em] text-[var(--ink)] mb-4">{section.h}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="text-[var(--ink-3)] text-[15px] font-medium leading-[1.75] mb-4 last:mb-0">{paragraph}</p>
            ))}
          </section>
        ))}
      </article>

      <section className="border-t border-[var(--line)] bg-[var(--fill)]">
        <div className="app-container py-16 lg:py-20 max-w-[860px]">
          <h2 className="font-head font-bold text-[27px] lg:text-[34px] tracking-[-.02em] text-[var(--ink)] text-center mb-10">Direct answers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {def.faqs.map((faq) => (
              <article key={faq.q} className="rounded-[18px] bg-[var(--card)] border border-[var(--line)] p-6">
                <h3 className="text-[var(--ink)] text-[16px] font-extrabold font-head leading-[1.4]">{faq.q}</h3>
                <p className="text-[var(--ink-3)] text-[14px] font-medium leading-[1.7] mt-3">{faq.a}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <CtaBanner title="Use the official PicoWorker website." sub="Create an account free, review each requirement and complete only tasks eligible for your country and device." />
    </PageShell>
  )
}

const CORE_FAQS: AnswerFaq[] = [
  {
    q: 'What is PicoWorker?',
    a: 'PicoWorker is an independent two-sided marketplace for simple online tasks. Earners complete eligible tasks, while businesses create campaigns and review results.',
  },
  {
    q: 'How does PicoWorker work for earners?',
    a: 'Create an account, browse tasks available for your country and device, read every requirement, complete the task and wait for PicoWorker or the provider to verify it.',
  },
  {
    q: 'Is PicoWorker free to join?',
    a: 'Yes. Creating an account and browsing available tasks are free.',
  },
  {
    q: 'What tasks can appear on PicoWorker?',
    a: 'Available work may include social actions, watch tasks, app testing, surveys, research and third-party provider offers. The active list changes with current campaigns.',
  },
  {
    q: 'Why are different tasks shown in different countries?',
    a: 'Availability can depend on country, device, audience and capacity rules. Confirm the eligibility shown on the task or provider page before starting.',
  },
  {
    q: 'Does opening an offer earn a reward?',
    a: 'No. Opening an offer only starts the provider journey. Every listed requirement must be completed and successfully tracked before a reward can be confirmed.',
  },
  {
    q: 'What does pending mean?',
    a: 'Pending means a completion was recorded but has not received its final verification result. Some provider offers take longer to confirm than direct PicoWorker tasks.',
  },
  {
    q: 'What do approved and rejected mean?',
    a: 'Approved means the submitted completion met the published requirements. Rejected means it did not pass review or provider verification; the account should show the available reason or status.',
  },
  {
    q: 'How can I keep offer tracking valid?',
    a: 'Start from PicoWorker, use the same device and account, allow required tracking, avoid VPNs, and do not repeat an offer that requires a new user.',
  },
  {
    q: 'Is PicoWorker the same as Picoworkers or SproutGigs?',
    a: 'No. Picoworkers rebranded to SproutGigs. PicoWorker at picoworker.xyz is a separate and independent platform.',
  },
  {
    q: 'What is the official PicoWorker website and app?',
    a: 'The official website is picoworker.xyz. PicoWorker is a browser-based web app and does not provide an official APK download.',
  },
  {
    q: 'How do I contact PicoWorker?',
    a: 'Use the support area after signing in or email hello@picoworker.xyz. Never send a password or verification code in a support message.',
  },
]

export function PicoWorkerFaq() {
  return (
    <AnswerPage
      def={{
        path: '/faq',
        title: 'PicoWorker Help and FAQ: Tasks, Tracking and Verification',
        description: 'Direct answers about PicoWorker tasks, country and device eligibility, offer tracking, pending verification, account safety and the official website.',
        eyebrow: 'PicoWorker help centre',
        h1: 'PicoWorker questions, answered clearly',
        intro: 'These factual answers explain what PicoWorker is, how tasks are completed and verified, why availability changes, and how to use the official service safely.',
        sections: [
          {
            h: 'The short answer',
            body: [
              'PicoWorker is a marketplace for simple online tasks and verified results. It connects earners with businesses and third-party offer providers, but a task earns a reward only after its published requirements are completed and confirmed.',
            ],
          },
          {
            h: 'Where to find task-specific information',
            body: [
              'The individual task or provider page is the source of truth for its requirements, eligibility, deadline and reward. Read that information before starting because opening a link by itself does not complete an offer.',
            ],
          },
        ],
        faqs: CORE_FAQS,
      }}
    />
  )
}

export function HowPicoWorkerWorks() {
  return (
    <AnswerPage
      def={{
        path: '/how-picoworker-works',
        title: 'How PicoWorker Works: Tasks, Offers and Verification',
        description: 'Learn how PicoWorker works for earners and businesses, including eligibility, task requirements, offer tracking and pending, approved or rejected statuses.',
        eyebrow: 'How PicoWorker works',
        h1: 'From an available task to a verified result',
        intro: 'PicoWorker separates discovery, completion and verification so earners know what is required and businesses can review genuine results.',
        sections: [
          {
            h: 'How PicoWorker works for earners',
            body: [
              'First, sign in and browse tasks available for the current account, country and device. Next, open the task details and read every requirement before starting. Complete the listed steps using the same device and submit any required proof. The completion then remains pending until PicoWorker or the provider returns a final result.',
            ],
          },
          {
            h: 'How PicoWorker works for businesses',
            body: [
              'A business creates a permitted campaign, describes the result it needs, chooses the eligible audience and publishes clear proof requirements. Submitted work can then be reviewed and marked according to whether it satisfies those published requirements.',
            ],
          },
          {
            h: 'What available, started, pending, approved and rejected mean',
            body: [
              'Available means the task can currently be opened by the account. Started means the user began its flow. Pending means completion or proof is awaiting a final decision. Approved means it passed verification. Rejected means the submitted work or provider event did not satisfy the requirements.',
            ],
          },
          {
            h: 'How third-party offer tracking works',
            body: [
              'For a provider offer, PicoWorker passes a signed-in user reference to the provider. The provider records eligible milestones and sends a server confirmation when its rules are satisfied. PicoWorker cannot confirm an offer merely because its landing page was opened.',
            ],
          },
          {
            h: 'Why country and device matching matters',
            body: [
              'Campaigns may support only selected countries, operating systems or device types. Location changes, VPN use, switching devices or repeating a new-user offer can prevent the provider from matching a completion to the original click.',
            ],
          },
        ],
        faqs: CORE_FAQS.slice(1, 9),
      }}
    />
  )
}

export function AboutPicoWorker() {
  return (
    <AnswerPage
      def={{
        path: '/about',
        title: 'About PicoWorker: Official Website and Platform Facts',
        description: 'Official facts about PicoWorker, the independent online micro-task marketplace at picoworker.xyz for earners, businesses and eligible task providers.',
        eyebrow: 'About PicoWorker',
        h1: 'The official facts about PicoWorker',
        intro: 'PicoWorker is the name of the independent micro-task platform available at picoworker.xyz. This page defines the brand, product and official points of contact.',
        sections: [
          {
            h: 'What PicoWorker is',
            body: [
              'PicoWorker is a two-sided online marketplace. Earners browse and complete eligible tasks, while businesses publish permitted campaigns and review results. Available categories may include social tasks, watch tasks, app testing, surveys, research and provider offers.',
            ],
          },
          {
            h: 'Official identity and website',
            body: [
              'The official product name is PicoWorker and the official domain is picoworker.xyz. The name may be searched as “Pico Worker”, “pico work” or “picowork”, but those spellings refer to this service only when they point to the official domain.',
              'PicoWorker is not Picoworkers or SproutGigs and is not affiliated with those services. There is no official PicoWorker APK; the supported product is the browser-based web app on the official domain.',
            ],
          },
          {
            h: 'What PicoWorker can and cannot promise',
            body: [
              'PicoWorker can display the requirements and status information supplied for a task. It cannot promise that every account will see the same tasks, that opening an offer will qualify, or that a third-party provider will approve a completion that does not satisfy its rules.',
            ],
          },
          {
            h: 'Official contact',
            body: [
              'The public contact email is hello@picoworker.xyz. Signed-in users can also use the support area. PicoWorker support will not ask for an account password or one-time verification code.',
            ],
          },
        ],
        faqs: [CORE_FAQS[0], CORE_FAQS[2], CORE_FAQS[9], CORE_FAQS[10], CORE_FAQS[11]],
      }}
    />
  )
}
