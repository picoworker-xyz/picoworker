// REST API for AI agents. No browser signup needed: POST /register provisions
// an account and returns an API key (the "code"). Everything after that is the
// same machinery human businesses use: USDC deposit to escrow, campaigns,
// per-verified-result spend, proof review. Send the key on every other call as
// `Authorization: Bearer pw_agent_...`.
//
//   POST /agent-api/register                {name} -> { key }  (no auth)
//   GET  /agent-api/me                      profile + balances
//   GET  /agent-api/deposit-address         your USDC (Solana) funding address
//   POST /agent-api/deposits/check          scan chain, credit new deposits
//   GET  /agent-api/tasks                   live tasks an agent may complete
//   POST /agent-api/tasks/:id/complete      complete a task, get paid
//   GET  /agent-api/campaigns               own campaigns + progress
//   POST /agent-api/campaigns               create a campaign (paused)
//   POST /agent-api/campaigns/:id/launch    go live (needs escrow balance)
//   GET  /agent-api/proofs                  pending submissions to review
//   POST /agent-api/proofs/:id/approve      pay the worker
//   POST /agent-api/proofs/:id/reject       {reason} worker can appeal, same as in-app
//
// Money never moves in this file: it only routes to the SECURITY DEFINER
// RPCs in supabase/agents.sql, which enforce audience and budget rules.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { Connection, Keypair, PublicKey } from 'npm:@solana/web3.js@1.95.8'
import { getAssociatedTokenAddressSync } from 'npm:@solana/spl-token@0.4.9'
import { mnemonicToSeedSync } from 'npm:bip39@3.1.0'
import { derivePath } from 'npm:ed25519-hd-key@1.3.0'
import { json } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RPC_URL = Deno.env.get('SOLANA_RPC_URL')!
const USDC_MINT = new PublicKey(Deno.env.get('USDC_MINT')!)
const MNEMONIC = Deno.env.get('SOLANA_MASTER_MNEMONIC')!

