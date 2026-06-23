// Shared domain types for PicoWorker.
// These mirror the Supabase tables in supabase/schema.sql.

export type Mode = 'earner' | 'business'

export type TaskType =
  | 'follow_x'
  | 'yt_views'
  | 'app_install'
  | 'survey'
  | 'visit_site'
  | 'custom'

export type TaskStatus = 'live' | 'paused' | 'complete'

export type CompletionStatus = 'verified' | 'pending_proof' | 'approved' | 'rejected'

export type LedgerType =
  | 'task_reward'
  | 'withdrawal'
  | 'deposit'
  | 'escrow_hold'
  | 'escrow_release'
  | 'referral_bonus'
  | 'welcome_bonus'

export type WithdrawalStatus = 'pending' | 'sent' | 'failed'

export interface Profile {
  id: string
  display_name: string
  mode: Mode
  business_name: string | null
  level: string
  member_since: string
  payout_wallet: string | null
  identity_verified: boolean
  referral_code: string
  referred_by: string | null
  streak_days: number
  last_active: string | null
  tasks_done: number
  is_admin?: boolean
  created_at: string
}

export interface Wallet {
  profile_id: string
  earner_balance: number
  business_escrow: number
  lifetime_earned: number
}

export interface Task {
  id: string
  owner_id: string
  type: TaskType
  title: string
  subtitle: string | null
  target: string | null // handle / url
  reward: number
  goal_count: number
  done_count: number
  auto_verify: boolean
  status: TaskStatus
  fee: number
  est_seconds: number
  category: string // Social | Surveys | Apps | Ads | Watch
  featured: boolean
  created_at: string
}

export interface TaskCompletion {
  id: string
  task_id: string
  earner_id: string
  status: CompletionStatus
  proof_url: string | null
  proof_note: string | null
  reward: number
  created_at: string
}

export interface LedgerEntry {
  id: string
  profile_id: string
  amount: number
  type: LedgerType
  title: string
  ref_id: string | null
  balance_after: number
  created_at: string
}

export interface Withdrawal {
  id: string
  profile_id: string
  amount: number
  asset: 'USDC' | 'USDT'
  network: string
  address: string
  fee: number
  status: WithdrawalStatus
  created_at: string
}

export interface Referral {
  id: string
  referrer_id: string
  referred_id: string
  display_name: string
  status: 'joined' | 'active'
  tasks: number
  earnings: number
  created_at: string
}
