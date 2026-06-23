import { useNavigate } from 'react-router-dom'
import { BrandMark } from '../../components/layout'
import { Avatar } from '../../components/ui'
import {
  ArrowRight,
  Bolt,
  Check,
  ListIcon,
  Play,
  Shield,
  User,
  Wallet as WalletIcon,
  XLogo,
} from '../../components/icons'

export function Landing() {
  const nav = useNavigate()
  const go = () => nav('/login')

  return (
    <div className="min-h-svh">
      {/* ===== Nav ===== */}
      <header className="sticky top-0 z-40 border-b border-white/7 bg-[rgba(12,13,17,.72)] backdrop-blur">
        <div className="app-container flex items-center justify-between h-16">
          <BrandMark size={36} />
          <nav className="hidden md:flex items-center gap-8 text-[14px] font-bold text-[#9A9CA8]">
            <a href="#how" className="hover:text-white">How it works</a>
            <a href="#earn" className="hover:text-white">Earn</a>
            <a href="#business" className="hover:text-white">For business</a>
            <a href="#faq" className="hover:text-white">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={go} className="px-4 py-[9px] rounded-[12px] text-[14px] font-bold text-white hover:bg-white/6">
              Log in
            </button>
            <button
              onClick={go}
              className="px-4 py-[9px] rounded-[12px] text-[14px] font-extrabold font-head bg-[var(--accent)] text-[var(--accent-ink)]"
            >
              Get started
            </button>
          </div>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section className="hero-grid border-b border-white/6">
        <div className="app-container py-16 lg:py-28 grid lg:grid-cols-2 gap-12 items-center">
          <div className="reveal">
            <div className="inline-flex items-center gap-2 px-3 py-[7px] rounded-full bg-white/5 border border-white/10 mb-6">
              <span className="w-2 h-2 rounded-full bg-[var(--accent)]" style={{ animation: 'pico-pulse 1.8s infinite' }} />
              <span className="text-[#AEB0BC] text-[12.5px] font-bold">Two-sided marketplace · Earner + Business</span>
            </div>
            <h1 className="font-head font-bold text-[44px] lg:text-[64px] leading-[1.04] tracking-[-.03em] text-white">
              Get paid for<br />the <span className="text-[var(--accent)]">tiny stuff.</span>
            </h1>
            <p className="text-[#C7C9D4] text-[17px] lg:text-[19px] font-medium mt-6 max-w-[520px] leading-[1.55]">
              Micro-tasks → instant <span className="text-[var(--accent)] font-bold">USDC</span>. Follow, watch, test, survey —
              cash out to your wallet in seconds. Or post tasks and get real results from real people.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-8">
              <button
                onClick={go}
                className="px-6 py-[15px] rounded-[14px] font-head font-extrabold text-[16px] bg-[var(--accent)] text-[var(--accent-ink)] flex items-center gap-2"
                style={{ boxShadow: 'var(--glow)' }}
              >
                Start earning <ArrowRight width={18} height={18} />
              </button>
              <button onClick={go} className="px-6 py-[15px] rounded-[14px] font-head font-extrabold text-[16px] bg-white/6 text-white border border-white/12">
                Post a task
              </button>
            </div>
            <div className="flex items-center gap-3 mt-8">
              <div className="flex -space-x-2">
                {['B', 'P', 'R', 'A'].map((n, i) => (
                  <Avatar key={i} name={n} size={30} gradient={['linear-gradient(135deg,#FF6B5A,#FFB05A)', 'linear-gradient(135deg,#8B6CFF,#5B8DEF)', 'linear-gradient(135deg,#44D17A,#26A17B)', 'linear-gradient(135deg,#C2F94D,#7ec900)'][i]} />
                ))}
              </div>
              <div className="text-[#9A9CA8] text-[13px] font-semibold">
                <span className="text-white font-bold">120k+</span> earners paid · <span className="text-[var(--green)] font-bold">$2.4M</span> cashed out
              </div>
            </div>
          </div>

          {/* hero visual: live earnings card */}
          <div className="reveal" style={{ animationDelay: '.1s' }}>
            <div
              className="rounded-[26px] p-7 border border-[rgba(194,249,77,.16)] max-w-[440px] mx-auto"
              style={{ background: 'linear-gradient(150deg,#191B22,#121319)', boxShadow: 'var(--glow)' }}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="text-[#8B8D99] text-[12px] font-bold uppercase tracking-[.08em]">Available balance</div>
                <span className="text-[var(--green)] text-[12px] font-bold flex items-center gap-1">
                  <span className="w-[7px] h-[7px] rounded-full bg-[var(--green)]" /> live
                </span>
              </div>
              <div className="font-head font-bold text-[52px] text-white tracking-[-.02em] leading-none">$12.84</div>
              <div className="text-[#A9ABB6] text-[13px] font-semibold mt-2">≈ 12.84 USDC · Polygon</div>

              <div className="mt-6 flex flex-col gap-[10px]">
                {[
                  { icon: <XLogo width={16} height={16} className="text-white" />, bg: '#000', t: 'Follow on X', m: '+$0.04', s: 'just now' },
                  { icon: <Play width={18} height={18} className="text-white" />, bg: '#FF0033', t: 'Watched 30s video', m: '+$0.02', s: '2m ago' },
                  { icon: <Check width={16} height={16} className="text-white" />, bg: '#5B8DEF', t: 'App test · FitTrack', m: '+$0.35', s: '5m ago' },
                ].map((r, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-[14px] bg-white/4 border border-white/6">
                    <div className="w-9 h-9 rounded-[11px] flex-none flex items-center justify-center" style={{ background: r.bg }}>
                      {r.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-[13px] font-bold truncate">{r.t}</div>
                      <div className="text-[#767884] text-[11px] font-semibold">{r.s}</div>
                    </div>
                    <div className="font-head text-[14px] font-extrabold text-[var(--green)]">{r.m}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Task categories ===== */}
      <section id="earn" className="app-container py-16 lg:py-24">
        <Eyebrow>Ways to earn</Eyebrow>
        <SectionTitle>Tiny tasks. Real money.</SectionTitle>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
          {[
            { icon: <User width={22} height={22} className="text-[var(--accent-ink)]" />, t: 'Social', d: 'Follow, like, repost', p: 'from $0.04' },
            { icon: <Play width={22} height={22} className="text-[var(--accent-ink)]" />, t: 'Watch', d: 'Videos & ads', p: 'from $0.02' },
            { icon: <Bolt width={22} height={22} className="text-[var(--accent-ink)]" />, t: 'App tests', d: 'Install & try apps', p: 'up to $0.35' },
            { icon: <ListIcon width={22} height={22} className="text-[var(--accent-ink)]" />, t: 'Surveys', d: 'Share your opinion', p: 'up to $0.20' },
          ].map((c) => (
            <div key={c.t} className="card-hover rounded-[20px] p-6 bg-[#15161C] border border-white/6">
              <div className="w-12 h-12 rounded-[14px] bg-[var(--accent)] flex items-center justify-center mb-4">{c.icon}</div>
              <div className="text-white text-[17px] font-extrabold font-head">{c.t}</div>
              <div className="text-[#8A8C98] text-[13px] font-semibold mt-1">{c.d}</div>
              <div className="text-[var(--accent)] text-[13px] font-extrabold font-head mt-4">{c.p}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== How it works ===== */}
      <section id="how" className="border-y border-white/6 bg-white/[.02]">
        <div className="app-container py-16 lg:py-24">
          <Eyebrow>How it works</Eyebrow>
          <SectionTitle>Earn in 3 taps.</SectionTitle>
          <div className="grid md:grid-cols-3 gap-6 mt-10">
            {[
              { n: '01', t: 'Pick a task', d: 'Follow, watch, test or survey — browse a live feed of micro-tasks.' },
              { n: '02', t: 'Do it in seconds', d: 'Most tasks auto-verify in ~10 seconds. No skills needed.' },
              { n: '03', t: 'Get paid instantly', d: 'USDC lands in your wallet. Cash out to any address, anytime.' },
            ].map((s) => (
              <div key={s.n} className="rounded-[20px] p-7 bg-[#15161C] border border-white/6">
                <div className="font-head text-[15px] font-bold text-[var(--accent)]">{s.n}</div>
                <div className="text-white text-[20px] font-extrabold font-head mt-3">{s.t}</div>
                <div className="text-[#A9ABB6] text-[14px] font-semibold mt-2 leading-[1.55]">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== For business ===== */}
      <section id="business" className="app-container py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Eyebrow>For business</Eyebrow>
            <SectionTitle>Real results from real people.</SectionTitle>
            <p className="text-[#C7C9D4] text-[16px] font-medium mt-4 leading-[1.6] max-w-[480px]">
              Get genuine followers, views, installs and survey responses. Fund a campaign in USDC,
              pay only per verified completion, and watch results roll in live.
            </p>
            <div className="flex flex-col gap-3 mt-6">
              {['Pay per verified result — no bots', 'Funds held in escrow, refund anytime', 'Live analytics & completion tracking'].map((f) => (
                <div key={f} className="flex items-center gap-3 text-[#D9DAE2] text-[15px] font-semibold">
                  <div className="w-6 h-6 rounded-full bg-[rgba(194,249,77,.14)] flex items-center justify-center flex-none">
                    <Check width={14} height={14} className="text-[var(--accent)]" />
                  </div>
                  {f}
                </div>
              ))}
            </div>
            <button
              onClick={go}
              className="mt-8 px-6 py-[14px] rounded-[14px] font-head font-extrabold text-[15px] bg-[#8B6CFF] text-white flex items-center gap-2"
              style={{ boxShadow: '0 16px 44px -14px rgba(139,108,255,.6)' }}
            >
              Launch a campaign <ArrowRight width={18} height={18} className="text-white" />
            </button>
          </div>

          <div className="rounded-[24px] p-7 bg-[#15161C] border border-white/7">
            <div className="flex items-center justify-between mb-5">
              <div className="text-white text-[16px] font-extrabold font-head">Follow @acmehq on X</div>
              <span className="text-[10px] font-extrabold px-2 py-1 rounded-full uppercase text-[var(--green)] bg-[rgba(68,209,122,.14)]">live</span>
            </div>
            <div className="flex items-end justify-between mb-3">
              <div className="font-head text-[36px] font-extrabold text-white">340 <span className="text-[#5E606C] text-[20px]">/ 500</span></div>
              <div className="font-head text-[22px] font-extrabold text-[var(--accent)]">68%</div>
            </div>
            <div className="h-[10px] rounded-full bg-white/8 overflow-hidden mb-6">
              <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: '68%' }} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[['$13.60', 'Spent'], ['$8.40', 'Remaining'], ['14s', 'Avg time']].map(([v, l]) => (
                <div key={l} className="rounded-[14px] p-4 bg-white/4 border border-white/6">
                  <div className="font-head text-[18px] font-extrabold text-white">{v}</div>
                  <div className="text-[#767884] text-[11px] font-semibold mt-1">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== FAQ (mirrors FAQPage JSON-LD in index.html) ===== */}
      <section id="faq" className="border-t border-white/6 bg-white/[.02]">
        <div className="app-container py-16 lg:py-24">
          <Eyebrow>FAQ</Eyebrow>
          <SectionTitle>Micro-tasks, paid in USDC — answered.</SectionTitle>
          <div className="grid md:grid-cols-2 gap-4 mt-10">
            {FAQS.map((f) => (
              <div key={f.q} className="rounded-[18px] p-6 bg-[#15161C] border border-white/6">
                <h3 className="text-white text-[17px] font-extrabold font-head">{f.q}</h3>
                <p className="text-[#A9ABB6] text-[14px] font-medium mt-2 leading-[1.6]">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Trust / CTA ===== */}
      <section className="border-t border-white/6">
        <div className="app-container py-16 lg:py-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
            <Shield width={16} height={16} className="text-[var(--green)]" />
            <span className="text-[#B6B8C2] text-[13px] font-semibold">Non-custodial · your keys, your USDC</span>
          </div>
          <h2 className="font-head font-bold text-[34px] lg:text-[48px] tracking-[-.02em] text-white max-w-[720px] mx-auto leading-[1.1]">
            Start earning in the next 60 seconds.
          </h2>
          <button
            onClick={go}
            className="mt-8 px-8 py-[16px] rounded-[15px] font-head font-extrabold text-[17px] bg-[var(--accent)] text-[var(--accent-ink)] inline-flex items-center gap-2"
            style={{ boxShadow: 'var(--glow)' }}
          >
            Get started — it's free <ArrowRight width={18} height={18} />
          </button>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-white/7">
        <div className="app-container py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <BrandMark size={32} />
          <div className="text-[#767884] text-[13px] font-semibold">© 2026 PicoWorker · Terms · Privacy</div>
          <div className="flex items-center gap-3 text-[#9A9CA8]">
            <a href="#" className="w-9 h-9 rounded-full bg-white/6 flex items-center justify-center hover:text-white">
              <XLogo width={15} height={15} />
            </a>
            <a href="#" className="w-9 h-9 rounded-full bg-white/6 flex items-center justify-center hover:text-white">
              <WalletIcon width={16} height={16} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Keep in sync with the FAQPage JSON-LD in index.html (text must match for rich results).
const FAQS: { q: string; a: string }[] = [
  {
    q: 'What is PicoWorker?',
    a: 'PicoWorker is a micro-task marketplace where you get paid in USDC for tiny online tasks like following accounts, watching videos, testing apps and answering surveys. Businesses post tasks and only pay for verified results.',
  },
  {
    q: 'How do I earn money on PicoWorker?',
    a: 'Sign up for free, pick a task from the live feed, complete it in seconds, and most tasks auto-verify in about 10 seconds. Your USDC reward is added to your wallet instantly.',
  },
  {
    q: 'How much can I earn from micro-tasks?',
    a: 'Rewards range from a few cents for quick social tasks up to $0.35 or more for app tests and surveys. Higher levels and streaks unlock up to 2x higher payouts, and you also earn from referrals.',
  },
  {
    q: 'When and how do I get paid?',
    a: "You're paid in USDC the moment a task is verified. Cash out to any wallet on Polygon, Base or other networks — withdrawals arrive in about 30 seconds. PicoWorker is non-custodial: your keys, your USDC.",
  },
  {
    q: 'Is PicoWorker free to join?',
    a: 'Yes. Joining and earning is completely free, and new earners get a $0.05 welcome bonus on their first task.',
  },
  {
    q: 'Can businesses post tasks on PicoWorker?',
    a: 'Yes. Businesses fund a campaign in USDC, set a reward and quantity, and get real followers, views, installs and survey responses. Funds sit in escrow and you only pay per verified completion.',
  },
]

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[var(--accent)] text-[13px] font-extrabold font-head uppercase tracking-[.14em]">{children}</div>
)
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="font-head font-bold text-[32px] lg:text-[42px] tracking-[-.02em] text-white mt-3">{children}</h2>
)
