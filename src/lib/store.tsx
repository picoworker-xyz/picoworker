import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  LedgerEntry,
  Mode,
  Profile,
  Referral,
  Task,
  TaskCompletion,
  TaskType,
  Wallet,
  Withdrawal,
} from './types'
import {
  seedCompletions,
  seedLedger,
  seedProfiles,
  seedReferrals,
  seedTasks,
  seedWallets,
  DEMO_EARNER_ID,
} from '../data/seed'
import { submitWithdrawal, type WithdrawalInput } from './payments'
import type { FraudSignals } from './fraud'

// ----------------------------------------------------------------------------
// Local persistent mock backing the whole app. Every method here has a 1:1
// equivalent in Supabase (auth.signUp, table inserts, the complete_task RPC).
// Swapping to Supabase means reimplementing these methods against `supabase`
// without touching any screen. See lib/supabase.ts.
// ----------------------------------------------------------------------------

const KEY = 'picoworker:db:v2'
const SESSION_KEY = 'picoworker:session:v2'

interface DB {
  // auth: email -> {password, profileId, deviceHash?, ip?}
  accounts: Record<string, { password: string; profileId: string; deviceHash?: string; ip?: string | null }>
  profiles: Profile[]
  wallets: Wallet[]
  tasks: Task[]
  completions: TaskCompletion[]
  ledger: LedgerEntry[]
  withdrawals: Withdrawal[]
  referrals: Referral[]
}

function freshDB(): DB {
  return {
    accounts: {
      'arman@demo.xyz': { password: 'password', profileId: DEMO_EARNER_ID },
      'acme@demo.xyz': { password: 'password', profileId: 'demo-business' },
    },
    profiles: seedProfiles(),
    wallets: seedWallets(),
    tasks: seedTasks(),
    completions: seedCompletions(),
    ledger: seedLedger(),
    withdrawals: [],
    referrals: seedReferrals(),
  }
}

function loadDB(): DB {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as DB
  } catch {
    /* ignore */
  }
  const db = freshDB()
  localStorage.setItem(KEY, JSON.stringify(db))
  return db
}

