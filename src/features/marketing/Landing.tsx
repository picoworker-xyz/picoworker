import { Link, useNavigate } from 'react-router-dom'
import { BrandLogo } from '../../components/BrandLogo'
import { MarketingFooter } from './SeoPages'
import {
  ArrowRight,
  Bolt,
  Check,
  ListIcon,
  Play,
  Wallet as WalletIcon,
  XLogo,
} from '../../components/icons'

export function Landing() {
  const nav = useNavigate()
  const go = () => nav('/login')

  return (
    <div className="min-h-svh">
      {/* ===== Nav ===== */}
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--bar)] backdrop-blur">
        <div className="app-container flex items-center justify-between gap-3 h-16">
          {/* Brand — drops the .xyz on small screens to free up room */}
          <button onClick={() => nav('/')} className="flex items-center gap-[10px] flex-none min-w-0">
            <BrandLogo size={36} />
          </button>

          <nav className="hidden md:flex items-center gap-8 text-[14px] font-bold text-[var(--ink-3)]">
            <a href="#how" className="hover:text-[var(--ink)]">How it works</a>
            <a href="#earn" className="hover:text-[var(--ink)]">Earn</a>
            <a href="#business" className="hover:text-[var(--ink)]">For business</a>
            <a href="#faq" className="hover:text-[var(--ink)]">FAQ</a>
          </nav>

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

      <main>
      {/* ===== Hero ===== */}
      <section className="hero-grid border-b border-[var(--line)]">
        <div className="app-container py-20 lg:py-28">
          {/* centered, restrained hero */}
          <div className="max-w-[760px] mx-auto text-center reveal">
            <h1 className="font-head font-bold text-[38px] sm:text-[48px] lg:text-[58px] leading-[1.05] tracking-[-.03em] text-[var(--ink)]">
              Complete tiny tasks.<br />
              <span className="relative inline-block text-[var(--accent-strong)]">
                Earn useful rewards.
                <svg className="absolute left-0 -bottom-1.5 w-full" height="12" viewBox="0 0 320 12" fill="none" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M3 8.5C70 3 250 3 317 7.5" stroke="var(--accent)" strokeWidth="3.5" strokeLinecap="round" />
                </svg>
              </span>
            </h1>

            <p className="text-[var(--ink-3)] text-[15px] lg:text-[17px] font-medium mt-6 max-w-[540px] mx-auto leading-[1.6]">
              PicoWorker is a micro-task marketplace. Follow an account, watch a clip, try an app or share your opinion, then earn a reward when your work is verified.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 mt-9">
              <button
                onClick={go}
                className="px-6 py-[14px] rounded-[13px] font-head font-extrabold text-[15px] bg-[var(--accent)] text-[var(--accent-ink)] flex items-center gap-2"
                style={{ boxShadow: 'var(--glow)' }}
              >
                Start earning <ArrowRight width={17} height={17} />
              </button>
              <button onClick={() => nav('/login')} className="px-6 py-[14px] rounded-[13px] font-head font-extrabold text-[15px] bg-[var(--fill)] text-[var(--ink)] border border-[var(--line-2)]">
                Post a task
              </button>
            </div>

            <div className="text-[var(--ink-4)] text-[13.5px] font-semibold mt-6">
              Free to join · Clear requirements · Verified rewards
            </div>
          </div>

          {/* product peek: single centered earnings card */}
          <div className="reveal mt-14" style={{ animationDelay: '.1s' }}>
            <div className="relative max-w-[440px] mx-auto">
              {/* ambient glow behind the card */}
              <div
                aria-hidden
                className="absolute -inset-10 rounded-[48px] blur-3xl opacity-50 pointer-events-none"
                style={{ background: 'radial-gradient(closest-side, rgba(46,224,110,.22), rgba(139,108,255,.14), transparent)' }}
              />

              {/* floating side chips, desktop only */}
              <div
                aria-hidden
                className="hidden lg:flex float-slow absolute -left-52 top-12 items-center gap-3 px-4 py-3 rounded-[15px] bg-[var(--card)] border border-[var(--line-2)] shadow-xl"
                style={{ animationDelay: '.7s' }}
              >
                <div className="w-8 h-8 rounded-[10px] flex items-center justify-center bg-[#26A17B]">
                  <Check width={15} height={15} className="text-[#fff]" />
                </div>
                <div>
                  <div className="text-[var(--ink)] text-[12.5px] font-bold">Survey verified</div>
                  <div className="font-head text-[13px] font-extrabold text-[var(--green)]">Reward added</div>
                </div>
              </div>
              <div
                aria-hidden
                className="hidden lg:flex float-slow absolute -right-56 bottom-16 items-center gap-3 px-4 py-3 rounded-[15px] bg-[var(--card)] border border-[var(--line-2)] shadow-xl"
                style={{ animationDelay: '1.6s' }}
              >
                <div className="w-8 h-8 rounded-[10px] flex items-center justify-center bg-[var(--usdc)]">
                  <WalletIcon width={15} height={15} className="text-[#fff]" />
                </div>
                <div>
                  <div className="text-[var(--ink)] text-[12.5px] font-bold">Task approved</div>
                  <div className="text-[var(--ink-4)] text-[11.5px] font-semibold">status updated</div>
                </div>
              </div>

            <div
              className="float-slow relative overflow-hidden rounded-[26px] border border-[rgba(46,224,110,.16)]"
              style={{ background: 'linear-gradient(150deg,var(--card-2),var(--bg))', boxShadow: 'var(--glow)' }}
            >
              {/* soft lime wash behind the balance */}
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-[190px] pointer-events-none"
                style={{ background: 'radial-gradient(380px 190px at 82% -30%, rgba(46,224,110,.16), transparent 70%)' }}
              />

              <div className="relative p-7 pb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[var(--ink-4)] text-[12px] font-bold uppercase tracking-[.08em]">Example activity</div>
                  <span className="flex items-center gap-1.5 text-[var(--green)] text-[10.5px] font-extrabold uppercase tracking-[.06em] px-2.5 py-1 rounded-full bg-[rgba(68,209,122,.12)]">
                    <span className="w-[6px] h-[6px] rounded-full bg-[var(--green)]" style={{ animation: 'pico-pulse 1.8s ease-in-out infinite' }} />
                    example
                  </span>
                </div>

                <div className="flex items-end gap-2.5">
                  <div className="font-head font-bold text-[54px] text-[var(--ink)] tracking-[-.02em] leading-none">12 tasks</div>
                  <div className="font-head text-[14px] font-extrabold text-[var(--green)] mb-[5px]">4 recent</div>
                </div>

                <div className="inline-flex items-center gap-2 mt-4 px-3 py-[7px] rounded-full bg-[var(--fill)] border border-[var(--line)]">
                  <span className="w-[8px] h-[8px] rounded-full bg-[var(--usdc)]" />
                  <span className="text-[var(--ink-2)] text-[12px] font-bold">Account ready for new tasks</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 mt-5">
                  <button
                    onClick={go}
                    className="py-[11px] rounded-[12px] font-head font-extrabold text-[13.5px] bg-[var(--accent)] text-[var(--accent-ink)]"
                  >
                    View tasks
                  </button>
                  <button
                    onClick={go}
                    className="py-[11px] rounded-[12px] font-head font-extrabold text-[13.5px] bg-[var(--fill)] text-[var(--ink)] border border-[var(--line-2)]"
                  >
                    View activity
                  </button>
                </div>
              </div>

              <div className="relative px-7 pb-7">
                <div className="text-[var(--ink-4)] text-[11px] font-bold uppercase tracking-[.08em] mb-3">Recent activity</div>
                <div className="flex flex-col gap-[10px]">
                  {[
                    { icon: <XLogo width={16} height={16} className="text-[#fff]" />, bg: '#000', t: 'Follow on X', m: 'Verified', s: 'just now' },
                    { icon: <Play width={18} height={18} className="text-[#fff]" />, bg: '#FF0033', t: 'Watched 30s video', m: 'Verified', s: '2m ago' },
                    { icon: <Check width={16} height={16} className="text-[#fff]" />, bg: '#5B8DEF', t: 'App test · FitTrack', m: 'Approved', s: '5m ago' },
                  ].map((r, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-[14px] bg-[var(--fill)] border border-[var(--line)]">
                      <div className="w-9 h-9 rounded-[11px] flex-none flex items-center justify-center" style={{ background: r.bg }}>
                        {r.icon}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="text-[var(--ink)] text-[13px] font-bold truncate">{r.t}</div>
                        <div className="text-[var(--ink-4)] text-[11px] font-semibold">{r.s}</div>
                      </div>
                      <div className="font-head text-[12.5px] font-extrabold text-[var(--green)] px-2.5 py-1 rounded-full bg-[rgba(68,209,122,.12)]">
                        {r.m}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Ways to earn ===== */}
      <section id="earn" className="app-container py-20 lg:py-24">
        <SectionHead
          eyebrow="Ways to earn"
          title="Small tasks. Clear rewards."
          sub="Choose a task that fits your device and location, read the requirements, and earn after verification."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-[1000px] mx-auto">
          {[
            { to: '/earn/follow-accounts', icon: <XLogo width={20} height={20} className="text-[#fff]" />, color: '#000000', t: 'Social', d: 'Follow, like and share on supported social platforms.', p: 'Quick tasks' },
            { to: '/earn/watch-videos', icon: <Play width={22} height={22} className="text-[#fff]" />, color: '#FF0033', t: 'Watch', d: 'Watch eligible short clips through to the end.', p: 'Short clips' },
            { to: '/earn/app-testing', icon: <Bolt width={20} height={20} className="text-[#fff]" />, color: '#5B8DEF', t: 'App tests', d: 'Install, explore and complete the listed app requirements.', p: 'Multi-step tasks' },
            { to: '/earn/paid-surveys', icon: <ListIcon width={20} height={20} className="text-[#fff]" />, color: '#26A17B', t: 'Surveys', d: 'Share genuine answers in available questionnaires.', p: 'Availability varies' },
          ].map((c) => (
            <Link key={c.t} to={c.to} className="card-hover rounded-[20px] p-6 bg-[var(--card)] border border-[var(--line)] block">
              <div className="w-11 h-11 rounded-[13px] flex items-center justify-center" style={{ background: c.color }}>
                {c.icon}
              </div>
              <div className="text-[var(--ink)] text-[17px] font-extrabold font-head mt-5">{c.t}</div>
              <div className="text-[var(--ink-4)] text-[13px] font-semibold mt-1.5 leading-[1.55]">{c.d}</div>
              <div className="inline-flex items-center px-3 py-[6px] rounded-full bg-[var(--fill)] border border-[var(--line)] text-[var(--accent-strong)] text-[12.5px] font-extrabold font-head mt-4">
                {c.p}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== How it works ===== */}
      <section id="how" className="border-y border-[var(--line)] bg-[var(--fill)]">
        <div className="app-container py-20 lg:py-24">
          <SectionHead
            eyebrow="How it works"
            title="Three clear steps."
            sub="No experience or application is required. Choose an eligible task and follow every listed step."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-[1000px] mx-auto">
            {[
              { t: 'Choose a task', d: 'Scroll a live feed of quick tasks and grab whichever one catches your eye.' },
              { t: 'Complete the requirements', d: 'Follow every listed step. The time and eligibility depend on the individual task or provider.' },
              { t: 'Receive the reward', d: 'Eligible rewards are credited after the completion is verified.' },
            ].map((s, i) => (
              <div key={s.t} className="relative overflow-hidden rounded-[20px] p-7 bg-[var(--card)] border border-[var(--line)] text-center md:text-left">
                <div
                  aria-hidden
                  className="absolute -top-5 right-1 font-head font-bold text-[104px] leading-none text-[var(--ink)] opacity-[.05] select-none pointer-events-none"
                >
                  {i + 1}
                </div>
                <div className="w-10 h-10 rounded-full bg-[var(--accent)] text-[var(--accent-ink)] font-head font-extrabold text-[16px] flex items-center justify-center mx-auto md:mx-0">
                  {i + 1}
                </div>
                <div className="text-[var(--ink)] text-[18px] font-extrabold font-head mt-4">{s.t}</div>
                <div className="text-[var(--ink-3)] text-[14px] font-semibold mt-2 leading-[1.55]">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== For business ===== */}
      <section id="business" className="app-container py-20 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-[1000px] mx-auto">
          <div>
            <div className="text-[var(--accent-strong)] text-[12.5px] font-extrabold font-head uppercase tracking-[.16em]">For business</div>
            <h2 className="font-head font-bold text-[28px] lg:text-[36px] tracking-[-.02em] text-[var(--ink)] mt-3 leading-[1.1]">Real people. Real results.</h2>
            <p className="text-[var(--ink-3)] text-[15px] font-medium mt-4 leading-[1.65] max-w-[440px]">
              Reach genuine people for feedback, testing, research and permitted engagement tasks. Review results before approving completed work.
            </p>
            <div className="flex flex-col gap-3 mt-6">
              {['Requirements defined before launch', 'Campaign status and review controls', 'Analytics for submitted completions'].map((f) => (
                <div key={f} className="flex items-center gap-3 text-[var(--ink-2)] text-[14.5px] font-semibold">
                  <div className="w-6 h-6 rounded-full bg-[rgba(46,224,110,.14)] flex items-center justify-center flex-none">
                    <Check width={14} height={14} className="text-[var(--accent-strong)]" />
                  </div>
                  {f}
                </div>
              ))}
            </div>
            <button
              onClick={() => nav('/login')}
              className="mt-8 px-6 py-[13px] rounded-[13px] font-head font-extrabold text-[15px] bg-[#8B6CFF] text-[#fff] flex items-center gap-2"
              style={{ boxShadow: '0 16px 44px -16px rgba(139,108,255,.6)' }}
            >
              Launch a campaign <ArrowRight width={17} height={17} className="text-[#fff]" />
            </button>
          </div>

          <div className="rounded-[22px] p-6 bg-[var(--card)] border border-[var(--line)]">
            <div className="flex items-center justify-between mb-5">
              <div className="text-[var(--ink)] text-[15px] font-extrabold font-head">Follow @acmehq on X</div>
              <span className="text-[10px] font-extrabold px-2 py-1 rounded-full uppercase text-[var(--green)] bg-[rgba(68,209,122,.14)]">live</span>
            </div>
            <div className="flex items-end justify-between mb-3">
              <div className="font-head text-[34px] font-extrabold text-[var(--ink)]">340 <span className="text-[var(--ink-5)] text-[19px]">/ 500</span></div>
              <div className="font-head text-[21px] font-extrabold text-[var(--accent-strong)]">68%</div>
            </div>
            <div className="h-[9px] rounded-full bg-[var(--fill)] overflow-hidden mb-6">
              <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: '68%' }} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[['340', 'Completed'], ['160', 'Remaining'], ['14s', 'Avg time']].map(([v, l]) => (
                <div key={l} className="rounded-[13px] p-3.5 bg-[var(--fill)] border border-[var(--line)]">
                  <div className="font-head text-[17px] font-extrabold text-[var(--ink)]">{v}</div>
                  <div className="text-[var(--ink-4)] text-[11px] font-semibold mt-1">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== FAQ (mirrors FAQPage JSON-LD in index.html) ===== */}
      <section id="faq" className="border-t border-[var(--line)] bg-[var(--fill)]">
        <div className="app-container py-20 lg:py-24">
          <SectionHead eyebrow="FAQ" title="Questions, answered." />
          <div className="flex flex-col gap-3 max-w-[720px] mx-auto">
            {FAQS.map((f, i) => (
              <details
                key={f.q}
                open={i === 0}
                className="group rounded-[18px] bg-[var(--card)] border border-[var(--line)] open:border-[var(--line-2)] transition-colors"
              >
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

      {/* ===== Trust / CTA ===== */}
      <section className="app-container py-16 lg:py-24">
        <div
          className="relative overflow-hidden rounded-[28px] border border-[rgba(46,224,110,.18)] px-6 py-16 lg:py-20 text-center"
          style={{ background: 'linear-gradient(165deg,var(--card-2),var(--bg))' }}
        >
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(640px 320px at 50% -15%, rgba(46,224,110,.16), transparent 70%)' }}
          />
          <div className="relative">
            <h2 className="font-head font-bold text-[30px] lg:text-[44px] tracking-[-.02em] text-[var(--ink)] max-w-[620px] mx-auto leading-[1.1]">
              Your next task could be ready now.
            </h2>
            <p className="text-[var(--ink-3)] text-[15px] font-medium mt-4 max-w-[440px] mx-auto leading-[1.6]">
              Join for free, browse eligible tasks and start with clear requirements.
            </p>
            <button
              onClick={go}
              className="mt-8 px-7 py-[15px] rounded-[14px] font-head font-extrabold text-[16px] bg-[var(--accent)] text-[var(--accent-ink)] inline-flex items-center gap-2"
              style={{ boxShadow: 'var(--glow)' }}
            >
              Get started for free <ArrowRight width={18} height={18} />
            </button>
          </div>
        </div>
      </section>
      </main>

      {/* ===== Footer ===== */}
      <MarketingFooter />
    </div>
  )
}

// Keep in sync with the FAQPage JSON-LD in index.html (text must match for rich results).
const FAQS: { q: string; a: string }[] = [
  {
    q: 'What is PicoWorker?',
    a: 'PicoWorker is a micro-task marketplace where people complete small online tasks such as following accounts, watching clips, testing apps and answering surveys. Businesses post tasks and review verified results.',
  },
  {
    q: 'How do I earn rewards on PicoWorker?',
    a: 'Sign up for free, choose an eligible task or offer, follow every requirement and wait for the completion to be verified.',
  },
  {
    q: 'How are task rewards decided?',
    a: 'Each task shows its reward and requirements before you begin. Availability and reward values can vary by country, device and provider.',
  },
  {
    q: 'When is a reward credited?',
    a: 'Eligible rewards are credited after PicoWorker or the offer provider confirms that every required step was completed.',
  },
  {
    q: 'Is PicoWorker free to join?',
    a: 'Yes. Registration and browsing available tasks are free.',
  },
  {
    q: 'Can businesses post tasks on PicoWorker?',
    a: 'Yes. Businesses can create permitted campaigns, define the required result and review submitted work before approval.',
  },
  {
    q: 'Is PicoWorker the same as Picoworkers or SproutGigs?',
    a: 'No. Picoworkers rebranded to SproutGigs and is a separate company. PicoWorker at picoworker.xyz is an independent marketplace for simple online tasks and verified rewards.',
  },
]

function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="max-w-[560px] mx-auto text-center mb-12">
      <div className="text-[var(--accent-strong)] text-[12.5px] font-extrabold font-head uppercase tracking-[.16em]">{eyebrow}</div>
      <h2 className="font-head font-bold text-[27px] lg:text-[36px] tracking-[-.02em] text-[var(--ink)] mt-3 leading-[1.12]">{title}</h2>
      {sub && <p className="text-[var(--ink-3)] text-[15px] font-medium mt-5 leading-[1.6]">{sub}</p>}
    </div>
  )
}
