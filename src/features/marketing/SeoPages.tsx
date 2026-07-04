import { useEffect } from 'react'
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
    ['/app', 'Get the app'],
    ['/is-picoworker-legit', 'Is PicoWorker legit?'],
    ['/picoworkers-alternative', 'Picoworkers alternative'],
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

function PageShell({ children }: { children: ReactNode }) {
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
    { to: '/earn/follow-accounts', icon: <XLogo width={18} height={18} className="text-[#fff]" />, bg: '#000000', t: 'Follow accounts', p: 'from $0.04' },
    { to: '/earn/watch-videos', icon: <Play width={20} height={20} className="text-[#fff]" />, bg: '#FF0033', t: 'Watch videos', p: 'from $0.02' },
    { to: '/earn/app-testing', icon: <Bolt width={18} height={18} className="text-[#fff]" />, bg: '#5B8DEF', t: 'Test apps', p: 'up to $0.35' },
    { to: '/earn/paid-surveys', icon: <ListIcon width={18} height={18} className="text-[#fff]" />, bg: '#26A17B', t: 'Take surveys', p: 'up to $0.20' },
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
              Always free to join · Instant USDC on Solana · Cash out anytime
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
  title: 'Get Paid to Follow Accounts | Earn Instant USDC | PicoWorker',
  description:
    'Follow accounts on X, Instagram and TikTok and earn instant USDC. Follow tasks pay from $0.04, verify in about 10 seconds and pay straight to your wallet. Free to join.',
  eyebrow: 'Follow and earn',
  h1: 'Get paid to follow accounts',
  intro:
    'Businesses on PicoWorker pay real people to follow their accounts on X, Instagram and TikTok. You tap follow, the task verifies itself in about 10 seconds, and USDC lands in your wallet instantly.',
  pay: 'from $0.04 per follow',
  steps: [
    { t: 'Pick a follow task', d: 'Open the live feed and choose an account that a business wants followers for.' },
    { t: 'Tap follow', d: 'The task opens the profile for you. Follow it like you would any other account.' },
    { t: 'Get paid instantly', d: 'Verification runs automatically and your USDC reward is credited on the spot.' },
  ],
  sections: [
    {
      h: 'How much can you earn following accounts?',
      body: [
        'Follow tasks start at $0.04 each and take a few seconds, so they are the quickest way to stack up small wins during the day. Levels and streaks unlock up to 2x higher payouts as you stay active, and you also earn 10 percent of everything the people you refer earn, for life.',
        'Because every reward is paid in USDC, a dollar earned is a dollar you keep. There are no points to convert, no gift cards, and no waiting for a monthly payout run.',
      ],
    },
    {
      h: 'Real accounts, real followers',
      body: [
        'Every follow on PicoWorker comes from a verified human account, which is why businesses fund these tasks in the first place. That also protects you as an earner: tasks verify automatically, rewards are guaranteed by escrow, and PicoWorker is non-custodial, so the USDC you earn sits in a wallet only you control.',
      ],
    },
  ],
  faqs: [
    { q: 'How fast do follow tasks pay?', a: 'Most follow tasks verify automatically in about 10 seconds, and the USDC reward is credited to your balance the moment verification passes.' },
    { q: 'Which platforms can I earn on?', a: 'Businesses post follow, like and share tasks for X, Instagram and TikTok. New task types are added regularly.' },
    { q: 'Is it free to start?', a: 'Yes. Joining PicoWorker costs nothing, and your very first task comes with a $0.05 welcome bonus.' },
  ],
  cta: { title: 'Your first follow could pay in the next minute.', sub: 'Joining is free, and your very first task comes with a $0.05 welcome bonus.' },
}

