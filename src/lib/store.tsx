import { createContext, useContext } from 'react'
import type { LedgerEntry, Mode, Profile, Referral, Task, TaskCompletion, TaskType, Wallet } from './types'
import type { WithdrawalInput } from './payments'
import type { FraudSignals } from './fraud'

// Shared store contract. The live implementation is SupabaseStoreProvider
// (lib/supabaseStore.tsx) — there is no mock; the app always uses the backend.

export interface StoreApi {
  ready: boolean
  userId: string | null
  profile: Profile | null
  wallet: Wallet | null

  signUp(email: string, password: string, displayName: string, mode: Mode, fraud?: FraudSignals, refCode?: string): Promise<{ userId: string; needsConfirmation: boolean }>
  signIn(email: string, password: string): Promise<void>
  signOut(): void
  refresh(): Promise<void>

  switchMode(): void

  // reads
  liveTasks(): Task[]
  task(id: string): Task | undefined
  myCampaigns(): Task[]
  ledgerFor(profileId: string): LedgerEntry[]
  completionsForTask(taskId: string): TaskCompletion[]
  myCompletions(): TaskCompletion[]
  referralsFor(profileId: string): Referral[]
  hasCompleted(taskId: string): boolean

  // earner mutations
  completeTask(taskId: string, proofUrl?: string, note?: string, proofUrls?: string[]): Promise<{ reward: number; balance: number; manual: boolean }>
  withdraw(input: WithdrawalInput): Promise<{ netReceived: number; balance: number }>
  claimDailyBonus(): Promise<{ claimed: boolean; amount: number; balance: number; day: number }>

  verifyIdentity(): void

  // business mutations
  createTask(draft: TaskDraft): Promise<Task>
  fundAndLaunch(taskId: string): Promise<{ ok: boolean; reason?: string }>
  pauseCampaign(taskId: string): void
  addFunds(amount: number): number

  // provider review
  pendingProofs(): { completion: TaskCompletion; task: Task }[]
  allProofs(): { completion: TaskCompletion; task: Task }[]
  reviewProof(completionId: string, approve: boolean, reason?: string): void
}

export interface TaskDraft {
  type: TaskType
  title: string
  subtitle: string
  target: string
  reward: number
  goal_count: number
  auto_verify: boolean
  category: string
  proof_instructions?: string
  reference_images?: string[]
  screenshots?: number
  screenshot_specs?: string[]
}

export const StoreCtx = createContext<StoreApi | null>(null)

export function useStore(): StoreApi {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore must be used within a StoreProvider')
  return ctx
}