function saveDB(db: DB) {
  localStorage.setItem(KEY, JSON.stringify(db))
}

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`

// ----------------------------------------------------------------------------

export interface StoreApi {
  ready: boolean
  userId: string | null
  profile: Profile | null
  wallet: Wallet | null

  signUp(email: string, password: string, displayName: string, mode: Mode, fraud?: FraudSignals): Promise<string>
  signIn(email: string, password: string): Promise<void>
  signOut(): void

  switchMode(): void

  // reads
  liveTasks(): Task[]
  task(id: string): Task | undefined
  myCampaigns(): Task[]
  ledgerFor(profileId: string): LedgerEntry[]
  completionsForTask(taskId: string): TaskCompletion[]
  referralsFor(profileId: string): Referral[]
  hasCompleted(taskId: string): boolean

  // earner mutations
  completeTask(taskId: string, proofUrl?: string): Promise<{ reward: number; balance: number; manual: boolean }>
  withdraw(input: WithdrawalInput): Promise<{ netReceived: number; balance: number }>
  claimDailyBonus(): { amount: number; balance: number } | null

  verifyIdentity(): void

  // business mutations
  createTask(draft: TaskDraft): Promise<Task>
  fundAndLaunch(taskId: string): Promise<{ ok: boolean; reason?: string }>
  pauseCampaign(taskId: string): void
  addFunds(amount: number): number

  // provider review
  pendingProofs(): { completion: TaskCompletion; task: Task }[]
  reviewProof(completionId: string, approve: boolean): void
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
}

export const StoreCtx = createContext<StoreApi | null>(null)

export function MockStoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const loaded = loadDB()
    setDb(loaded)
    setUserId(localStorage.getItem(SESSION_KEY))
  }, [])

  const commit = (next: DB) => {
    saveDB(next)
    setDb({ ...next })
  }

  const api = useMemo<StoreApi>(() => {
    const get = () => db as DB
    const profileById = (id: string | null) =>
      (id && get().profiles.find((p) => p.id === id)) || null
    const walletById = (id: string | null) =>
      (id && get().wallets.find((w) => w.profile_id === id)) || null

    const addLedger = (
      next: DB,
      profileId: string,
      amount: number,
      type: LedgerEntry['type'],
      title: string,
      refId: string | null,
      balanceAfter: number,
    ) => {
      next.ledger.unshift({
        id: uid('l'),
        profile_id: profileId,
        amount,
        type,
        title,
        ref_id: refId,
        balance_after: balanceAfter,
        created_at: new Date().toISOString(),
      })
    }

    return {
      ready: db !== null,
      userId,
      profile: profileById(userId),
      wallet: walletById(userId),

      async signUp(email, password, displayName, mode, fraud) {
        const next = get()
        const key = email.toLowerCase().trim()
        if (next.accounts[key]) throw new Error('An account with this email already exists.')
        // One account per person: block a second signup from the same device.
        if (fraud?.deviceHash) {
          const dup = Object.values(next.accounts).some((a) => a.deviceHash === fraud.deviceHash)
          if (dup) throw new Error('We detected an existing PicoWorker account on this device. Only one account per person is allowed.')
        }
        const id = uid('user')
        const code = displayName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase() || 'FRIEND'
        next.accounts[key] = { password, profileId: id, deviceHash: fraud?.deviceHash, ip: fraud?.ip ?? null }
        next.profiles.push({
          id,
          display_name: displayName,
          mode,
          business_name: mode === 'business' ? displayName : null,
          level: mode === 'business' ? 'Business' : 'Bronze',
          member_since: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          payout_wallet: null,
          identity_verified: false,
          referral_code: code,
          referred_by: null,
          streak_days: 0,
          last_active: new Date().toISOString(),
          tasks_done: 0,
          created_at: new Date().toISOString(),
        })
        next.wallets.push({
          profile_id: id,
          earner_balance: mode === 'earner' ? 0.05 : 0, // $0.05 welcome bonus
          business_escrow: 0,
          lifetime_earned: mode === 'earner' ? 0.05 : 0,
        })
        if (mode === 'earner') {
          addLedger(next, id, 0.05, 'welcome_bonus', 'Welcome bonus', null, 0.05)
        }
        commit(next)
        localStorage.setItem(SESSION_KEY, id)
        setUserId(id)
        return id
      },

      async signIn(email, password) {
        const acct = get().accounts[email.toLowerCase().trim()]
        if (!acct || acct.password !== password) {
          throw new Error('Wrong email or password.')
        }
        localStorage.setItem(SESSION_KEY, acct.profileId)
        setUserId(acct.profileId)
      },

      signOut() {
        localStorage.removeItem(SESSION_KEY)
        setUserId(null)
      },

      switchMode() {
        if (!userId) return
        const next = get()
        const p = next.profiles.find((x) => x.id === userId)
        if (!p) return
        p.mode = p.mode === 'earner' ? 'business' : 'earner'
        if (p.mode === 'business' && !p.business_name) p.business_name = p.display_name
        commit(next)
      },

      liveTasks() {
        const completed = new Set(
          get()
            .completions.filter((c) => c.earner_id === userId)
            .map((c) => c.task_id),
        )
        return get()
          .tasks.filter(
            (t) =>
              t.status === 'live' &&
              t.owner_id !== userId &&
              t.done_count < t.goal_count &&
              !completed.has(t.id),
          )
          .sort((a, b) => Number(b.featured) - Number(a.featured))
      },

      task(id) {
        return get().tasks.find((t) => t.id === id)
      },

      myCampaigns() {
        return get()
          .tasks.filter((t) => t.owner_id === userId)
          .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
      },

      ledgerFor(profileId) {
        return get().ledger.filter((l) => l.profile_id === profileId)
      },

      completionsForTask(taskId) {
        return get().completions.filter((c) => c.task_id === taskId)
      },

      referralsFor(profileId) {
        return get().referrals.filter((r) => r.referrer_id === profileId)
      },

      hasCompleted(taskId) {
        return get().completions.some((c) => c.task_id === taskId && c.earner_id === userId)
      },

      // ---- earner: the atomic marketplace transaction ----
      async completeTask(taskId, proofUrl) {
        const next = get()
        const t = next.tasks.find((x) => x.id === taskId)
        const earnerWallet = next.wallets.find((w) => w.profile_id === userId)
        if (!t || !earnerWallet || !userId) throw new Error('Task unavailable.')

        const manual = !t.auto_verify
        const status = manual ? 'pending_proof' : 'verified'

        next.completions.push({
          id: uid('c'),
          task_id: taskId,
          earner_id: userId,
          status,
          proof_url: proofUrl ?? null,
          reward: t.reward,
          created_at: new Date().toISOString(),
        })

        // Manual-proof tasks pay only after review — no balance move yet.
        if (manual) {
          commit(next)
          return { reward: t.reward, balance: earnerWallet.earner_balance, manual: true }
        }

        // Auto-verify: move money now. Release escrow from the task owner,
        // credit the earner, bump counters + streak. (Supabase: complete_task RPC.)
        const ownerWallet = next.wallets.find((w) => w.profile_id === t.owner_id)
        earnerWallet.earner_balance = +(earnerWallet.earner_balance + t.reward).toFixed(2)
        earnerWallet.lifetime_earned = +(earnerWallet.lifetime_earned + t.reward).toFixed(2)
        if (ownerWallet) {
          ownerWallet.business_escrow = +Math.max(0, ownerWallet.business_escrow - t.reward).toFixed(2)
          addLedger(next, t.owner_id, -t.reward, 'escrow_release', `${t.title}`, t.id, ownerWallet.business_escrow)
        }
        t.done_count += 1
        if (t.done_count >= t.goal_count) t.status = 'complete'

        const earner = next.profiles.find((p) => p.id === userId)
        if (earner) {
          earner.tasks_done += 1
          earner.streak_days = Math.max(1, earner.streak_days) // keep streak alive
          earner.last_active = new Date().toISOString()
        }
        addLedger(next, userId, t.reward, 'task_reward', t.title, t.id, earnerWallet.earner_balance)

        commit(next)
        return { reward: t.reward, balance: earnerWallet.earner_balance, manual: false }
      },

      async withdraw(input) {
        const next = get()
        const w = next.wallets.find((x) => x.profile_id === userId)
        if (!w || !userId) throw new Error('No wallet.')
        if (input.amount > w.earner_balance) throw new Error('Amount exceeds balance.')

        const res = await submitWithdrawal(input) // payout seam
        w.earner_balance = +(w.earner_balance - input.amount).toFixed(2)
        next.withdrawals.unshift({
          id: uid('w'),
          profile_id: userId,
          amount: input.amount,
          asset: input.asset,
          network: input.network,
          address: input.address,
          fee: res.fee,
          status: 'sent',
          created_at: new Date().toISOString(),
        })
        addLedger(next, userId, -input.amount, 'withdrawal', `Withdraw · ${input.network}`, res.txRef, w.earner_balance)
        commit(next)
        return { netReceived: res.netReceived, balance: w.earner_balance }
      },

      claimDailyBonus() {
        if (!userId) return null
        const next = get()
        const w = next.wallets.find((x) => x.profile_id === userId)
        const p = next.profiles.find((x) => x.id === userId)
        if (!w || !p) return null
        const today = new Date().toDateString()
        if (p.last_active && new Date(p.last_active).toDateString() === today && p.streak_days > 0 && (p as any)._claimed === today) {
          return null
        }
        const bonus = 0.05
        w.earner_balance = +(w.earner_balance + bonus).toFixed(2)
        w.lifetime_earned = +(w.lifetime_earned + bonus).toFixed(2)
        p.streak_days += 1
        ;(p as any)._claimed = today
        p.last_active = new Date().toISOString()
        addLedger(next, userId, bonus, 'welcome_bonus', "Daily streak bonus", null, w.earner_balance)
        commit(next)
        return { amount: bonus, balance: w.earner_balance }
      },

      verifyIdentity() {
        if (!userId) return
        const next = get()
        const p = next.profiles.find((x) => x.id === userId)
        if (p) p.identity_verified = true
        commit(next)
      },

      // ---- business ----
      async createTask(draft) {
        const next = get()
        const task: Task = {
          id: uid('task'),
          owner_id: userId!,
          type: draft.type,
          title: draft.title,
          subtitle: draft.subtitle,
          target: draft.target || null,
          reward: draft.reward,
          goal_count: draft.goal_count,
          done_count: 0,
          auto_verify: draft.auto_verify,
          status: 'paused', // not visible until funded
          fee: 0.1,
          est_seconds: draft.type === 'survey' ? 240 : draft.type === 'app_install' ? 120 : 30,
          category: draft.category,
          featured: false,
          created_at: new Date().toISOString(),
        }
        next.tasks.unshift(task)
        commit(next)
        return task
      },

      async fundAndLaunch(taskId) {
        const next = get()
        const t = next.tasks.find((x) => x.id === taskId)
        const w = next.wallets.find((x) => x.profile_id === userId)
        if (!t || !w) return { ok: false, reason: 'Not found.' }
        const rewards = +(t.reward * t.goal_count).toFixed(2)
        const fee = +(rewards * t.fee).toFixed(2)
        const total = +(rewards + fee).toFixed(2)
        if (total > w.business_escrow) return { ok: false, reason: 'Not enough escrow. Add funds.' }
        w.business_escrow = +(w.business_escrow - total).toFixed(2)
        t.status = 'live'
        // The held budget conceptually moves into this campaign; escrow already
        // reflects it. We log the hold for the activity feed.
        next.ledger.unshift({
          id: uid('l'),
          profile_id: userId!,
          amount: -total,
          type: 'escrow_hold',
          title: `Funded: ${t.title}`,
          ref_id: t.id,
          balance_after: w.business_escrow,
          created_at: new Date().toISOString(),
        })
        commit(next)
        return { ok: true }
      },

      pauseCampaign(taskId) {
        const next = get()
        const t = next.tasks.find((x) => x.id === taskId)
        if (!t) return
        t.status = t.status === 'paused' ? 'live' : 'paused'
        commit(next)
      },

      addFunds(amount) {
        const next = get()
        const w = next.wallets.find((x) => x.profile_id === userId)
        if (!w) return 0
        w.business_escrow = +(w.business_escrow + amount).toFixed(2)
        next.ledger.unshift({
          id: uid('l'),
          profile_id: userId!,
          amount,
          type: 'deposit',
          title: 'Deposit · USDC',
          ref_id: null,
          balance_after: w.business_escrow,
          created_at: new Date().toISOString(),
        })
        commit(next)
        return w.business_escrow
      },

      // ---- provider review queue ----
      pendingProofs() {
        const mine = new Set(get().tasks.filter((t) => t.owner_id === userId).map((t) => t.id))
        return get()
          .completions.filter((c) => c.status === 'pending_proof' && mine.has(c.task_id))
          .map((completion) => ({ completion, task: get().tasks.find((t) => t.id === completion.task_id)! }))
          .filter((x) => x.task)
      },

      reviewProof(completionId, approve) {
        const next = get()
        const c = next.completions.find((x) => x.id === completionId)
        if (!c || c.status !== 'pending_proof') return
        const t = next.tasks.find((x) => x.id === c.task_id)
        if (!t) return
        if (!approve) {
          c.status = 'rejected'
          commit(next)
          return
        }
        c.status = 'approved'
        // Pay the earner if they have a wallet here (demo earners may not), and
        // release the held escrow from the owner. (Supabase: a transactional RPC.)
        const ew = next.wallets.find((w) => w.profile_id === c.earner_id)
        if (ew) {
          ew.earner_balance = +(ew.earner_balance + c.reward).toFixed(2)
          ew.lifetime_earned = +(ew.lifetime_earned + c.reward).toFixed(2)
          addLedger(next, c.earner_id, c.reward, 'task_reward', t.title, t.id, ew.earner_balance)
        }
        const ow = next.wallets.find((w) => w.profile_id === t.owner_id)
        if (ow) {
          ow.business_escrow = +Math.max(0, ow.business_escrow - c.reward).toFixed(2)
          addLedger(next, t.owner_id, -c.reward, 'escrow_release', t.title, t.id, ow.business_escrow)
        }
        t.done_count += 1
        if (t.done_count >= t.goal_count) t.status = 'complete'
        commit(next)
      },
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, userId])

  return <StoreCtx.Provider value={api}>{children}</StoreCtx.Provider>
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