const WATCH: EarnDef = {
  path: '/earn/watch-videos',
  title: 'Get Paid to Watch Videos | Earn USDC Watching Clips | PicoWorker',
  description:
    'Watch short videos and ads and earn instant USDC. Watch tasks pay from $0.02 per clip, verify automatically and pay straight to your wallet. Free to join PicoWorker.',
  eyebrow: 'Watch and earn',
  h1: 'Get paid to watch videos',
  intro:
    'Creators and brands on PicoWorker pay for real viewers. You watch a short video or ad through to the end, the task verifies itself, and USDC lands in your wallet instantly.',
  pay: 'from $0.02 per video',
  steps: [
    { t: 'Pick a watch task', d: 'Open the live feed and choose a clip. Most are under a minute long.' },
    { t: 'Watch to the end', d: 'Sit back and let it play through. No quizzes, no forms, no tricks.' },
    { t: 'Get paid instantly', d: 'Verification confirms the view and your USDC reward is credited on the spot.' },
  ],
  sections: [
    {
      h: 'How much can you earn watching videos?',
      body: [
        'Watch tasks start at $0.02 per clip and most take under a minute, which makes them perfect for queues, commutes and ad breaks in your own viewing. Levels and streaks unlock up to 2x higher payouts, and referrals add 10 percent of everything your invitees earn.',
        'Rewards are paid in USDC, a stablecoin pegged to the dollar, so what you earn is what you cash out. Withdrawals arrive in seconds and cost a fraction of a cent.',
      ],
    },
    {
      h: 'Why brands pay for views',
      body: [
        'Videos rank better and convert better when real people watch them all the way through. Businesses fund watch campaigns in USDC held in escrow and pay only for verified complete views, which is why the money reaches you instantly once your view is confirmed.',
      ],
    },
  ],
  faqs: [
    { q: 'Do I have to watch the whole video?', a: 'Yes. The task verifies a complete view, then pays your USDC reward instantly. Most clips are 30 to 60 seconds.' },
    { q: 'How do I cash out?', a: 'Withdraw to any Solana wallet, or to Base and other networks. Withdrawals arrive in seconds for a fraction of a cent.' },
    { q: 'Is it free to start?', a: 'Yes. Joining PicoWorker costs nothing, and your very first task comes with a $0.05 welcome bonus.' },
  ],
  cta: { title: 'Turn watch time into wallet time.', sub: 'Joining is free, and your very first task comes with a $0.05 welcome bonus.' },
}

const APPS: EarnDef = {
  path: '/earn/app-testing',
  title: 'Get Paid to Test Apps | App Testing Jobs in USDC | PicoWorker',
  description:
    'Test brand new apps and earn instant USDC. App test tasks pay up to $0.35, take a few minutes and pay straight to your wallet. Free to join PicoWorker.',
  eyebrow: 'Test and earn',
  h1: 'Get paid to test apps',
  intro:
    'Developers on PicoWorker pay real users to install and try their new apps. You download, explore for a few minutes, and USDC lands in your wallet once your test is verified.',
  pay: 'up to $0.35 per test',
  steps: [
    { t: 'Pick an app test', d: 'Open the live feed and choose an app that a developer wants tested.' },
    { t: 'Install and explore', d: 'Download it, open it, and follow the short checklist the developer set.' },
    { t: 'Get paid in USDC', d: 'Once the test is verified, your reward is credited straight to your balance.' },
  ],
  sections: [
    {
      h: 'How much do app tests pay?',
      body: [
        'App tests are among the best paid micro-tasks on PicoWorker at up to $0.35 each, because developers value genuine installs and honest first impressions. Levels and streaks unlock up to 2x higher payouts, and referrals add 10 percent of everything your invitees earn.',
        'You are paid in USDC the moment a test is verified. No points, no thresholds, no waiting for the end of the month.',
      ],
    },
    {
      h: 'Be first to try new apps',
      body: [
        'Beyond the payout, app testing means you get to try products before almost anyone else. Developers fund each campaign in USDC held in escrow, so the reward for every verified test is guaranteed before you even start.',
      ],
    },
  ],
  faqs: [
    { q: 'Do I need special skills to test apps?', a: 'No. Tasks are designed for everyday users. Install the app, use it for a few minutes and complete the short checklist.' },
    { q: 'When do I get paid?', a: 'The moment your test is verified, the USDC reward is credited to your balance. You can cash out to your own wallet any time.' },
    { q: 'Is it free to start?', a: 'Yes. Joining PicoWorker costs nothing, and your very first task comes with a $0.05 welcome bonus.' },
  ],
  cta: { title: 'Try something new, get paid for it.', sub: 'Joining is free, and your very first task comes with a $0.05 welcome bonus.' },
}

