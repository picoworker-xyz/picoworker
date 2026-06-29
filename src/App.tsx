import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useStore } from './lib/store'
import { AppShell } from './components/AppShell'

import { Landing } from './features/marketing/Landing'
import { Login } from './features/auth/Login'
import { ResetPassword } from './features/auth/ResetPassword'
import { RefCapture } from './features/auth/RefCapture'
import { Onboarding } from './features/auth/Onboarding'
import { EarnFeed } from './features/earner/EarnFeed'
import { TaskFlow } from './features/earner/TaskFlow'
import { ProofUpload } from './features/earner/ProofUpload'
import { TaskComplete } from './features/earner/TaskComplete'
import { Wallet } from './features/earner/Wallet'
import { CashOut } from './features/earner/CashOut'
import { PayoutAddress } from './features/earner/PayoutAddress'
import { Refer } from './features/earner/Refer'
import { Rewards } from './features/earner/Rewards'
import { Profile } from './features/earner/Profile'
import { Notifications } from './features/earner/Notifications'
import { Leaderboard } from './features/earner/Leaderboard'
import { VerifyIdentity } from './features/earner/VerifyIdentity'
import { Support } from './features/earner/Support'
import { SurveyTask } from './features/earner/SurveyTask'
import { TaskRejected } from './features/earner/TaskRejected'
import { MySubmissions } from './features/earner/MySubmissions'
import { MorePage } from './features/MorePage'
import { SubmissionDetail } from './features/earner/SubmissionDetail'
import { SwitchAccount } from './features/business/SwitchAccount'
import { Dashboard } from './features/business/Dashboard'
import { CreateTask } from './features/business/CreateTask'
import { FundLaunch } from './features/business/FundLaunch'
import { CampaignAnalytics } from './features/business/CampaignAnalytics'
import { AddFunds } from './features/business/AddFunds'
import { AdminDashboard } from './features/admin/AdminDashboard'
import { Targeting } from './features/business/Targeting'
import { ReviewQueue } from './features/business/ReviewQueue'
import { ProofDetail } from './features/business/ProofDetail'
import { BusinessSignup } from './features/business/BusinessSignup'
import { Terms, Privacy } from './features/marketing/Legal'

/** Guard + app chrome (sidebar / mobile tabs) for authenticated screens. */
function Shell({ children }: { children: ReactNode }) {
  const { userId, ready } = useStore()
  const loc = useLocation()
  if (!ready) return null
  if (!userId) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  return <AppShell>{children}</AppShell>
}

/** Root: marketing site when logged out, app home when logged in. */
function Home() {
  const { userId, profile, ready } = useStore()
  if (!ready) return null
  if (!userId) return <Landing />
  if (profile?.mode === 'business') return <Navigate to="/business" replace />
  return (
    <AppShell>
      <EarnFeed />
    </AppShell>
  )
}

export default function App() {
  const { ready } = useStore()
  if (!ready) return null

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/r/:code" element={<RefCapture />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/business/signup" element={<BusinessSignup />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />

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
      <Route path="/submissions/:id" element={<Shell><SubmissionDetail /></Shell>} />
      <Route path="/switch" element={<Shell><SwitchAccount /></Shell>} />

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
  )
}
