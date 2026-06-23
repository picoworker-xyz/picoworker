import type { Profile, Task, Wallet, LedgerEntry, Referral, TaskCompletion } from '../lib/types'

// Demo seed used by the local mock store so the app is alive on first run.
// The marketplace loop works against this data; a real Supabase backend would
// hold the equivalent rows (see supabase/schema.sql).

export const DEMO_EARNER_ID = 'demo-earner'
export const DEMO_BUSINESS_ID = 'demo-business'

export function seedProfiles(): Profile[] {
  return [
    {
      id: DEMO_EARNER_ID,
      display_name: 'Arman',
      mode: 'earner',
      business_name: null,
      level: 'Silver',
      member_since: 'Mar 2026',
      payout_wallet: 'Ft5Y3xQpZ9mN7kR2wDhA8vJ6bL4cX1nUeP0sG3iK9oT',
      identity_verified: true,
      referral_code: 'ARMAN',
      referred_by: null,
      streak_days: 5,
      last_active: new Date().toISOString(),
      tasks_done: 142,
      created_at: '2026-03-01T00:00:00Z',
    },
    {
      id: DEMO_BUSINESS_ID,
      display_name: 'Acme',
      mode: 'business',
      business_name: 'Acme Inc',
      level: 'Business',
      member_since: 'Jan 2026',
      payout_wallet: '7Ywd2Kx9qZRmN4hgQU8qgBjn35Y1zwhz1GZwCkP2UJnM',
      identity_verified: true,
      referral_code: 'ACME',
      referred_by: null,
      streak_days: 0,
      last_active: new Date().toISOString(),
      tasks_done: 0,
      created_at: '2026-01-10T00:00:00Z',
    },
  ]
}

export function seedWallets(): Wallet[] {
  return [
    { profile_id: DEMO_EARNER_ID, earner_balance: 12.84, business_escrow: 0, lifetime_earned: 214.5 },
    { profile_id: DEMO_BUSINESS_ID, earner_balance: 0, business_escrow: 84.0, lifetime_earned: 0 },
  ]
}

export function seedTasks(): Task[] {
  const now = Date.now()
  const t = (mins: number) => new Date(now - mins * 60_000).toISOString()
  return [
    {
      id: 'task-fittrack',
      owner_id: DEMO_BUSINESS_ID,
      type: 'app_install',
      title: 'Test FitTrack app',
      subtitle: 'App test · open & sign up',
      target: 'https://fittrack.example',
      reward: 0.35,
      goal_count: 200,
      done_count: 72,
      auto_verify: false,
      status: 'live',
      fee: 0.1,
      est_seconds: 120,
      category: 'Apps',
      featured: true,
      created_at: t(2880),
    },
    {
      id: 'task-follow-x',
      owner_id: DEMO_BUSINESS_ID,
      type: 'follow_x',
      title: 'Follow @picoworker on X',
      subtitle: 'Social · follow our profile',
      target: '@picoworker',
      reward: 0.04,
      goal_count: 2100,
      done_count: 0,
      auto_verify: true,
      status: 'live',
      fee: 0.1,
      est_seconds: 20,
      category: 'Social',
      featured: false,
      created_at: t(180),
    },
    {
      id: 'task-yt',
      owner_id: DEMO_BUSINESS_ID,
      type: 'yt_views',
      title: 'Watch a 30s video',
      subtitle: 'Watch · instant',
      target: 'https://youtube.com/watch?v=demo',
      reward: 0.02,
      goal_count: 1000,
      done_count: 720,
      auto_verify: true,
      status: 'live',
      fee: 0.1,
      est_seconds: 30,
      category: 'Watch',
      featured: false,
      created_at: t(300),
    },
    {
      id: 'task-survey',
      owner_id: DEMO_BUSINESS_ID,
      type: 'survey',
      title: 'Survey: shopping habits',
      subtitle: 'Survey · multiple choice',
      target: null,
      reward: 0.18,
      goal_count: 500,
      done_count: 88,
      auto_verify: true,
      status: 'live',
      fee: 0.1,
      est_seconds: 240,
      category: 'Surveys',
      featured: false,
      created_at: t(600),
    },
    {
      id: 'task-review',
      owner_id: DEMO_BUSINESS_ID,
      type: 'custom',
      title: 'Leave a 5★ Play Store review',
      subtitle: 'Manual check · screenshot proof',
      target: 'https://play.google.com/store/apps/details?id=fittrack',
      reward: 0.2,
      goal_count: 300,
      done_count: 41,
      auto_verify: false,
      status: 'live',
      fee: 0.1,
      est_seconds: 120,
      category: 'Apps',
      featured: false,
      created_at: t(900),
    },
    {
      id: 'task-acme-follow',
      owner_id: DEMO_BUSINESS_ID,
      type: 'follow_x',
      title: 'Follow @acmehq on X',
      subtitle: 'Social · follow our profile',
      target: '@acmehq',
      reward: 0.04,
      goal_count: 500,
      done_count: 340,
      auto_verify: true,
      status: 'live',
      fee: 0.1,
      est_seconds: 20,
      category: 'Social',
      featured: false,
      created_at: t(2880),
    },
  ]
}