const SURVEYS: EarnDef = {
  path: '/earn/paid-surveys',
  title: 'Paid Surveys That Pay Instantly in USDC | PicoWorker',
  description:
    'Answer quick surveys and earn instant USDC. Surveys on PicoWorker pay up to $0.20, take a couple of minutes and pay straight to your wallet. Free to join.',
  eyebrow: 'Answer and earn',
  h1: 'Paid surveys that actually pay instantly',
  intro:
    'Businesses on PicoWorker pay for your opinion. You answer a few quick questions, the survey is verified, and USDC lands in your wallet instantly. No points, no gift cards, no payout thresholds.',
  pay: 'up to $0.20 per survey',
  steps: [
    { t: 'Pick a survey', d: 'Open the live feed and choose a survey. Most are just a handful of questions.' },
    { t: 'Share your opinion', d: 'Answer honestly. There are no trick questions and no endless screening.' },
    { t: 'Get paid in USDC', d: 'Once your responses are verified, the reward is credited straight to your balance.' },
  ],
  sections: [
    {
      h: 'How PicoWorker surveys compare to survey sites',
      body: [
        'Traditional survey sites pay in points, hold your earnings until you hit a threshold, and often screen you out after ten minutes of questions. Surveys on PicoWorker pay up to $0.20 in USDC, take a couple of minutes, and pay out the moment they are verified.',
        'Levels and streaks unlock up to 2x higher payouts as you stay active, and referrals add 10 percent of everything your invitees earn, for life.',
      ],
    },
    {
      h: 'Your answers fund real product decisions',
      body: [
        'The businesses posting surveys fund every campaign in USDC held in escrow and pay per verified response, which is why they only want genuine answers and why your reward is guaranteed before you start.',
      ],
    },
  ],
  faqs: [
    { q: 'How long do surveys take?', a: 'Most surveys are a handful of questions and take a couple of minutes. The reward and length are shown before you start.' },
    { q: 'Can I get screened out without pay?', a: 'Surveys on PicoWorker show the reward up front and pay per verified completed response. There are no long unpaid screeners.' },
    { q: 'Is it free to start?', a: 'Yes. Joining PicoWorker costs nothing, and your very first task comes with a $0.05 welcome bonus.' },
  ],
  cta: { title: 'Your opinion is worth real money.', sub: 'Joining is free, and your very first task comes with a $0.05 welcome bonus.' },
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
    ['Payment', 'USDC, a dollar stablecoin', 'Site balance or points'],
    ['Payout speed', 'Instant, the moment a task verifies', 'After review and approval windows'],
    ['Withdrawal', 'To your own wallet in seconds', 'Minimum thresholds, processing days'],
    ['Fees', 'A fraction of a cent per withdrawal', 'Varies by payout method'],
    ['Joining', 'Free, with a $0.05 welcome bonus', 'Free'],
  ]
  return (
    <PageShell>
      <Seo
        title="Picoworkers Alternative: PicoWorker Pays Instant USDC"
        description="Searched for Picoworkers or pico worker? PicoWorker.xyz is a different platform: a micro-task marketplace with instant USDC payouts, no thresholds and no waiting. Compare sign up, tasks and withdrawals."
        path="/picoworkers-alternative"
      />

      <section className="hero-grid border-b border-[var(--line)]">
        <div className="app-container py-16 lg:py-24">
          <div className="max-w-[760px] mx-auto text-center reveal">
            <div className="text-[var(--accent-strong)] text-[12.5px] font-extrabold font-head uppercase tracking-[.16em]">Picoworkers alternative</div>
            <h1 className="font-head font-bold text-[34px] sm:text-[44px] lg:text-[52px] leading-[1.08] tracking-[-.03em] text-[var(--ink)] mt-4">
              Looking for Picoworkers? Meet the instant payout alternative.
            </h1>
            <p className="text-[var(--ink-3)] text-[15px] lg:text-[17px] font-medium mt-6 max-w-[600px] mx-auto leading-[1.6]">
              Picoworkers was a popular micro job site that rebranded to SproutGigs. PicoWorker.xyz is not the same company. It is an independent micro-task marketplace where every task pays instantly in USDC, straight to a wallet you control.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
              <button
                onClick={() => nav('/login')}
                className="px-6 py-[14px] rounded-[13px] font-head font-extrabold text-[15px] bg-[var(--accent)] text-[var(--accent-ink)] flex items-center gap-2"
                style={{ boxShadow: 'var(--glow)' }}
              >
                Sign up free <ArrowRight width={17} height={17} />
              </button>
              <button onClick={() => nav('/business/signup')} className="px-6 py-[14px] rounded-[13px] font-head font-extrabold text-[15px] bg-[var(--fill)] text-[var(--ink)] border border-[var(--line-2)]">
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
            If you came here searching for a Picoworkers sign up or registration page, joining PicoWorker works the same way, just faster. Create a free account with your email or Google, pick a task from the live feed, and your first USDC arrives within minutes. New earners get a $0.05 welcome bonus on their first task.
          </p>
          <h2 className="font-head font-bold text-[22px] lg:text-[26px] tracking-[-.02em] text-[var(--ink)] mb-4">Withdrawals without the wait</h2>
          <p className="text-[var(--ink-3)] text-[15px] font-medium leading-[1.7] mb-10">
            Withdrawal delays are the most common complaint about classic micro job platforms. PicoWorker pays in USDC the moment a task is verified, and you can cash out to any Solana wallet, or to Base and other networks, in seconds for a fraction of a cent. PicoWorker is non-custodial: your keys, your USDC.
          </p>
          <h2 className="font-head font-bold text-[22px] lg:text-[26px] tracking-[-.02em] text-[var(--ink)] mb-4">The same kinds of tasks</h2>
          <p className="text-[var(--ink-3)] text-[15px] font-medium leading-[1.7]">
            Everything you would expect from a micro job site is here: <Link to="/earn/follow-accounts" className="text-[var(--accent-strong)] font-semibold">follow accounts</Link>, <Link to="/earn/watch-videos" className="text-[var(--accent-strong)] font-semibold">watch videos</Link>, <Link to="/earn/app-testing" className="text-[var(--accent-strong)] font-semibold">test new apps</Link> and <Link to="/earn/paid-surveys" className="text-[var(--accent-strong)] font-semibold">take quick surveys</Link>. Businesses fund every campaign in escrow before it goes live, so the reward on every task is guaranteed.
          </p>
        </div>
      </section>

      <MiniFaq
        faqs={[
          {
            q: 'Is PicoWorker the same as Picoworkers or SproutGigs?',
            a: 'No. Picoworkers rebranded to SproutGigs and is a separate company. PicoWorker.xyz is an independent micro-task marketplace that pays instantly in USDC. People sometimes type pico worker, pico work or picowork, but if you want small online tasks with instant crypto payouts, you are in the right place.',
          },
          {
            q: 'How do withdrawals work on PicoWorker?',
            a: 'You are paid in USDC the moment a task is verified. Cash out to any Solana wallet, or to Base and other networks, and withdrawals arrive in seconds for a fraction of a cent.',
          },
          {
            q: 'Is PicoWorker free to join?',
            a: 'Yes, completely. Signing up and earning never costs a thing, and new earners receive a $0.05 welcome bonus on their first task.',
          },
        ]}
      />

      <CtaBanner title="Skip the payout thresholds." sub="Join free, finish your first task in seconds and get paid in USDC on the spot." />
    </PageShell>
  )
}

