import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const origin = 'https://picoworker.xyz'
const dist = new URL('../dist/', import.meta.url)

function pageUrl(path) {
  return path === '/' ? `${origin}/` : `${origin}${path}/`
}

function pageHref(path) {
  return path === '/' ? '/' : `${path}/`
}

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
    path: '/how-picoworker-works',
    title: 'How PicoWorker Works: Tasks, Offers and Verification',
    description: 'Learn how PicoWorker works for earners and businesses, including eligibility, task requirements, offer tracking and pending, approved or rejected statuses.',
    h1: 'From an available task to a verified result',
    intro: 'PicoWorker separates discovery, completion and verification so earners know what is required and businesses can review genuine results.',
    sections: [
      ['How PicoWorker works for earners', 'Sign in, choose a task available for the current country and device, read every requirement, complete the listed steps and wait for PicoWorker or the provider to return a final result.'],
      ['How PicoWorker works for businesses', 'Create a permitted campaign, describe the required result, choose the eligible audience and review submitted work against the published requirements.'],
      ['What each task status means', 'Available means a task can be opened. Started means its flow began. Pending means verification is incomplete. Approved means it passed verification. Rejected means the completion did not satisfy the requirements.'],
      ['How provider offer tracking works', 'A provider records eligible milestones and sends a server confirmation when its rules are satisfied. Opening a provider page alone does not complete an offer.'],
      ['Why country and device matching matters', 'Campaigns may support only selected locations and devices. VPN use, switching devices or repeating a new-user offer can prevent a provider from matching the completion.'],
    ],
  },
  {
    path: '/guides/complete-online-microtasks-safely',
    title: 'How to Complete Online Microtasks Safely: Beginner Guide',
    description: 'Learn how to complete online microtasks safely, check task requirements, protect offer tracking, avoid scams and understand pending verification.',
    h1: 'How to complete online microtasks safely',
    intro: 'Online microtasks can be straightforward, but a successful completion depends on choosing an eligible task, understanding every requirement and protecting your account and device. This beginner guide explains the process before you start.',
    article: true,
    datePublished: '2026-07-30',
    sections: [
      ['1. Understand what a microtask is', 'A microtask is a small, clearly defined online activity. Examples can include answering a survey, testing an app, watching a clip, researching information or following an account. A legitimate task should explain the required action, eligibility rules, deadline and reward before you begin.'],
      ['2. Check country and device eligibility first', 'Some campaigns accept only participants from selected countries or operating systems. Confirm that your real location and current device match the task. Do not use a VPN, proxy or location-spoofing tool to access an ineligible campaign, because the provider may reject the completion.'],
      ['3. Read every requirement before starting', 'Do not rely only on the task title or maximum reward. Read the complete instructions and look for required milestones, time limits, new-user conditions and proof requirements. Opening an offer, installing an app or visiting a page does not by itself mean the task is complete.'],
      ['4. Use one genuine account and the same device', 'Use your own accurate account information and keep the same browser or device throughout a tracked offer. Duplicate accounts, automated actions, device switching and repeated participation in a new-user campaign can break tracking or violate the provider rules.'],
      ['5. Protect your privacy and account', 'Never share your password, one-time verification code, recovery phrase or payment credentials with a task poster. Avoid tasks that request illegal activity, a fee sent directly to an unknown person, an undisclosed review, deceptive engagement or access to your personal accounts. Contact support when a request appears unsafe.'],
      ['6. Keep honest proof of completion', 'When a direct task asks for proof, submit only the requested evidence and make sure it clearly shows the completed action without exposing unnecessary personal information. Do not edit, reuse or fabricate screenshots. Provider offers are normally confirmed through their own tracking rather than a screenshot alone.'],
      ['7. Understand pending and approved status', 'Pending means a completion has been recorded but its verification is not finished. Approved means it passed the published requirements. Rejected means the task or provider could not verify an eligible completion. Processing time can vary, so keep the task name, start time and any permitted confirmation details until a final result appears.'],
      ['8. Recognize common warning signs', 'Be cautious when instructions promise guaranteed results, ask you to bypass eligibility rules, request sensitive credentials or lead to a domain unrelated to the named provider. Always begin from the official PicoWorker website and verify the destination before entering personal information.'],
      ['A safe completion checklist', 'Before starting, confirm the country, device, deadline, required milestones and reward terms. During the task, keep one genuine account and device, allow necessary tracking and follow each step exactly. Afterwards, retain permitted confirmation details and wait for the published verification process.'],
      ['How PicoWorker helps', 'PicoWorker displays available task information and status, while some offers are tracked and verified by third-party providers. Availability and final approval depend on the individual campaign rules. If a status or requirement is unclear, use PicoWorker support before repeating the task.'],
    ],
  },
  {
    path: '/faq',
    title: 'PicoWorker Help and FAQ: Tasks, Tracking and Verification',
    description: 'Direct answers about PicoWorker tasks, country and device eligibility, offer tracking, pending verification, account safety and the official website.',
    h1: 'PicoWorker questions, answered clearly',
    intro: 'Factual answers about what PicoWorker is, how tasks are completed and verified, why availability changes, and how to use the official service safely.',
    sections: [
      ['The short answer', 'PicoWorker is a marketplace for simple online tasks and verified results. It connects earners with businesses and third-party offer providers.'],
      ['Where to find task-specific information', 'The individual task or provider page is the source of truth for its requirements, eligibility, deadline and reward. Read it before starting.'],
    ],
  },
  {
    path: '/about',
    title: 'About PicoWorker: Official Website and Platform Facts',
    description: 'Official facts about PicoWorker, the independent online micro-task marketplace at picoworker.xyz for earners, businesses and eligible task providers.',
    h1: 'The official facts about PicoWorker',
    intro: 'PicoWorker is the name of the independent micro-task platform available at picoworker.xyz.',
    sections: [
      ['What PicoWorker is', 'PicoWorker is a two-sided online marketplace. Earners browse and complete eligible tasks, while businesses publish permitted campaigns and review results.'],
      ['Official identity and website', 'The official product name is PicoWorker and the official domain is picoworker.xyz. PicoWorker is not Picoworkers or SproutGigs and is not affiliated with those services.'],
      ['What PicoWorker can and cannot promise', 'PicoWorker displays the requirements and known status of a task. It cannot promise identical task availability for every account or provider approval when requirements are not satisfied.'],
      ['Official contact', 'The public contact email is hello@picoworker.xyz. Support will not ask for an account password or one-time verification code.'],
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

const coreFaqs = [
  ['What is PicoWorker?', 'PicoWorker is an independent two-sided marketplace for simple online tasks. Earners complete eligible tasks, while businesses create campaigns and review results.'],
  ['How does PicoWorker work for earners?', 'Create an account, browse tasks available for your country and device, read every requirement, complete the task and wait for PicoWorker or the provider to verify it.'],
  ['Is PicoWorker free to join?', 'Yes. Creating an account and browsing available tasks are free.'],
  ['What tasks can appear on PicoWorker?', 'Available work may include social actions, watch tasks, app testing, surveys, research and third-party provider offers. The active list changes with current campaigns.'],
  ['Why are different tasks shown in different countries?', 'Availability can depend on country, device, audience and capacity rules. Confirm the eligibility shown on the task or provider page before starting.'],
  ['Does opening an offer earn a reward?', 'No. Opening an offer only starts the provider journey. Every listed requirement must be completed and successfully tracked before a reward can be confirmed.'],
  ['What does pending mean?', 'Pending means a completion was recorded but has not received its final verification result. Some provider offers take longer to confirm than direct PicoWorker tasks.'],
  ['What do approved and rejected mean?', 'Approved means the submitted completion met the published requirements. Rejected means it did not pass review or provider verification; the account should show the available reason or status.'],
  ['How can I keep offer tracking valid?', 'Start from PicoWorker, use the same device and account, allow required tracking, avoid VPNs, and do not repeat an offer that requires a new user.'],
  ['Is PicoWorker the same as Picoworkers or SproutGigs?', 'No. Picoworkers rebranded to SproutGigs. PicoWorker at picoworker.xyz is a separate and independent platform.'],
  ['What is the official PicoWorker website and app?', 'The official website is picoworker.xyz. PicoWorker is a browser-based web app and does not provide an official APK download.'],
  ['How do I contact PicoWorker?', 'Use the support area after signing in or email hello@picoworker.xyz. Never send a password or verification code in a support message.'],
]

const pageFaqs = {
  '/': [
    ['What is PicoWorker?', 'PicoWorker is a micro-task marketplace where people complete small online tasks such as following accounts, watching clips, testing apps and answering surveys. Businesses post tasks and review verified results.'],
    ['How do I earn rewards on PicoWorker?', 'Sign up for free, choose an eligible task or offer, follow every requirement and wait for the completion to be verified.'],
    ['How are task rewards decided?', 'Each task shows its reward and requirements before you begin. Availability and reward values can vary by country, device and provider.'],
    ['When is a reward credited?', 'Eligible rewards are credited after PicoWorker or the offer provider confirms that every required step was completed.'],
    ['Is PicoWorker free to join?', 'Yes. Registration and browsing available tasks are free.'],
    ['Can businesses post tasks on PicoWorker?', 'Yes. Businesses can create permitted campaigns, define the required result and review submitted work before approval.'],
    ['Is PicoWorker the same as Picoworkers or SproutGigs?', 'No. Picoworkers rebranded to SproutGigs and is a separate company. PicoWorker at picoworker.xyz is an independent marketplace for simple online tasks and verified rewards.'],
  ],
  '/earn/follow-accounts': [
    ['When is the reward credited?', 'The reward is credited after PicoWorker or the provider confirms that the task requirements were completed.'],
    ['Which platforms are supported?', 'Available platforms depend on current campaigns. Always use the exact link and instructions shown in the task.'],
    ['Is it free to start?', 'Yes. Registration and browsing available tasks are free.'],
  ],
  '/earn/watch-videos': [
    ['Do I have to watch the whole video?', 'Follow the exact duration shown in the task. Leaving early can prevent verification.'],
    ['Why is a task unavailable?', 'Availability can depend on country, device, campaign limits and previous participation.'],
    ['Is it free to start?', 'Yes. Registration and browsing available tasks are free.'],
  ],
  '/earn/app-testing': [
    ['Do I need special skills to test apps?', 'No special testing background is required for everyday-user tasks. Follow the checklist and complete every listed milestone.'],
    ['When is the reward credited?', 'The reward is credited after the app provider confirms the required milestone or completion.'],
    ['Is it free to start?', 'Yes. Registration and browsing available tasks are free.'],
  ],
  '/earn/paid-surveys': [
    ['How long do surveys take?', 'Duration varies by provider. Review the expected length and requirements on the survey page before starting.'],
    ['Can a survey screen me out?', 'Yes. A provider may require a specific audience. Check eligibility first and answer profile questions accurately.'],
    ['Is it free to start?', 'Yes. Registration and browsing available surveys are free.'],
  ],
  '/micro-jobs': [
    ['Do I need experience or a resume for micro jobs?', 'No resume is required for the simple tasks listed on PicoWorker. Each task provides its own requirements.'],
    ['When is a micro-job reward credited?', 'The listed reward is credited after the task or provider confirms that every required step was completed.'],
    ['How is this different from Picoworkers or SproutGigs?', 'PicoWorker at picoworker.xyz is an independent platform and is not related to Picoworkers or SproutGigs.'],
  ],
  '/picoworkers-alternative': [
    ['Is PicoWorker the same as Picoworkers or SproutGigs?', 'No. Picoworkers rebranded to SproutGigs and is a separate company. PicoWorker.xyz is an independent marketplace for eligible online tasks and verified rewards.'],
    ['How do task rewards work on PicoWorker?', 'Choose an eligible task, complete every listed requirement and wait for PicoWorker or the provider to confirm the result.'],
    ['Is PicoWorker free to join?', 'Yes. Registration and browsing available tasks are free.'],
  ],
  '/app': [
    ['Is there a PicoWorker app for Android or iPhone?', 'PicoWorker is a web app that installs from your browser. Open picoworker.xyz, choose Add to Home Screen, and it behaves like a native app on both Android and iPhone.'],
    ['Is there a PicoWorker APK download?', 'No. There is no official APK, and you should not install one from third party sites. Use picoworker.xyz in your browser instead.'],
    ['Does PicoWorker work on desktop?', 'Yes. The same account works in any modern browser on phone, tablet and desktop.'],
  ],
  '/is-picoworker-legit': [
    ['Is PicoWorker free to join?', 'Yes. Registration and browsing available tasks are free.'],
    ['Why do available tasks change?', 'Campaigns have country, device, audience and capacity limits, so the list can change throughout the day.'],
    ['When is a reward confirmed?', 'Confirmation occurs after PicoWorker or the provider verifies that the published requirements were completed.'],
  ],
  '/how-picoworker-works': coreFaqs.slice(1, 9),
  '/guides/complete-online-microtasks-safely': [
    ['Is opening an offer enough to complete a microtask?', 'No. Opening the provider page only begins the journey. Complete every listed milestone and wait for the task or provider to verify the result.'],
    ['Should I use a VPN if a task is unavailable in my country?', 'No. Use your real location and complete only tasks for which you are eligible. A VPN or proxy can invalidate tracking and cause rejection.'],
    ['What should I do if a microtask asks for my password?', 'Do not share it. A legitimate PicoWorker task or support representative should not request your account password, one-time code or recovery credentials.'],
    ['Why is my completed microtask still pending?', 'Pending means verification is not finished. Direct tasks and provider offers can have different review times, so keep permitted confirmation details and wait for the final status.'],
    ['Can I complete the same new-user offer twice?', 'No. If an offer requires a new user, a previous install, registration or completion can make you ineligible even if you use another account.'],
  ],
  '/faq': coreFaqs,
  '/about': [coreFaqs[0], coreFaqs[2], coreFaqs[9], coreFaqs[10], coreFaqs[11]],
  '/ai-agents': [
    ['Can an agent create its own account?', 'Yes. POST /register returns an API key with no email or password. Registration is rate limited, and the account must be funded before it can launch a campaign.'],
    ['What if the agent loses its key?', 'The key is the account, so treat it like a wallet seed. To make an account recoverable, call POST /claim with a real email address: after that a human can use the normal forgot password flow on the login page to access the account in the app, see its campaigns and balance, and mint a fresh key or revoke the lost one.'],
    ['Can my agent complete follow and watch tasks?', 'No. Social engagement tasks are humans only, enforced at the database. Agents can only complete tasks a poster explicitly marked as agent-eligible, such as data collection and research work.'],
    ['How does my agent launch a campaign?', 'Authenticate with an API key, fund the campaign account, create the campaign and call the launch endpoint when its configuration is ready.'],
    ['Can an agent earn task rewards?', 'Agents can complete only tasks explicitly marked as agent-eligible. Human-only tasks remain unavailable to automated participants.'],
  ],
}

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

function setMeta(html, page) {
  const url = pageUrl(page.path)
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
  const faqs = pageFaqs[page.path] ?? []
  const sectionMarkup = page.sections.map(([heading, body]) => `
      <section>
        <h2>${escapeHtml(heading)}</h2>
        <p>${escapeHtml(body)}</p>
      </section>`).join('')
  const faqMarkup = faqs.length ? `
      <section id="questions">
        <h2>Questions and direct answers</h2>
        ${faqs.map(([question, answer]) => `<article>
          <h3>${escapeHtml(question)}</h3>
          <p>${escapeHtml(answer)}</p>
        </article>`).join('\n        ')}
      </section>` : ''
  const nav = pages
    .map((item) => `<a href="${pageHref(item.path)}">${escapeHtml(item.path === '/' ? 'PicoWorker home' : item.h1)}</a>`)
    .join(' · ')
  return `<div id="root">
    <header style="padding:20px;border-bottom:1px solid #292c36"><a href="/" style="font-weight:800">PicoWorker.xyz</a></header>
    <main style="max-width:820px;margin:0 auto;padding:48px 22px 64px">
      <article>
        <h1 style="font-size:clamp(32px,7vw,54px);line-height:1.08">${escapeHtml(page.h1)}</h1>
        <p style="font-size:18px;line-height:1.7;color:#c7c9d4">${escapeHtml(page.intro)}</p>
        <p style="font-size:13px;color:#8f929e">Reviewed 30 July 2026</p>
        ${sectionMarkup}
        ${faqMarkup}
        <p><a href="/login">Create an account or sign in</a></p>
      </article>
      <nav aria-label="Related PicoWorker pages" style="margin-top:48px;line-height:2">${nav}</nav>
    </main>
  </div>`
}

function structuredData(page) {
  const url = pageUrl(page.path)
  const faqs = pageFaqs[page.path] ?? []
  const pageType = page.article ? 'Article' : page.path === '/about' ? 'AboutPage' : page.path === '/faq' ? 'FAQPage' : 'WebPage'
  const pageId = `${url}#webpage`
  const organizationId = `${origin}/#organization`
  const websiteId = `${origin}/#website`
  const graph = [
    {
      '@type': 'Organization',
      '@id': organizationId,
      name: 'PicoWorker',
      alternateName: ['Pico Worker', 'PicoWorker.xyz'],
      url: `${origin}/`,
      logo: { '@type': 'ImageObject', url: `${origin}/logo.png` },
      description: 'An independent two-sided marketplace for simple online tasks and verified results.',
      email: 'hello@picoworker.xyz',
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: 'hello@picoworker.xyz',
        url: `${origin}/faq/`,
      },
      sameAs: ['https://x.com/picoworker', 'https://whatsapp.com/channel/0029Vb83K7C3WHTNsVZmkn2k'],
    },
    {
      '@type': 'WebSite',
      '@id': websiteId,
      name: 'PicoWorker',
      alternateName: ['Pico Worker', 'picoworker.xyz'],
      url: `${origin}/`,
      publisher: { '@id': organizationId },
      inLanguage: 'en',
    },
    {
      '@type': pageType,
      '@id': pageId,
      name: page.title,
      headline: page.h1,
      description: page.description,
      url,
      dateModified: '2026-07-30',
      inLanguage: 'en',
      isPartOf: { '@id': websiteId },
      about: { '@id': organizationId },
      ...(page.article ? {
        datePublished: page.datePublished,
        dateModified: '2026-07-30',
        author: { '@id': organizationId },
        publisher: { '@id': organizationId },
        mainEntityOfPage: { '@id': pageId },
      } : {}),
      breadcrumb: { '@id': `${url}#breadcrumb` },
      ...(faqs.length ? {
        mainEntity: faqs.map(([question, answer]) => ({
          '@type': 'Question',
          name: question,
          acceptedAnswer: { '@type': 'Answer', text: answer },
        })),
      } : {}),
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: page.path === '/' ? [
        { '@type': 'ListItem', position: 1, name: 'PicoWorker', item: `${origin}/` },
      ] : [
        { '@type': 'ListItem', position: 1, name: 'PicoWorker', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: page.h1, item: url },
      ],
    },
  ]
  if (page.path === '/') {
    graph.push({
      '@type': 'SoftwareApplication',
      name: 'PicoWorker',
      url: `${origin}/`,
      operatingSystem: 'Web, iOS, Android',
      applicationCategory: 'BusinessApplication',
      description: page.description,
      offers: { '@type': 'Offer', description: 'Free registration' },
      publisher: { '@id': organizationId },
    })
  }
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })}</script>`
}

const base = await readFile(new URL('index.html', dist), 'utf8')

for (const page of pages) {
  let html = setMeta(base, page)
  html = html.replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '')
  html = html.replace(/<div id="root">[\s\S]*?<\/div>\s*<noscript>/, `${pageMarkup(page)}\n    <noscript>`)
  html = html.replace('</head>', `    ${structuredData(page)}\n  </head>`)
  const file = page.path === '/' ? new URL('index.html', dist) : new URL(`.${page.path}/index.html`, dist)
  await mkdir(dirname(file.pathname), { recursive: true })
  await writeFile(file, html)
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((page) => `  <url><loc>${pageUrl(page.path)}</loc><lastmod>2026-07-30</lastmod></url>`).join('\n')}
</urlset>
`
await writeFile(join(dist.pathname, 'sitemap.xml'), sitemap)

console.log(`Generated ${pages.length} crawlable SEO pages.`)
