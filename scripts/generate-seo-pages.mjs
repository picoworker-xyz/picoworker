import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const origin = 'https://picoworker.xyz'
const dist = new URL('../dist/', import.meta.url)

const pages = [
  {
    path: '/',
    title: 'PicoWorker — Complete Simple Online Tasks and Earn Rewards',
    description: 'PicoWorker is a micro-task marketplace for simple online tasks. Follow accounts, watch clips, test apps, answer surveys and earn rewards for verified work. Free to join.',
    h1: 'Complete simple online tasks and earn rewards',
    intro: 'Choose eligible tasks and offers, read every requirement before starting, and follow each completion from pending to verified.',
    sections: [
      ['Ways to earn', 'Available work may include social tasks, short clips, app testing, surveys, research and provider offers. Availability depends on country, device and campaign capacity.'],
      ['How PicoWorker works', 'Create a free account, choose an eligible task, complete every listed step and wait for PicoWorker or the provider to verify the result. Opening an offer alone does not earn a reward.'],
      ['For businesses', 'Businesses can create permitted campaigns, define the required result, select an audience and review submitted work before approval.'],
    ],
  },
  {
    path: '/earn/follow-accounts',
    title: 'Follow Account Tasks and Earn Rewards | PicoWorker',
    description: 'Find eligible follow-account tasks on PicoWorker. Read the requirements, complete the social action and earn a reward after verification. Free to join.',
    h1: 'Earn rewards from follow-account tasks',
    intro: 'Browse follow tasks available for your country and account, use the exact profile link and complete only the action described.',
    sections: [
      ['How follow tasks work', 'Each task identifies the supported platform, required action and reward before you begin. Use your own account and the same device from start to finish.'],
      ['Genuine activity only', 'Duplicate accounts, automated actions, VPN traffic and completions that do not match the instructions can be rejected.'],
    ],
  },
  {
    path: '/earn/watch-videos',
    title: 'Watch Video Tasks and Earn Rewards | PicoWorker',
    description: 'Browse eligible watch tasks on PicoWorker. Watch the required clip, satisfy the viewing conditions and earn a reward after verification.',
    h1: 'Earn rewards from watch tasks',
    intro: 'Choose an eligible clip, follow the required viewing duration and complete any clearly listed follow-up step.',
    sections: [
      ['Meet the viewing requirement', 'Opening a clip alone does not complete a task. Watch for the required duration and keep the same account and device throughout the task.'],
      ['Why availability changes', 'Country, device, campaign capacity and previous participation can determine whether a watch task is available.'],
    ],
  },
  {
    path: '/earn/app-testing',
    title: 'App Testing Tasks and Verified Rewards | PicoWorker',
    description: 'Find app-testing tasks on PicoWorker. Install eligible apps, complete the listed milestones and earn rewards after provider verification.',
    h1: 'Earn rewards by testing eligible apps',
    intro: 'Review the supported operating system, country, deadline and milestones before installing an app.',
    sections: [
      ['Complete every milestone', 'Installing an app may be only the first step. The provider confirms the milestones that qualify for the listed reward.'],
      ['Keep tracking valid', 'Use the same device throughout the task, avoid VPNs and do not reinstall an app you have previously used when the offer requires a new user.'],
    ],
  },
  {
    path: '/earn/paid-surveys',
    title: 'Online Survey Tasks and Verified Rewards | PicoWorker',
    description: 'Find eligible survey tasks on PicoWorker. Review the audience requirements, answer honestly and earn the listed reward after verification.',
    h1: 'Earn rewards from eligible surveys',
    intro: 'Choose surveys that match your profile and location, answer consistently and complete every required question.',
    sections: [
      ['Survey eligibility', 'Researchers may need a specific country, age range, device or audience. Accurate profile answers help providers determine eligibility.'],
      ['Genuine responses', 'Duplicate responses, automated answers and false profile information can cause a survey completion to be rejected.'],
    ],
  },
  {
    path: '/micro-jobs',
    title: 'Micro Jobs Online: Simple Tasks and Rewards | PicoWorker',
    description: 'Find simple micro jobs online on PicoWorker. Follow accounts, watch clips, test apps and answer surveys with clear requirements and verified rewards.',
    h1: 'Simple micro jobs with clear requirements',
    intro: 'A micro job is a focused online task that can be completed without a resume or application process.',
    sections: [
      ['How micro jobs work', 'Choose a task available for your country and device, complete every listed step and follow its verification status in your account.'],
      ['What affects availability', 'Active campaigns, location, device, audience rules, previous participation and provider capacity can change the task list.'],
    ],
  },
  {
    path: '/picoworkers-alternative',
    title: 'Picoworkers Alternative for Simple Online Tasks | PicoWorker',
    description: 'Looking for Picoworkers or pico worker? PicoWorker.xyz is an independent micro-task marketplace with country-aware offers, clear requirements and verified rewards.',
    h1: 'Looking for Picoworkers? Meet PicoWorker',
    intro: 'Picoworkers rebranded to SproutGigs. PicoWorker.xyz is a separate, independent marketplace for eligible online tasks and verified rewards.',
    sections: [
      ['A separate platform', 'The official PicoWorker website is picoworker.xyz. An account on another similarly named service is not a PicoWorker account.'],
      ['Clear task status', 'PicoWorker distinguishes available, started, pending, approved and rejected work. Provider offers may use their own verification process.'],
    ],
  },
  {
    path: '/app',
    title: 'PicoWorker Web App for Android, iPhone and Desktop',
    description: 'Use PicoWorker in your browser on Android, iPhone and desktop. Add it to your home screen to browse tasks and offers without downloading an APK.',
    h1: 'Use PicoWorker from your browser',
    intro: 'PicoWorker is a progressive web app that works on supported mobile and desktop browsers without an unofficial APK.',
    sections: [
      ['Add it to your home screen', 'Open picoworker.xyz in your browser and choose Add to Home Screen or Install App when the option is available.'],
      ['Avoid unofficial downloads', 'There is no official PicoWorker APK. Use the official domain and do not enter account details into lookalike apps or websites.'],
    ],
  },
  {
    path: '/is-picoworker-legit',
    title: 'Is PicoWorker Legit? Tasks, Verification and Account Safety',
    description: 'Wondering whether PicoWorker is legitimate? Learn how task requirements, provider verification, account safety, support and reward status work before you join.',
    h1: 'Is PicoWorker legitimate? Check the facts',
    intro: 'Use the official domain, review every task requirement and understand how verification works before starting.',
    sections: [
      ['Use the official website', 'The official PicoWorker service is at picoworker.xyz. PicoWorker is independent from Picoworkers and SproutGigs.'],
      ['Understand verification', 'Opening an offer does not earn a reward. A completion must meet the published requirements and be confirmed by PicoWorker or the provider.'],
      ['Protect your account', 'Never share passwords, use automated traffic or complete tasks through a VPN. Contact support from inside your account if a status is unclear.'],
    ],
  },
  {
    path: '/ai-agents',
    title: 'PicoWorker for AI Agents: Human Tasks by API',
    description: 'Give your AI agent access to real human feedback, testing and research tasks through the PicoWorker API with campaign tracking and verified results.',
    h1: 'A human task API for AI agents',
    intro: 'Create campaigns, request human feedback, monitor progress and review submitted work through authenticated endpoints.',
    sections: [
      ['Agents hire humans', 'Use the API for permitted research, testing, feedback and survey campaigns that require genuine human participation.'],
      ['Audience rules stay enforced', 'Human-only tasks remain unavailable to automated participants. Agents can complete only work explicitly marked as agent-eligible.'],
    ],
  },
  {
    path: '/ai-agents/docs',
    title: 'PicoWorker Agent API Documentation: Tasks and Reviews',
    description: 'Complete PicoWorker agent API reference: register, authenticate, fund campaigns, post tasks, monitor progress and review submitted work.',
    h1: 'PicoWorker Agent API documentation',
    intro: 'Read the endpoint reference for registration, authentication, campaign creation, monitoring and proof review.',
    sections: [
      ['Start with an API key', 'Register an agent, store its key securely and use bearer authentication for protected endpoints.'],
      ['Create and review campaigns', 'Create a paused campaign, launch it when ready, monitor completions and review submitted proof through the API.'],
    ],
  },
  {
    path: '/terms',
    title: 'PicoWorker Terms of Service',
    description: 'Read the PicoWorker terms covering accounts, permitted tasks, verification, campaigns, rewards, withdrawals and prohibited activity.',
    h1: 'PicoWorker Terms of Service',
    intro: 'These terms explain the rules for using PicoWorker as an earner, business or API participant.',
    sections: [['Permitted use', 'Use one genuine account, complete tasks honestly and never request or share passwords, illegal actions or deceptive activity.']],
  },
  {
    path: '/privacy',
    title: 'PicoWorker Privacy Policy',
    description: 'Read how PicoWorker collects, uses, protects and retains account, task, device and support information.',
    h1: 'PicoWorker Privacy Policy',
    intro: 'This policy explains what information PicoWorker processes and why it is needed to operate the service.',
    sections: [['Your information', 'PicoWorker uses account and task information to provide the service, prevent fraud, communicate with users and improve the platform.']],
  },
]

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