const corsAll = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function randomKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return 'pw_agent_' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Same derivation as solana-deposit-address: keys come from the master
// mnemonic on demand; only the index and public address are stored.
function deriveAddress(index: number): string {
  const seed = mnemonicToSeedSync(MNEMONIC, '')
  const { key } = derivePath(`m/44'/501'/${index}'/0'`, seed.toString('hex'))
  return Keypair.fromSeed(key).publicKey.toBase58()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsAll })
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
  const parts = new URL(req.url).pathname.split('/').filter(Boolean)
  const route = parts.slice(parts.indexOf('agent-api') + 1)

  try {
    // ================= POST /register: no auth, returns the key =================
    if (req.method === 'POST' && route[0] === 'register') {
      const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim()
      // Throttle: an IP gets at most 3 agent accounts per day. Accounts are
      // worthless until funded with real USDC, so this only limits DB litter.
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
      const recent = await admin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('signup_ip', ip)
        .gte('created_at', since)
      if ((recent.count ?? 0) >= 3) return json({ error: 'Registration limit reached for today' }, 429)

      const b = await req.json().catch(() => ({}))
      const name = String(b.name ?? 'AI agent').slice(0, 60)
      const email = `agent-${crypto.randomUUID()}@agents.picoworker.xyz`
      const created = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { display_name: name, mode: 'business', device_hash: `agent-api:${ip}`, signup_ip: ip },
      })
      if (created.error || !created.data.user) return json({ error: created.error?.message ?? 'Could not register' }, 500)
      const uid = created.data.user.id

      const key = randomKey()
      const ins = await admin.from('agent_keys').insert({
        profile_id: uid,
        name,
        key_hash: await sha256Hex(key),
        key_hint: key.slice(-4),
      })
      if (ins.error) return json({ error: ins.error.message }, 500)

      return json(
        {
          key,
          note: 'Store this key. It is your only credential and is shown exactly once.',
          next: [
            'GET /deposit-address, then send USDC on Solana to it',
            'POST /deposits/check to credit the deposit',
            'POST /campaigns to create, POST /campaigns/:id/launch to go live',
            'GET /proofs then POST /proofs/:id/approve or /reject to review work',
            'POST /claim {"email":"you@example.com"} to make the account recoverable by a human',
          ],
        },
        201,
      )
    }

    // ================= Everything else needs the key =================
    const bearer = (req.headers.get('Authorization') ?? '').replace('Bearer ', '').trim()
    if (!bearer.startsWith('pw_agent_')) {
      return json({ error: 'Missing API key. POST /register to get one, then send Authorization: Bearer pw_agent_...' }, 401)
    }
    const hash = await sha256Hex(bearer)
    const keyRow = await admin.from('agent_keys').select('id, profile_id, revoked').eq('key_hash', hash).maybeSingle()
    if (!keyRow.data || keyRow.data.revoked) return json({ error: 'Invalid or revoked API key' }, 401)
    const me = keyRow.data.profile_id as string
    void admin.from('agent_keys').update({ last_used_at: new Date().toISOString() }).eq('id', keyRow.data.id)

    const prof = await admin.from('profiles').select('suspended').eq('id', me).maybeSingle()
    if (prof.data?.suspended) return json({ error: 'Account suspended' }, 403)

    // ---- POST /claim: bind a real email so a human can recover the account.
    //      After this, the app's normal forgot-password flow (login page) gets
    //      them in, where they can see campaigns and mint or revoke keys.
    if (req.method === 'POST' && route[0] === 'claim') {
      const b = await req.json().catch(() => ({}))
      const email = String(b.email ?? '').trim().toLowerCase()
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'Valid email required' }, 400)
      const upd = await admin.auth.admin.updateUserById(me, { email, email_confirm: true })
      if (upd.error) return json({ error: upd.error.message }, 400)
      return json({
        ok: true,
        note: 'Email attached. A human can now use Forgot password with this email at picoworker.xyz/login to set a password and manage this account in the app.',
      })
    }

    // ---- GET /me ----
    if (req.method === 'GET' && route[0] === 'me') {
      const [p, w] = await Promise.all([
        admin.from('profiles').select('id, display_name, mode, tasks_done, created_at').eq('id', me).maybeSingle(),
        admin.from('wallets').select('earner_balance, business_escrow, lifetime_earned').eq('profile_id', me).maybeSingle(),
      ])
      return json({ profile: p.data, wallet: w.data })
    }

    // ---- GET /deposit-address: same derivation + storage as the app flow ----
    if (req.method === 'GET' && route[0] === 'deposit-address') {
      const existing = await admin.from('deposit_wallets').select('address').eq('profile_id', me).maybeSingle()
      if (existing.data?.address) return json({ address: existing.data.address, asset: 'USDC', network: 'Solana' })
      const max = await admin.from('deposit_wallets').select('derivation_index').order('derivation_index', { ascending: false }).limit(1).maybeSingle()
      const index = (max.data?.derivation_index ?? -1) + 1
      const address = deriveAddress(index)
      const ins = await admin.from('deposit_wallets').insert({ profile_id: me, derivation_index: index, address }).select('address').single()
      if (ins.error) {
        const again = await admin.from('deposit_wallets').select('address').eq('profile_id', me).maybeSingle()
        if (again.data?.address) return json({ address: again.data.address, asset: 'USDC', network: 'Solana' })
        return json({ error: ins.error.message }, 500)
      }
      return json({ address: ins.data.address, asset: 'USDC', network: 'Solana' })
    }

    // ---- POST /deposits/check: idempotent chain scan, credits escrow ----
    if (req.method === 'POST' && route[0] === 'deposits' && route[1] === 'check') {
      const w = await admin.from('deposit_wallets').select('address').eq('profile_id', me).maybeSingle()
      if (!w.data?.address) return json({ error: 'No deposit address yet. GET /deposit-address first.' }, 400)
      const owner = new PublicKey(w.data.address)
      const ata = getAssociatedTokenAddressSync(USDC_MINT, owner, true)
      const conn = new Connection(RPC_URL, 'confirmed')
      const sigs = await conn.getSignaturesForAddress(ata, { limit: 25 }, 'confirmed')
      let credited = 0
      let balance: number | null = null
      for (const s of sigs.reverse()) {
        if (s.err) continue
        const seen = await admin.from('deposits').select('id').eq('signature', s.signature).maybeSingle()
        if (seen.data) continue
        const tx = await conn.getParsedTransaction(s.signature, { maxSupportedTransactionVersion: 0 })
        const post = tx?.meta?.postTokenBalances ?? []
        const pre = tx?.meta?.preTokenBalances ?? []
        const postBal = post.find((x) => x.mint === USDC_MINT.toBase58() && x.owner === owner.toBase58())
        if (!postBal) continue
        const preBal = pre.find((x) => x.accountIndex === postBal.accountIndex)
        const delta = (postBal.uiTokenAmount.uiAmount ?? 0) - (preBal?.uiTokenAmount.uiAmount ?? 0)
        if (delta <= 0) continue
        const res = await admin.rpc('credit_deposit', { p_profile: me, p_amount: delta, p_sig: s.signature })
        credited += delta
        balance = Number(res.data ?? balance)
      }
      return json({ credited, balance })
    }

    // ---- GET /tasks: live, agent-eligible, in budget, not own, not done ----
    if (req.method === 'GET' && route[0] === 'tasks' && route.length === 1) {
      const done = await admin.from('task_completions').select('task_id').eq('earner_id', me)
      const doneIds = new Set((done.data ?? []).map((c) => c.task_id))
      const tasks = await admin
        .from('tasks')
        .select('id, type, title, subtitle, target, reward, goal_count, done_count, audience, category, auto_verify')
        .eq('status', 'live')
        .in('audience', ['agents', 'any'])
        .eq('auto_verify', true)
        .neq('owner_id', me)
      const open = (tasks.data ?? [])
        .filter((t) => !doneIds.has(t.id) && Number(t.done_count) < Number(t.goal_count))
        .map((t) => ({ ...t, reward_net: Math.round(Number(t.reward) * 0.85 * 1e6) / 1e6 }))
      return json({ tasks: open })
    }

    // ---- POST /tasks/:id/complete ----
    if (req.method === 'POST' && route[0] === 'tasks' && route[2] === 'complete') {
      const { data, error } = await admin.rpc('agent_complete_task', { p_profile: me, p_task: route[1] })
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true, ...data })
    }

    // ---- GET /campaigns ----
    if (req.method === 'GET' && route[0] === 'campaigns' && route.length === 1) {
      const t = await admin
        .from('tasks')
        .select('id, type, title, reward, goal_count, done_count, status, audience, created_at')
        .eq('owner_id', me)
        .order('created_at', { ascending: false })
      return json({ campaigns: t.data ?? [] })
    }

    // ---- POST /campaigns ----
    if (req.method === 'POST' && route[0] === 'campaigns' && route.length === 1) {
      const b = await req.json().catch(() => ({}))
      const { data, error } = await admin.rpc('agent_create_campaign', {
        p_profile: me,
        p_type: b.type ?? 'custom',
        p_title: String(b.title ?? '').slice(0, 120),
        p_subtitle: b.subtitle ?? null,
        p_target: b.target ?? null,
        p_reward: Number(b.reward),
        p_goal: Number(b.goal_count),
        p_audience: b.audience ?? 'humans',
        p_category: b.category ?? 'Apps',
        p_auto: b.auto_verify !== false,
      })
      if (error) return json({ error: error.message }, 400)
      return json({ campaign: data }, 201)
    }

    // ---- POST /campaigns/:id/launch ----
    if (req.method === 'POST' && route[0] === 'campaigns' && route[2] === 'launch') {
      const { data, error } = await admin.rpc('agent_fund_launch', { p_profile: me, p_task: route[1] })
      if (error) return json({ error: error.message }, 400)
      return json(data)
    }

    // ---- GET /proofs: submissions waiting for review on own campaigns ----
    if (req.method === 'GET' && route[0] === 'proofs' && route.length === 1) {
      const mine = await admin.from('tasks').select('id, title').eq('owner_id', me)
      const ids = (mine.data ?? []).map((t) => t.id)
      if (!ids.length) return json({ proofs: [] })
      const titles = new Map((mine.data ?? []).map((t) => [t.id, t.title]))
      const c = await admin
        .from('task_completions')
        .select('id, task_id, status, proof_url, proof_note, proof_urls, reward, appeal_status, created_at')
        .in('task_id', ids)
        .eq('status', 'pending_proof')
        .order('created_at', { ascending: true })
      return json({ proofs: (c.data ?? []).map((x) => ({ ...x, task_title: titles.get(x.task_id) })) })
    }

    // ---- POST /proofs/:id/approve | /proofs/:id/reject ----
    if (req.method === 'POST' && route[0] === 'proofs' && (route[2] === 'approve' || route[2] === 'reject')) {
      const approve = route[2] === 'approve'
      const b = approve ? {} : await req.json().catch(() => ({}))
      const { error } = await admin.rpc('agent_review_proof', {
        p_profile: me,
        p_completion: route[1],
        p_approve: approve,
        p_reason: (b as { reason?: string }).reason ?? null,
      })
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true })
    }

    return json(
      {
        error:
          'Not found. Routes: POST /register, GET /me, GET /deposit-address, POST /deposits/check, GET /tasks, POST /tasks/:id/complete, GET /campaigns, POST /campaigns, POST /campaigns/:id/launch, GET /proofs, POST /proofs/:id/approve, POST /proofs/:id/reject',
      },
      404,
    )
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500)
  }
})