/** Targets "picoworkers app" and "app download apk" searches. PicoWorker ships
 *  as a web app, so this page explains install and warns off fake APKs. */
export function AppPage() {
  const nav = useNavigate()
  return (
    <PageShell>
      <Seo
        title="PicoWorker App: Earn USDC on Your Phone, No APK Needed"
        description="The PicoWorker app runs right in your browser on Android, iPhone and desktop. Add it to your home screen and earn instant USDC for micro-tasks. No APK download, nothing to install from third party sites."
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
              <button
                onClick={() => nav('/login')}
                className="px-6 py-[14px] rounded-[13px] font-head font-extrabold text-[15px] bg-[var(--accent)] text-[var(--accent-ink)] flex items-center gap-2"
                style={{ boxShadow: 'var(--glow)' }}
              >
                Open PicoWorker <ArrowRight width={17} height={17} />
              </button>
            </div>
            <div className="text-[var(--ink-4)] text-[13.5px] font-semibold mt-6">
              Works on Android, iPhone and desktop · Always free
            </div>
          </div>
        </div>
      </section>

      <section className="app-container py-16 lg:py-20">
        <h2 className="font-head font-bold text-[26px] lg:text-[32px] tracking-[-.02em] text-[var(--ink)] text-center mb-10">Install it in three taps</h2>
        <Steps
          steps={[
            { t: 'Open picoworker.xyz', d: 'Visit the site in Chrome or Safari on your phone and sign in.' },
            { t: 'Add to home screen', d: 'In your browser menu choose Add to Home Screen. That is the whole install.' },
            { t: 'Earn like any app', d: 'Tap the icon any time, pick a task and get paid in USDC on the spot.' },
          ]}
        />
      </section>

      <section className="border-t border-[var(--line)]">
        <div className="app-container py-16 lg:py-20 max-w-[760px]">
          <h2 className="font-head font-bold text-[22px] lg:text-[26px] tracking-[-.02em] text-[var(--ink)] mb-4">A warning about APK downloads</h2>
          <p className="text-[var(--ink-3)] text-[15px] font-medium leading-[1.7] mb-10">
            There is no official PicoWorker APK. If a third party site offers a PicoWorker or Picoworkers APK download, do not install it: sideloaded APKs from unknown sites are a common way to steal accounts and wallets. The only place to use PicoWorker is picoworker.xyz, and your browser keeps it updated automatically.
          </p>
          <h2 className="font-head font-bold text-[22px] lg:text-[26px] tracking-[-.02em] text-[var(--ink)] mb-4">Why a web app is better for payouts</h2>
          <p className="text-[var(--ink-3)] text-[15px] font-medium leading-[1.7]">
            PicoWorker pays in USDC the moment a task is verified, and you withdraw to a wallet only you control. Running on the open web means you can check your balance and cash out from any device you sign in on, and nothing stands between you and your money.
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
      <CtaBanner title="No download. Just earnings." sub="Open the site, pick a task and your first USDC arrives in minutes." />
    </PageShell>
  )
}