function setMeta(html, page) {
  const url = `${origin}${page.path}`
  const title = escapeHtml(page.title)
  const description = escapeHtml(page.description)
  return html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
    .replace(/<meta\s+name="description"[\s\S]*?\/>/, `<meta name="description" content="${description}" />`)
    .replace(/<link\s+rel="canonical"[^>]*>/, `<link rel="canonical" href="${url}" />`)
    .replace(/<meta\s+property="og:title"[^>]*>/, `<meta property="og:title" content="${title}" />`)
    .replace(/<meta\s+property="og:description"[\s\S]*?\/>/, `<meta property="og:description" content="${description}" />`)
    .replace(/<meta\s+property="og:url"[^>]*>/, `<meta property="og:url" content="${url}" />`)
    .replace(/<meta\s+name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${title}" />`)
    .replace(/<meta\s+name="twitter:description"[\s\S]*?\/>/, `<meta name="twitter:description" content="${description}" />`)
}

function pageMarkup(page) {
  const sectionMarkup = page.sections.map(([heading, body]) => `
      <section>
        <h2>${escapeHtml(heading)}</h2>
        <p>${escapeHtml(body)}</p>
      </section>`).join('')
  const nav = pages
    .filter((item) => ['/', '/micro-jobs', '/earn/app-testing', '/earn/paid-surveys', '/is-picoworker-legit'].includes(item.path))
    .map((item) => `<a href="${item.path}">${escapeHtml(item.path === '/' ? 'PicoWorker home' : item.h1)}</a>`)
    .join(' · ')
  return `<div id="root">
    <header style="padding:20px;border-bottom:1px solid #292c36"><a href="/" style="font-weight:800">PicoWorker.xyz</a></header>
    <main style="max-width:820px;margin:0 auto;padding:48px 22px 64px">
      <article>
        <h1 style="font-size:clamp(32px,7vw,54px);line-height:1.08">${escapeHtml(page.h1)}</h1>
        <p style="font-size:18px;line-height:1.7;color:#c7c9d4">${escapeHtml(page.intro)}</p>
        ${sectionMarkup}
        <p><a href="/login">Create an account or sign in</a></p>
      </article>
      <nav aria-label="Related PicoWorker pages" style="margin-top:48px;line-height:2">${nav}</nav>
    </main>
  </div>`
}

function structuredData(page) {
  const url = `${origin}${page.path}`
  return `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.title,
    description: page.description,
    url,
    isPartOf: { '@type': 'WebSite', name: 'PicoWorker', url: `${origin}/` },
  })}</script>`
}

const base = await readFile(new URL('index.html', dist), 'utf8')

for (const page of pages) {
  let html = setMeta(base, page)
  if (page.path !== '/') html = html.replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '')
  html = html.replace(/<div id="root">[\s\S]*?<\/div>\s*<noscript>/, `${pageMarkup(page)}\n    <noscript>`)
  html = html.replace('</head>', `    ${structuredData(page)}\n  </head>`)
  const file = page.path === '/' ? new URL('index.html', dist) : new URL(`.${page.path}/index.html`, dist)
  await mkdir(dirname(file.pathname), { recursive: true })
  await writeFile(file, html)
  if (page.path !== '/') {
    const prettyFile = new URL(`.${page.path}.html`, dist)
    await mkdir(dirname(prettyFile.pathname), { recursive: true })
    await writeFile(prettyFile, html)
  }
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((page) => `  <url><loc>${origin}${page.path}</loc><lastmod>2026-07-30</lastmod></url>`).join('\n')}
</urlset>
`
await writeFile(join(dist.pathname, 'sitemap.xml'), sitemap)

console.log(`Generated ${pages.length} crawlable SEO pages.`)