export function seedLedger(): LedgerEntry[] {
  const now = Date.now()
  const t = (mins: number) => new Date(now - mins * 60_000).toISOString()
  return [
    {
      id: 'l1',
      profile_id: DEMO_EARNER_ID,
      amount: 0.35,
      type: 'task_reward',
      title: 'App test · FitTrack',
      ref_id: 'task-fittrack',
      balance_after: 12.84,
      created_at: t(2),
    },
    {
      id: 'l2',
      profile_id: DEMO_EARNER_ID,
      amount: 0.04,
      type: 'task_reward',
      title: 'Follow on X',
      ref_id: 'task-acme-follow',
      balance_after: 12.49,
      created_at: t(14),
    },
    {
      id: 'l3',
      profile_id: DEMO_EARNER_ID,
      amount: -10.0,
      type: 'withdrawal',
      title: 'Withdraw · Solana',
      ref_id: null,
      balance_after: 12.45,
      created_at: t(60),
    },
  ]
}

// Demo earner identities used by the provider review queue.
export const DEMO_EARNER_NAMES: Record<string, string> = {
  'u-bilal': 'Bilal_92',
  'u-priya': 'Priya.k',
  'u-rahul': 'Rahul_dev',
  'u-sana': 'Sana_k',
}

// Pending manual-proof submissions waiting on the provider (review queue).
export function seedCompletions(): TaskCompletion[] {
  const now = Date.now()
  const t = (mins: number) => new Date(now - mins * 60_000).toISOString()
  return [
    { id: 'pc1', task_id: 'task-review', earner_id: 'u-bilal', status: 'pending_proof', proof_url: null, reward: 0.2, created_at: t(4) },
    { id: 'pc2', task_id: 'task-review', earner_id: 'u-priya', status: 'pending_proof', proof_url: null, reward: 0.2, created_at: t(9) },
    { id: 'pc3', task_id: 'task-review', earner_id: 'u-rahul', status: 'pending_proof', proof_url: null, reward: 0.2, created_at: t(22) },
    { id: 'pc4', task_id: 'task-fittrack', earner_id: 'u-sana', status: 'pending_proof', proof_url: null, reward: 0.35, created_at: t(35) },
  ]
}

export function seedReferrals(): Referral[] {
  return [
    { id: 'r1', referrer_id: DEMO_EARNER_ID, referred_id: 'u-bilal', display_name: 'Bilal_92', status: 'active', tasks: 47, earnings: 2.1, created_at: '2026-04-01' },
    { id: 'r2', referrer_id: DEMO_EARNER_ID, referred_id: 'u-priya', display_name: 'Priya.k', status: 'active', tasks: 31, earnings: 1.65, created_at: '2026-04-10' },
    { id: 'r3', referrer_id: DEMO_EARNER_ID, referred_id: 'u-rahul', display_name: 'Rahul_dev', status: 'joined', tasks: 0, earnings: 0.5, created_at: '2026-05-02' },
  ]
}