/** Targets "micro jobs", "picoworkers jobs" and "online jobs" style searches. */
export function MicroJobs() {
  const nav = useNavigate()
  return (
    <PageShell>
      <Seo
        title="Micro Jobs Online: Small Tasks, Instant USDC Pay | PicoWorker"
        description="Find micro jobs online that pay instantly in USDC. Follow accounts, watch videos, test apps and take surveys on PicoWorker. No experience needed, free to join, cash out in seconds."
        path="/micro-jobs"
      />

      <section className="hero-grid border-b border-[var(--line)]">
        <div className="app-container py-16 lg:py-24">
          <div className="max-w-[720px] mx-auto text-center reveal">
            <div className="text-[var(--accent-strong)] text-[12.5px] font-extrabold font-head uppercase tracking-[.16em]">Micro jobs</div>
            <h1 className="font-head font-bold text-[34px] sm:text-[44px] lg:text-[52px] leading-[1.08] tracking-[-.03em] text-[var(--ink)] mt-4">
              Micro jobs that pay the second you finish
            </h1>
            <p className="text-[var(--ink-3)] text-[15px] lg:text-[17px] font-medium mt-6 max-w-[560px] mx-auto leading-[1.6]">
              A micro job is a small online task that takes seconds to a few minutes: follow an account, watch a video, test an app, answer a survey. On PicoWorker every one of them pays in USDC, instantly, with no minimum payout to reach.
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
              No experience needed · No interviews · Paid per task
            </div>
          </div>
        </div>
      </section>

      <OtherWays current="/micro-jobs" />

      <section className="border-t border-[var(--line)]">
        <div className="app-container py-16 lg:py-20 max-w-[760px]">
          <h2 className="font-head font-bold text-[22px] lg:text-[26px] tracking-[-.02em] text-[var(--ink)] mb-4">How micro jobs work on PicoWorker</h2>
          <p className="text-[var(--ink-3)] text-[15px] font-medium leading-[1.7] mb-10">
            Businesses fund campaigns in USDC and the budget sits in escrow before any task goes live, so the reward you see is guaranteed. You pick a task from the live feed, finish it in seconds, and most verify automatically in about 10 seconds. The moment verification passes, the USDC is yours.
          </p>
          <h2 className="font-head font-bold text-[22px] lg:text-[26px] tracking-[-.02em] text-[var(--ink)] mb-4">What micro jobs pay</h2>
          <p className="text-[var(--ink-3)] text-[15px] font-medium leading-[1.7]">
            Quick social tasks start at a few cents, watch tasks at $0.02, and app tests and surveys reach $0.35 or more. Levels and streaks unlock up to 2x higher payouts, referrals add 10 percent of everything your invitees earn, and there is a daily check in bonus on top. It will not replace a salary, but it turns dead time into real, withdrawable money.
          </p>
        </div>
      </section>

      <MiniFaq
        faqs={[
          { q: 'Do I need experience or a resume for micro jobs?', a: 'No. Micro jobs on PicoWorker are designed for anyone. There are no interviews and no applications; sign up free and start with any task in the feed.' },
          { q: 'How do micro jobs pay out?', a: 'In USDC, the moment a task is verified. Cash out to any Solana wallet, or to Base and other networks, in seconds for a fraction of a cent.' },
          { q: 'How is this different from Picoworkers or SproutGigs?', a: 'PicoWorker (picoworker.xyz) is an independent platform, not related to Picoworkers or SproutGigs. The big difference is payout speed: PicoWorker pays instantly in USDC with no minimum threshold.' },
        ]}
      />
      <CtaBanner title="The feed is live right now." sub="Join free, grab any task and get your first payout today." />
    </PageShell>
  )
}

