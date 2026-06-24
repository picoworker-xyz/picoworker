import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { StoreCtx, type StoreApi, type TaskDraft } from './store'
import type {
  LedgerEntry,
  Profile,
  Referral,
  Task,
  TaskCompletion,
  Wallet,
  Withdrawal,
} from './types'
import { submitWithdrawal, type WithdrawalInput } from './payments'

// Postgres `numeric` comes back from supabase-js as a string (to keep precision);
// coerce the money fields back to numbers so the UI math works.
const num = (v: unknown) => (v == null ? 0 : Number(v))
const mapProfile = (r: any): Profile => ({ ...r, streak_days: num(r.streak_days), tasks_done: num(r.tasks_done) })
const mapWallet = (r: any): Wallet => ({
  profile_id: r.profile_id,
  earner_balance: num(r.earner_balance),
  business_escrow: num(r.business_escrow),
  lifetime_earned: num(r.lifetime_earned),
})
const mapTask = (r: any): Task => ({ ...r, reward: num(r.reward), fee: num(r.fee), goal_count: num(r.goal_count), done_count: num(r.done_count), est_seconds: num(r.est_seconds) })
const mapCompletion = (r: any): TaskCompletion => ({ ...r, reward: num(r.reward) })
const mapLedger = (r: any): LedgerEntry => ({ ...r, amount: num(r.amount), balance_after: num(r.balance_after) })
const mapWithdrawal = (r: any): Withdrawal => ({ ...r, amount: num(r.amount), fee: num(r.fee) })
const mapReferral = (r: any): Referral => ({ ...r, tasks: num(r.tasks), earnings: num(r.earnings) })

interface Cache {
  profile: Profile | null
  wallet: Wallet | null
  tasks: Task[]
  completions: TaskCompletion[]
  ledger: LedgerEntry[]
  withdrawals: Withdrawal[]
  referrals: Referral[]
}
const EMPTY: Cache = { profile: null, wallet: null, tasks: [], completions: [], ledger: [], withdrawals: [], referrals: [] }

