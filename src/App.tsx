import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useStore } from './lib/store'
import { AppShell } from './components/AppShell'
import { BrandMark } from './components/layout'

import { Landing } from './features/marketing/Landing'
import { Login } from './features/auth/Login'
import { LoginDemo } from './features/auth/LoginDemo'
import { ResetPassword } from './features/auth/ResetPassword'
import { RefCapture } from './features/auth/RefCapture'
import { Onboarding } from './features/auth/Onboarding'
import { Terms, Privacy } from './features/marketing/Legal'
import {
  EarnFollowAccounts,
  EarnWatchVideos,
  EarnAppTesting,
  EarnPaidSurveys,
  PicoworkersAlternative,
  AppPage,
  MicroJobs,
  IsLegit,
  AiAgents,
  PicoWorkerFaq,
  HowPicoWorkerWorks,
  AboutPicoWorker,
} from './features/marketing/SeoPages'
import { AgentDocs } from './features/marketing/AgentDocs'

// Route-level code splitting. The single 871KB bundle was downloaded by every
// visitor including Google's crawler on the marketing pages, which is what
// pushed mobile LCP past 2.5s. Marketing, auth and the SEO pages stay eager
// because those are the pages being measured; everything behind a login is
// fetched only when someone actually navigates to it.
const EarnFeed = lazy(() => import('./features/earner/EarnFeed').then((m) => ({ default: m.EarnFeed })))
const TaskFlow = lazy(() => import('./features/earner/TaskFlow').then((m) => ({ default: m.TaskFlow })))
const ProofUpload = lazy(() => import('./features/earner/ProofUpload').then((m) => ({ default: m.ProofUpload })))
const TaskComplete = lazy(() => import('./features/earner/TaskComplete').then((m) => ({ default: m.TaskComplete })))
const Wallet = lazy(() => import('./features/earner/Wallet').then((m) => ({ default: m.Wallet })))
const CashOut = lazy(() => import('./features/earner/CashOut').then((m) => ({ default: m.CashOut })))
const PayoutAddress = lazy(() => import('./features/earner/PayoutAddress').then((m) => ({ default: m.PayoutAddress })))
const Refer = lazy(() => import('./features/earner/Refer').then((m) => ({ default: m.Refer })))
const Rewards = lazy(() => import('./features/earner/Rewards').then((m) => ({ default: m.Rewards })))
const Profile = lazy(() => import('./features/earner/Profile').then((m) => ({ default: m.Profile })))
const Notifications = lazy(() => import('./features/earner/Notifications').then((m) => ({ default: m.Notifications })))
const Leaderboard = lazy(() => import('./features/earner/Leaderboard').then((m) => ({ default: m.Leaderboard })))
const VerifyIdentity = lazy(() => import('./features/earner/VerifyIdentity').then((m) => ({ default: m.VerifyIdentity })))
const Support = lazy(() => import('./features/earner/Support').then((m) => ({ default: m.Support })))
const SurveyTask = lazy(() => import('./features/earner/SurveyTask').then((m) => ({ default: m.SurveyTask })))
const TaskRejected = lazy(() => import('./features/earner/TaskRejected').then((m) => ({ default: m.TaskRejected })))
const MySubmissions = lazy(() => import('./features/earner/MySubmissions').then((m) => ({ default: m.MySubmissions })))
const ProofOfIncome = lazy(() => import('./features/earner/ProofOfIncome').then((m) => ({ default: m.ProofOfIncome })))
const PaymentwallOffers = lazy(() => import('./features/earner/PaymentwallOffers').then((m) => ({ default: m.PaymentwallOffers })))
const KiwiwallOffers = lazy(() => import('./features/earner/KiwiwallOffers').then((m) => ({ default: m.KiwiwallOffers })))
const LootablyOffers = lazy(() => import('./features/earner/LootablyOffers').then((m) => ({ default: m.LootablyOffers })))
const TaskwallOffers = lazy(() => import('./features/earner/TaskwallOffers').then((m) => ({ default: m.TaskwallOffers })))
const NotikOffers = lazy(() => import('./features/earner/NotikOffers').then((m) => ({ default: m.NotikOffers })))
const CpxOffers = lazy(() => import('./features/earner/CpxOffers').then((m) => ({ default: m.CpxOffers })))
const MorePage = lazy(() => import('./features/MorePage').then((m) => ({ default: m.MorePage })))
const SubmissionDetail = lazy(() => import('./features/earner/SubmissionDetail').then((m) => ({ default: m.SubmissionDetail })))
const SwitchAccount = lazy(() => import('./features/business/SwitchAccount').then((m) => ({ default: m.SwitchAccount })))
const Dashboard = lazy(() => import('./features/business/Dashboard').then((m) => ({ default: m.Dashboard })))
const CreateTask = lazy(() => import('./features/business/CreateTask').then((m) => ({ default: m.CreateTask })))
const FundLaunch = lazy(() => import('./features/business/FundLaunch').then((m) => ({ default: m.FundLaunch })))
const CampaignAnalytics = lazy(() => import('./features/business/CampaignAnalytics').then((m) => ({ default: m.CampaignAnalytics })))
const AddFunds = lazy(() => import('./features/business/AddFunds').then((m) => ({ default: m.AddFunds })))
const AdminDashboard = lazy(() => import('./features/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })))
const Targeting = lazy(() => import('./features/business/Targeting').then((m) => ({ default: m.Targeting })))
const ReviewQueue = lazy(() => import('./features/business/ReviewQueue').then((m) => ({ default: m.ReviewQueue })))
const ProofDetail = lazy(() => import('./features/business/ProofDetail').then((m) => ({ default: m.ProofDetail })))
const Developers = lazy(() => import('./features/business/Developers').then((m) => ({ default: m.Developers })))

/** Guard + app chrome (sidebar / mobile tabs) for authenticated screens. */
function Shell({ children }: { children: ReactNode }) {
  const { userId, ready } = useStore()
  const loc = useLocation()
  if (!ready) return <AppLoading />
  if (!userId) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  return <AppShell>{children}</AppShell>
}

/** Root: marketing site when logged out, app home when logged in. */
function Home() {
  const { userId, profile, ready } = useStore()
  if (!ready) return <AppLoading />
  if (!userId) return <Landing />
  if (profile?.mode === 'business') return <Navigate to="/business" replace />
  return (
    <AppShell>
      <EarnFeed />
    </AppShell>
  )
}

export default function App() {
  return (
    <Suspense fallback={<AppLoading />}>
    <Routes>
      {/* Public */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/login-demo" element={<LoginDemo />} />
      <Route path="/login-demo-signin" element={<LoginDemo flow="signin" />} />
      <Route path="/earn-demo" element={<LoginDemo flow="earn" />} />
      <Route path="/login-demo-ur" element={<LoginDemo lang="ur" />} />
      <Route path="/reset-demo" element={<LoginDemo flow="reset" />} />
      <Route path="/cashout-demo" element={<LoginDemo flow="cashout" />} />
      <Route path="/rules-demo" element={<LoginDemo flow="rules" />} />
      <Route path="/rules-demo-ur" element={<LoginDemo flow="rules" lang="ur" />} />
      <Route path="/notpaid-demo" element={<LoginDemo flow="notpaid" />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/r/:code" element={<RefCapture />} />
      <Route path="/onboarding" element={<Onboarding />} />
      {/* Legacy: the dedicated business signup page is retired; signup lives on /login. */}
      <Route path="/business/signup" element={<Navigate to="/login" replace />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/earn/follow-accounts" element={<EarnFollowAccounts />} />
      <Route path="/earn/watch-videos" element={<EarnWatchVideos />} />
      <Route path="/earn/app-testing" element={<EarnAppTesting />} />
      <Route path="/earn/paid-surveys" element={<EarnPaidSurveys />} />
      <Route path="/picoworkers-alternative" element={<PicoworkersAlternative />} />
      <Route path="/app" element={<AppPage />} />
      <Route path="/micro-jobs" element={<MicroJobs />} />
      <Route path="/is-picoworker-legit" element={<IsLegit />} />
      <Route path="/how-picoworker-works" element={<HowPicoWorkerWorks />} />
      <Route path="/faq" element={<PicoWorkerFaq />} />
      <Route path="/about" element={<AboutPicoWorker />} />
      <Route path="/ai-agents" element={<AiAgents />} />
      <Route path="/ai-agents/docs" element={<AgentDocs />} />

      {/* Earner app */}
      <Route path="/task/:id" element={<Shell><TaskFlow /></Shell>} />
      <Route path="/task/:id/proof" element={<Shell><ProofUpload /></Shell>} />
      <Route path="/task/:id/survey" element={<Shell><SurveyTask /></Shell>} />
      <Route path="/task/:id/done" element={<Shell><TaskComplete /></Shell>} />
      <Route path="/task/:id/rejected" element={<Shell><TaskRejected /></Shell>} />
      <Route path="/wallet" element={<Shell><Wallet /></Shell>} />
      <Route path="/wallet/withdraw" element={<Shell><CashOut /></Shell>} />
      <Route path="/payout-address" element={<Shell><PayoutAddress /></Shell>} />
      <Route path="/refer" element={<Shell><Refer /></Shell>} />
      <Route path="/rewards" element={<Shell><Rewards /></Shell>} />
      <Route path="/notifications" element={<Shell><Notifications /></Shell>} />
      <Route path="/leaderboard" element={<Shell><Leaderboard /></Shell>} />
      <Route path="/verify" element={<Shell><VerifyIdentity /></Shell>} />
      <Route path="/support" element={<Shell><Support /></Shell>} />
      <Route path="/profile" element={<Shell><Profile /></Shell>} />
      <Route path="/more" element={<Shell><MorePage /></Shell>} />
      <Route path="/submissions" element={<Shell><MySubmissions /></Shell>} />
      <Route path="/proof-of-income" element={<Shell><ProofOfIncome /></Shell>} />
      <Route path="/offers/paymentwall" element={<Shell><PaymentwallOffers /></Shell>} />
      <Route path="/offers/taskwall" element={<Shell><TaskwallOffers /></Shell>} />
      <Route path="/offers/worldwide" element={<Shell><KiwiwallOffers /></Shell>} />
      <Route path="/offers/lootably" element={<Shell><LootablyOffers /></Shell>} />
      <Route path="/offers/surveys" element={<Shell><CpxOffers /></Shell>} />
      <Route path="/offers/bonus" element={<Shell><NotikOffers /></Shell>} />
      <Route path="/submissions/:id" element={<Shell><SubmissionDetail /></Shell>} />
      <Route path="/switch" element={<Shell><SwitchAccount /></Shell>} />
      <Route path="/developers" element={<Shell><Developers /></Shell>} />

      {/* Business app */}
      <Route path="/business" element={<Shell><Dashboard /></Shell>} />
      <Route path="/business/create" element={<Shell><CreateTask /></Shell>} />
      <Route path="/business/targeting" element={<Shell><Targeting /></Shell>} />
      <Route path="/business/fund" element={<Shell><FundLaunch /></Shell>} />
      <Route path="/business/review" element={<Shell><ReviewQueue /></Shell>} />
      <Route path="/business/review/:id" element={<Shell><ProofDetail /></Shell>} />
      <Route path="/business/campaign/:id" element={<Shell><CampaignAnalytics /></Shell>} />
      <Route path="/business/add-funds" element={<Shell><AddFunds /></Shell>} />

      {/* Team admin */}
      <Route path="/admin" element={<Shell><AdminDashboard /></Shell>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  )
}

function AppLoading() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-[var(--bg-page)] p-6">
      <div className="text-center" role="status" aria-live="polite">
        <div className="flex justify-center"><BrandMark size={42} /></div>
        <div className="mx-auto mt-5 h-7 w-7 animate-spin rounded-full border-2 border-[var(--line-2)] border-t-[var(--accent)]" />
        <div className="mt-3 font-head text-[13px] font-bold text-[var(--ink-3)]">Loading PicoWorker…</div>
      </div>
    </div>
  )
}