/** Targets "is picoworker legit", "picoworkers real or fake" searches with a
 *  transparency page about how payouts and escrow actually work. */
export function IsLegit() {
  return (
    <PageShell>
      <Seo
        title="Is PicoWorker Legit? How Payouts, Escrow and Verification Work"
        description="Wondering if PicoWorker is real or fake? Every task reward is funded in escrow before it goes live, payouts are instant USDC on chain, and the platform is non-custodial. Here is exactly how it works."
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
              You should be skeptical of any site that promises money online. So do not take our word for it: this page explains exactly how PicoWorker pays, where the money sits, and how you can verify every payout on a public blockchain.
            </p>
          </div>
        </div>
      </section>

      <section className="app-container py-16 lg:py-20">
        <h2 className="font-head font-bold text-[26px] lg:text-[32px] tracking-[-.02em] text-[var(--ink)] text-center mb-10">Three reasons the money is real</h2>
        <Steps
          steps={[
            { t: 'Rewards sit in escrow', d: 'A business must fund its campaign in USDC before a task appears in your feed. The reward you see is already paid for.' },
            { t: 'Payouts are on chain', d: 'USDC withdrawals settle on Solana, a public blockchain. Every payout is a transaction anyone can look up.' },
            { t: 'You hold the keys', d: 'PicoWorker is non-custodial. You cash out to a wallet only you control, so your earnings never depend on us holding them.' },
          ]}
        />
      </section>

      <section className="border-t border-[var(--line)]">
        <div className="app-container py-16 lg:py-20 max-w-[760px]">
          <h2 className="font-head font-bold text-[22px] lg:text-[26px] tracking-[-.02em] text-[var(--ink)] mb-4">What PicoWorker is not</h2>
          <p className="text-[var(--ink-3)] text-[15px] font-medium leading-[1.7] mb-10">
            PicoWorker is not a get rich scheme, and we will not pretend otherwise. Tasks pay cents, not fortunes: quick social tasks from $0.04, app tests and surveys up to $0.35 or more. It is honest pocket money for spare minutes, paid the instant you earn it. We are also not Picoworkers or SproutGigs; if you searched picoworkers real or fake, that is a different, older platform. PicoWorker (picoworker.xyz) is independent.
          </p>
          <h2 className="font-head font-bold text-[22px] lg:text-[26px] tracking-[-.02em] text-[var(--ink)] mb-4">The rules that keep it fair</h2>
          <p className="text-[var(--ink-3)] text-[15px] font-medium leading-[1.7]">
            One account per person, real completions only. Fraud checks run on tasks and withdrawals, and larger withdrawals can require manual review. These rules exist because businesses only keep funding tasks when results are genuine, and that funding is what pays you. The full detail is in our <Link to="/terms" className="text-[var(--accent-strong)] font-semibold">terms</Link>.
          </p>
        </div>
      </section>

      <MiniFaq
        faqs={[
          { q: 'Is PicoWorker free, or is there a catch?', a: 'Joining and earning are completely free, and new earners get a $0.05 welcome bonus on their first task. PicoWorker makes money from the businesses that fund campaigns, not from earners.' },
          { q: 'Is there a minimum withdrawal?', a: 'You are paid per task in USDC and can cash out to your own wallet in seconds for a fraction of a cent, without saving up toward a big threshold first.' },
          { q: 'How fast do I actually get paid?', a: 'Most tasks verify automatically in about 10 seconds and the USDC is credited instantly. Withdrawals to your wallet arrive in seconds.' },
        ]}
      />
      <CtaBanner title="Test it with ten minutes." sub="Join free, do one task and withdraw. The blockchain receipt is your proof." />
    </PageShell>
  )
}