export function SupabaseStoreProvider({ children }: { children: ReactNode }) {
  const sb = supabase! // only mounted when supabaseEnabled
  const [ready, setReady] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [cache, setCache] = useState<Cache>(EMPTY)
  const uidRef = useRef<string | null>(null)

  const loadAll = useCallback(async (uid: string) => {
    const [p, w, tk, comp, led, wd, ref] = await Promise.all([
      sb.from('profiles').select('*').eq('id', uid).maybeSingle(),
      sb.from('wallets').select('*').eq('profile_id', uid).maybeSingle(),
      sb.from('tasks').select('*'), // RLS → live tasks + own campaigns
      sb.from('task_completions').select('*'),
      sb.from('ledger_entries').select('*').order('created_at', { ascending: false }),
      sb.from('withdrawals').select('*').order('created_at', { ascending: false }),
      sb.from('referrals').select('*'),
    ])
    setCache({
      profile: p.data ? mapProfile(p.data) : null,
      wallet: w.data ? mapWallet(w.data) : null,
      tasks: (tk.data ?? []).map(mapTask),
      completions: (comp.data ?? []).map(mapCompletion),
      ledger: (led.data ?? []).map(mapLedger),
      withdrawals: (wd.data ?? []).map(mapWithdrawal),
      referrals: (ref.data ?? []).map(mapReferral),
    })
  }, [sb])

  const onSession = useCallback(
    async (session: Session | null) => {
      const uid = session?.user?.id ?? null
      uidRef.current = uid
      setUserId(uid)
      if (uid) await loadAll(uid)
      else setCache(EMPTY)
      setReady(true)
    },
    [loadAll],
  )

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => onSession(data.session))
    const { data } = sb.auth.onAuthStateChange((_e, session) => onSession(session))
    return () => data.subscription.unsubscribe()
  }, [sb, onSession])

  const refresh = useCallback(async () => {
    if (uidRef.current) await loadAll(uidRef.current)
  }, [loadAll])

  const api = useMemo<StoreApi>(() => {
    const uid = userId
    return {
      ready,
      userId,
      profile: cache.profile,
      wallet: cache.wallet,

      async signUp(email, password, displayName, mode, fraud, refCode) {
        // One account per person: reject a second signup from the same device.
        if (fraud?.deviceHash) {
          const { count } = await sb.from('profiles').select('id', { count: 'exact', head: true }).eq('device_hash', fraud.deviceHash)
          if ((count ?? 0) > 0) throw new Error('We detected an existing PicoWorker account on this device. Only one account per person is allowed.')
        }
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName, mode, device_hash: fraud?.deviceHash ?? null, signup_ip: fraud?.ip ?? null, ref_code: refCode ?? null } },
        })
        if (error) throw new Error(error.message)
        const id = data.user?.id
        if (!id) throw new Error('Sign up failed.')
        if (data.session) {
          await onSession(data.session)
          return { userId: id, needsConfirmation: false }
        }
        // No session → Supabase requires email confirmation before sign-in.
        return { userId: id, needsConfirmation: true }
      },
      async signIn(email, password) {
        const { error } = await sb.auth.signInWithPassword({ email, password })
        if (error) throw new Error(error.message)
      },
      signOut() {
        void sb.auth.signOut()
      },
      refresh,
      switchMode() {
        if (!cache.profile) return
        const nextMode = cache.profile.mode === 'earner' ? 'business' : 'earner'
        setCache((c) => (c.profile ? { ...c, profile: { ...c.profile, mode: nextMode } } : c))
        void sb.from('profiles').update({ mode: nextMode, business_name: cache.profile.business_name ?? cache.profile.display_name }).eq('id', cache.profile.id).then(refresh)
      },

      // ---- reads (from cache) ----
      liveTasks() {
        const completed = new Set(cache.completions.filter((c) => c.earner_id === uid).map((c) => c.task_id))
        return cache.tasks
          .filter((t) => t.status === 'live' && t.owner_id !== uid && t.done_count < t.goal_count && !completed.has(t.id))
          .sort((a, b) => Number(b.featured) - Number(a.featured))
      },
      task: (id) => cache.tasks.find((t) => t.id === id),
      myCampaigns: () => cache.tasks.filter((t) => t.owner_id === uid).sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)),
      ledgerFor: (pid) => cache.ledger.filter((l) => l.profile_id === pid),
      completionsForTask: (taskId) => cache.completions.filter((c) => c.task_id === taskId),
      myCompletions: () => cache.completions.filter((c) => c.earner_id === uid).sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)),
      referralsFor: (pid) => cache.referrals.filter((r) => r.referrer_id === pid),
      hasCompleted: (taskId) => cache.completions.some((c) => c.task_id === taskId && c.earner_id === uid),

      // ---- earner mutations (RPC) ----
      async completeTask(taskId, proofUrl, note) {
        const { data, error } = await sb.rpc('complete_task', { p_task: taskId, p_proof: proofUrl ?? null, p_note: note ?? null })
        if (error) throw new Error(error.message)
        await refresh()
        const r = data as { manual: boolean; reward: number; balance?: number }
        return { reward: num(r.reward), balance: num(r.balance ?? cache.wallet?.earner_balance ?? 0), manual: !!r.manual }
      },
      async withdraw(input: WithdrawalInput) {
        await submitWithdrawal(input) // simulate broadcast latency / payout seam
        const { data, error } = await sb.rpc('request_withdrawal', {
          p_amount: input.amount, p_asset: input.asset, p_network: input.network, p_address: input.address,
        })
        if (error) throw new Error(error.message)
        await refresh()
        const r = data as { balance: number; net: number }
        return { netReceived: num(r.net), balance: num(r.balance) }
      },
      async claimDailyBonus() {
        const { data, error } = await sb.rpc('claim_daily_bonus')
        if (error) throw new Error(error.message)
        await refresh()
        const r = (data ?? {}) as { claimed?: boolean; amount?: number; balance?: number }
        return { claimed: !!r.claimed, amount: num(r.amount), balance: num(r.balance) }
      },
      verifyIdentity() {
        setCache((c) => (c.profile ? { ...c, profile: { ...c.profile, identity_verified: true } } : c))
        void sb.rpc('verify_identity_now').then(refresh)
      },

      // ---- business mutations (RPC) ----
      async createTask(draft: TaskDraft) {
        const { data, error } = await sb.rpc('create_campaign', {
          p_type: draft.type, p_title: draft.title, p_subtitle: draft.subtitle, p_target: draft.target,
          p_reward: draft.reward, p_goal: draft.goal_count, p_auto: draft.auto_verify, p_category: draft.category,
        })
        if (error || !data) throw new Error(error?.message ?? 'Could not create task.')
        const task = mapTask(data)
        setCache((c) => ({ ...c, tasks: [task, ...c.tasks] }))
        return task
      },
      async fundAndLaunch(taskId) {
        const { data, error } = await sb.rpc('fund_and_launch', { p_task: taskId })
        if (error) return { ok: false, reason: error.message }
        await refresh()
        const r = (data ?? {}) as { ok?: boolean; reason?: string }
        return { ok: !!r.ok, reason: r.reason }
      },
      pauseCampaign(taskId) {
        const t = cache.tasks.find((x) => x.id === taskId)
        if (!t) return
        const next = t.status === 'paused' ? 'live' : 'paused'
        setCache((c) => ({ ...c, tasks: c.tasks.map((x) => (x.id === taskId ? { ...x, status: next } : x)) }))
        void sb.from('tasks').update({ status: next }).eq('id', taskId).then(refresh)
      },
      addFunds(amount) {
        const before = cache.wallet?.business_escrow ?? 0
        void sb.rpc('add_business_funds', { p_amount: amount }).then(refresh)
        return +(before + amount).toFixed(2)
      },

      // ---- provider review ----
      pendingProofs() {
        const mine = new Set(cache.tasks.filter((t) => t.owner_id === uid).map((t) => t.id))
        return cache.completions
          .filter((c) => c.status === 'pending_proof' && mine.has(c.task_id))
          .map((completion) => ({ completion, task: cache.tasks.find((t) => t.id === completion.task_id)! }))
          .filter((x) => x.task)
      },
      allProofs() {
        const mine = new Set(cache.tasks.filter((t) => t.owner_id === uid).map((t) => t.id))
        return cache.completions
          .filter((c) => mine.has(c.task_id))
          .map((completion) => ({ completion, task: cache.tasks.find((t) => t.id === completion.task_id)! }))
          .filter((x) => x.task)
          .sort((a, b) => +new Date(b.completion.created_at) - +new Date(a.completion.created_at))
      },
      reviewProof(completionId, approve) {
        setCache((c) => ({ ...c, completions: c.completions.map((x) => (x.id === completionId ? { ...x, status: approve ? 'approved' : 'rejected' } : x)) }))
        void sb.rpc('review_proof', { p_completion: completionId, p_approve: approve }).then(refresh)
      },
    }
  }, [ready, userId, cache, sb, onSession, refresh])

  return <StoreCtx.Provider value={api}>{children}</StoreCtx.Provider>
}
