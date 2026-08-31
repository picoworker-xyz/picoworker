import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { Page } from '../../components/Page'
import { Play, ExternalLink, Chat, ArrowRight } from '../../components/icons'

export const YOUTUBE_CHANNEL = 'https://www.youtube.com/@picoworker.xyzofficial'

type Guide = { q: string; a: string; to?: { label: string; path: string } }

const EARNER_GUIDES: Guide[] = [
  {
    q: 'How do I start earning?',
    a: 'Open Earn, pick any task that matches what you can do, and follow the steps on the task page. Most tasks take a few minutes. You are paid in USDC once your proof is approved.',
    to: { label: 'Browse tasks', path: '/' },
  },
  {
    q: 'What makes a good proof?',
    a: 'A full screen screenshot that clearly shows the completed action, taken by you, on the account you used. Cropped, blurry, reused or edited screenshots get rejected.',
  },
  {
    q: 'Why was my submission rejected?',
    a: 'The most common reasons are an unclear screenshot, skipping a step in the instructions, or submitting the same proof on more than one task. Open the submission to read the reason the business gave.',
    to: { label: 'My submissions', path: '/submissions' },
  },
  {
    q: 'When do I get paid?',
    a: 'Approved earnings move into your wallet balance. Once you are above the minimum and your payout address is set, you can withdraw in USDC.',
    to: { label: 'Wallet', path: '/wallet' },
  },
  {
    q: 'How do offerwalls work?',
    a: 'Offerwall rewards are confirmed by the offer provider, not by us, so they can take longer to land. Keep the offer open until it reports as complete and do not clear your app data midway.',
    to: { label: 'Offers', path: '/offers/lootably' },
  },
  {
    q: 'How does referral earning work?',
    a: 'Share your link. When someone signs up through it and starts completing tasks, you earn a share of their activity with no cost to them.',
    to: { label: 'Refer and earn', path: '/refer' },
  },
]

const BUSINESS_GUIDES: Guide[] = [
  {
    q: 'How do I post my first task?',
    a: 'Pick a task type, set your target link or handle, write clear step by step instructions, choose how many completions you need, then fund and launch.',
    to: { label: 'Create task', path: '/business/create' },
  },
  {
    q: 'How should I write instructions?',
    a: 'Write numbered steps a stranger can follow without asking questions, and say exactly what the screenshot must show. Vague instructions produce proofs you will end up rejecting.',
  },
  {
    q: 'How much should I pay per completion?',
    a: 'Price against the effort. A quick follow or visit is a few cents, an install or a signup is worth more. Underpriced tasks sit unfilled and attract low quality work.',
  },
  {
    q: 'How do I review proofs?',
    a: 'Open the review queue, check each proof against your own instructions, then approve or reject with a reason. Only approved work is paid for.',
    to: { label: 'Review proofs', path: '/business/review' },
  },
  {
    q: 'How do I fund a campaign?',
    a: 'Add funds to your business balance first. The full campaign budget is held while the task is live, and anything unspent stays available for your next task.',
    to: { label: 'Add funds', path: '/business/add-funds' },
  },
  {
    q: 'Can I target specific workers?',
    a: 'Yes. You can narrow the audience before launching so your task only reaches the people you want completing it.',
    to: { label: 'Targeting', path: '/business/targeting' },
  },
]

export function Guides() {
  const nav = useNavigate()
  const { profile } = useStore()
  const isBiz = profile?.mode === 'business'
  const guides = isBiz ? BUSINESS_GUIDES : EARNER_GUIDES
  const [open, setOpen] = useState<number | null>(0)

  return (
    <Page
      title="Tutorials and guides"
      subtitle={isBiz ? 'Everything you need to run a campaign that gets real results.' : 'Short answers to the questions workers ask most.'}
      back
    >
      <div className="flex flex-col gap-4 max-w-[760px]">
        <a
          href={YOUTUBE_CHANNEL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-3 rounded-[16px] p-4 border border-[rgba(255,64,64,.3)]"
          style={{ background: 'linear-gradient(135deg,rgba(255,64,64,.16),rgba(255,64,64,.04))' }}
        >
          <span className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-[12px] bg-[#FF3D3D] flex items-center justify-center flex-none">
              <Play width={20} height={20} className="text-[#fff]" />
            </span>
            <span className="text-left min-w-0">
              <span className="block text-[var(--ink)] text-[15px] font-extrabold font-head">Watch the video tutorials</span>
              <span className="block text-[var(--ink-3)] text-[12px] font-semibold">Step by step walkthroughs on our YouTube channel</span>
            </span>
          </span>
          <ExternalLink width={17} height={17} className="text-[var(--ink-3)] flex-none" />
        </a>

        <div className="rounded-[var(--r)] bg-[var(--card)] border border-[var(--line)] overflow-hidden">
          {guides.map((g, i) => (
            <div key={g.q} className={i ? 'border-t border-[var(--line)]' : ''}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-[var(--fill)]"
              >
                <span className="text-[var(--ink)] text-[14.5px] font-extrabold font-head">{g.q}</span>
                <span className={`text-[var(--ink-4)] text-[18px] font-bold flex-none transition-transform ${open === i ? 'rotate-45' : ''}`}>+</span>
              </button>
              {open === i && (
                <div className="px-5 pb-4 -mt-1">
                  <p className="text-[var(--ink-2)] text-[13.5px] font-medium leading-[1.6]">{g.a}</p>
                  {g.to && (
                    <button
                      onClick={() => nav(g.to!.path)}
                      className="mt-3 inline-flex items-center gap-1.5 text-[var(--accent-strong)] text-[12.5px] font-extrabold hover:underline"
                    >
                      {g.to.label} <ArrowRight width={14} height={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={() => nav('/support')}
          className="w-full flex items-center justify-between gap-3 rounded-[16px] p-4 bg-[var(--card)] border border-[var(--line)] hover:bg-[var(--fill)]"
        >
          <span className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-[12px] bg-[var(--fill)] border border-[var(--line)] flex items-center justify-center flex-none text-[var(--accent-strong)]">
              <Chat width={19} height={19} />
            </span>
            <span className="text-left">
              <span className="block text-[var(--ink)] text-[14.5px] font-extrabold font-head">Still need help?</span>
              <span className="block text-[var(--ink-3)] text-[12px] font-semibold">Message the team and we will reply here</span>
            </span>
          </span>
          <ArrowRight width={17} height={17} className="text-[var(--ink-4)] flex-none" />
        </button>
      </div>
    </Page>
  )
}
