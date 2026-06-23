-- ============================================================================
-- PicoWorker — Supabase schema (Postgres + RLS)
-- Run in the Supabase SQL editor. Mirrors src/lib/types.ts and the mock store.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---- profiles (1:1 with auth.users) ----
create table if not exists profiles (
  id                uuid primary key references auth.users on delete cascade,
  display_name      text not null,
  mode              text not null default 'earner' check (mode in ('earner','business')),
  business_name     text,
  level             text not null default 'Bronze',
  member_since      text,
  payout_wallet     text,
  identity_verified boolean not null default false,
  referral_code     text unique,
  referred_by       uuid references profiles(id),
  streak_days       int not null default 0,
  last_active       timestamptz,
  tasks_done        int not null default 0,
  device_hash       text,        -- anti-fraud: signup device fingerprint
  signup_ip         text,        -- anti-fraud: signup IP
  created_at        timestamptz not null default now()
);
create index if not exists profiles_device_idx on profiles (device_hash);

-- ---- wallets (1:1 with profile) ----
create table if not exists wallets (
  profile_id       uuid primary key references profiles(id) on delete cascade,
  earner_balance   numeric(12,2) not null default 0,
  business_escrow  numeric(12,2) not null default 0,
  lifetime_earned  numeric(12,2) not null default 0
);

-- ---- tasks / campaigns ----
create table if not exists tasks (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references profiles(id) on delete cascade,
  type        text not null check (type in ('follow_x','yt_views','app_install','survey','visit_site','custom')),
  title       text not null,
  subtitle    text,
  target      text,
  reward      numeric(12,4) not null,
  goal_count  int not null,
  done_count  int not null default 0,
  auto_verify boolean not null default true,
  status      text not null default 'paused' check (status in ('live','paused','complete')),
  fee         numeric(5,4) not null default 0.10,
  est_seconds int not null default 30,
  category    text not null default 'Social',
  featured    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists tasks_live_idx on tasks (status) where status = 'live';

-- ---- task completions ----
create table if not exists task_completions (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references tasks(id) on delete cascade,
  earner_id  uuid not null references profiles(id) on delete cascade,
  status     text not null default 'verified' check (status in ('verified','pending_proof','approved','rejected')),
  proof_url  text,
  reward     numeric(12,4) not null,
  created_at timestamptz not null default now(),
  unique (task_id, earner_id)
);

-- ---- ledger ----
create table if not exists ledger_entries (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references profiles(id) on delete cascade,
  amount        numeric(12,4) not null,
  type          text not null check (type in
                  ('task_reward','withdrawal','deposit','escrow_hold','escrow_release','referral_bonus','welcome_bonus')),
  title         text not null,
  ref_id        text,
  balance_after numeric(12,2) not null,
  created_at    timestamptz not null default now()
);
create index if not exists ledger_profile_idx on ledger_entries (profile_id, created_at desc);

-- ---- withdrawals ----
create table if not exists withdrawals (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  amount     numeric(12,2) not null,
  asset      text not null default 'USDC',
  network    text not null,
  address    text not null,
  fee        numeric(12,4) not null default 0,
  status     text not null default 'pending' check (status in ('pending','sent','failed')),
  created_at timestamptz not null default now()
);

-- ---- referrals ----
create table if not exists referrals (
  id           uuid primary key default gen_random_uuid(),
  referrer_id  uuid not null references profiles(id) on delete cascade,
  referred_id  uuid not null references profiles(id) on delete cascade,
  display_name text not null,
  status       text not null default 'joined' check (status in ('joined','active')),
  tasks        int not null default 0,
  earnings     numeric(12,2) not null default 0,
  created_at   timestamptz not null default now()
);

-- ============================================================================
-- Atomic completion: release escrow from owner, credit earner, log ledger,
-- bump counters. Called from the client via supabase.rpc('complete_task', ...).
-- ============================================================================
create or replace function complete_task(p_task uuid, p_proof text default null)
returns json
language plpgsql
security definer
as $$
declare
  t       tasks%rowtype;
  me      uuid := auth.uid();
  w_e     wallets%rowtype;
  new_bal numeric;
begin
  select * into t from tasks where id = p_task for update;
  if t.id is null or t.status <> 'live' then raise exception 'Task unavailable'; end if;
  if t.owner_id = me then raise exception 'Cannot complete your own task'; end if;

  -- manual-proof tasks: record pending, no money yet
  if not t.auto_verify then
    insert into task_completions(task_id, earner_id, status, proof_url, reward)
    values (p_task, me, 'pending_proof', p_proof, t.reward);
    return json_build_object('manual', true, 'reward', t.reward);
  end if;

  insert into task_completions(task_id, earner_id, status, reward)
  values (p_task, me, 'verified', t.reward);

  -- credit earner
  update wallets
     set earner_balance = earner_balance + t.reward,
         lifetime_earned = lifetime_earned + t.reward
   where profile_id = me
  returning * into w_e;
  new_bal := w_e.earner_balance;

  -- release escrow from owner
  update wallets set business_escrow = greatest(0, business_escrow - t.reward)
   where profile_id = t.owner_id;

  -- counters
  update tasks
     set done_count = done_count + 1,
         status = case when done_count + 1 >= goal_count then 'complete' else status end
   where id = p_task;
  update profiles
     set tasks_done = tasks_done + 1,
         streak_days = greatest(1, streak_days),
         last_active = now()
   where id = me;

  -- ledger
  insert into ledger_entries(profile_id, amount, type, title, ref_id, balance_after)
  values (me, t.reward, 'task_reward', t.title, p_task::text, new_bal);
  insert into ledger_entries(profile_id, amount, type, title, ref_id, balance_after)
  values (t.owner_id, -t.reward, 'escrow_release', t.title, p_task::text,
          (select business_escrow from wallets where profile_id = t.owner_id));

  -- queue an "earning" email to the earner
  insert into email_outbox(to_email, template, data)
  select u.email, 'earning', jsonb_build_object('title', t.title, 'amount', t.reward, 'balance', new_bal)
  from auth.users u where u.id = me;

  return json_build_object('manual', false, 'reward', t.reward, 'balance', new_bal);
end;
$$;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table profiles         enable row level security;
alter table wallets          enable row level security;
alter table tasks            enable row level security;
alter table task_completions enable row level security;
alter table ledger_entries   enable row level security;
alter table withdrawals      enable row level security;
alter table referrals        enable row level security;

-- profiles: everyone can read (for referral names etc), only self can edit own
create policy "profiles read"  on profiles for select using (true);
create policy "profiles write" on profiles for update using (id = auth.uid());
create policy "profiles insert" on profiles for insert with check (id = auth.uid());

-- wallets: only owner
create policy "wallet self" on wallets for select using (profile_id = auth.uid());

-- tasks: live tasks visible to all; owners see their own; owners manage their own
create policy "tasks read live" on tasks for select using (status = 'live' or owner_id = auth.uid());
create policy "tasks insert"    on tasks for insert with check (owner_id = auth.uid());
create policy "tasks update"    on tasks for update using (owner_id = auth.uid());

-- completions: earner sees own; task owner sees completions of their tasks
create policy "completions self" on task_completions for select
  using (earner_id = auth.uid() or exists (select 1 from tasks where tasks.id = task_id and tasks.owner_id = auth.uid()));

-- ledger / withdrawals / referrals: owner only
create policy "ledger self"      on ledger_entries for select using (profile_id = auth.uid());
create policy "withdrawals self" on withdrawals    for select using (profile_id = auth.uid());
create policy "withdrawals ins"  on withdrawals    for insert with check (profile_id = auth.uid());
create policy "referrals self"   on referrals      for select using (referrer_id = auth.uid());

-- ============================================================================
-- New-user trigger: create profile + wallet (+ $0.05 welcome bonus for earners)
-- ============================================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer
set search_path = public  -- critical: the auth role triggers this; without it, table names don't resolve
as $$
declare m text := coalesce(new.raw_user_meta_data->>'mode', 'earner');
begin
  insert into profiles(id, display_name, mode, referral_code, member_since, device_hash, signup_ip)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)),
          m,
          upper(substr(md5(new.id::text),1,8)),
          to_char(now(),'Mon YYYY'),
          new.raw_user_meta_data->>'device_hash',
          new.raw_user_meta_data->>'signup_ip');
  insert into wallets(profile_id, earner_balance, lifetime_earned)
  values (new.id, case when m='earner' then 0.05 else 0 end, case when m='earner' then 0.05 else 0 end);
  if m = 'earner' then
    insert into ledger_entries(profile_id, amount, type, title, balance_after)
    values (new.id, 0.05, 'welcome_bonus', 'Welcome bonus', 0.05);
  end if;
  -- queue a welcome email (sent by the send-email Edge Function via webhook)
  insert into email_outbox(to_email, template, data)
  values (new.email, 'welcome',
          jsonb_build_object('name', coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)), 'mode', m));
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================================
-- Storage: public bucket for proof screenshots + upload policy
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('proofs', 'proofs', true)
on conflict (id) do nothing;

create policy "proofs upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'proofs');
create policy "proofs read" on storage.objects for select using (bucket_id = 'proofs');

-- ============================================================================
-- Email outbox — RPCs/triggers enqueue here; the send-email Edge Function
-- (fired by a Database Webhook on insert) renders + sends via Resend.
-- No RLS policies → only the service_role (Edge Function) can read it.
-- ============================================================================
create table if not exists email_outbox (
  id         uuid primary key default gen_random_uuid(),
  to_email   text not null,
  template   text not null check (template in ('welcome','earning','task_rejected','withdrawal','deposit')),
  data       jsonb not null default '{}',
  status     text not null default 'queued' check (status in ('queued','sent','failed')),
  error      text,
  created_at timestamptz not null default now(),
  sent_at    timestamptz
);
alter table email_outbox enable row level security;

-- ============================================================================
-- Money RPCs (SECURITY DEFINER) — the client never writes balances directly;
-- RLS blocks direct wallet writes, so all value movement goes through these.
-- ============================================================================

-- Earner: cash out (simulated payout; swap for real Solana/Polygon later)
create or replace function request_withdrawal(p_amount numeric, p_asset text, p_network text, p_address text)
returns json language plpgsql security definer as $$
declare me uuid := auth.uid(); bal numeric; fee numeric := 0.01;
begin
  select earner_balance into bal from wallets where profile_id = me for update;
  if bal is null then raise exception 'No wallet'; end if;
  if p_amount <= 0 or p_amount > bal then raise exception 'Invalid amount'; end if;
  update wallets set earner_balance = earner_balance - p_amount where profile_id = me;
  insert into withdrawals(profile_id, amount, asset, network, address, fee, status)
  values (me, p_amount, p_asset, p_network, p_address, fee, 'sent');
  insert into ledger_entries(profile_id, amount, type, title, balance_after)
  values (me, -p_amount, 'withdrawal', 'Withdraw · ' || p_network, bal - p_amount);
  insert into email_outbox(to_email, template, data)
  select u.email, 'withdrawal',
         jsonb_build_object('amount', p_amount, 'net', p_amount - fee, 'asset', p_asset, 'network', p_network)
  from auth.users u where u.id = me;
  return json_build_object('balance', bal - p_amount, 'net', p_amount - fee);
end; $$;

-- Business: add escrow funds
create or replace function add_business_funds(p_amount numeric)
returns numeric language plpgsql security definer as $$
declare me uuid := auth.uid(); bal numeric;
begin
  if p_amount <= 0 then raise exception 'Invalid amount'; end if;
  update wallets set business_escrow = business_escrow + p_amount where profile_id = me
    returning business_escrow into bal;
  insert into ledger_entries(profile_id, amount, type, title, balance_after)
  values (me, p_amount, 'deposit', 'Deposit · USDC', bal);
  insert into email_outbox(to_email, template, data)
  select u.email, 'deposit', jsonb_build_object('amount', p_amount, 'balance', bal)
  from auth.users u where u.id = me;
  return bal;
end; $$;

-- Business: create a (paused) campaign
create or replace function create_campaign(
  p_type text, p_title text, p_subtitle text, p_target text,
  p_reward numeric, p_goal int, p_auto boolean, p_category text)
returns tasks language plpgsql security definer as $$
declare me uuid := auth.uid(); row tasks;
begin
  insert into tasks(owner_id, type, title, subtitle, target, reward, goal_count, auto_verify, status, category,
                    est_seconds)
  values (me, p_type, p_title, p_subtitle, nullif(p_target,''), p_reward, p_goal, p_auto, 'paused', p_category,
          case when p_type='survey' then 240 when p_type='app_install' then 120 else 30 end)
  returning * into row;
  return row;
end; $$;

-- Business: hold escrow + go live
create or replace function fund_and_launch(p_task uuid)
returns json language plpgsql security definer as $$
declare me uuid := auth.uid(); t tasks; total numeric; esc numeric;
begin
  select * into t from tasks where id = p_task and owner_id = me for update;
  if t.id is null then raise exception 'Task not found'; end if;
  total := round(t.reward * t.goal_count * (1 + t.fee), 2);
  select business_escrow into esc from wallets where profile_id = me for update;
  if total > esc then return json_build_object('ok', false, 'reason', 'Not enough escrow'); end if;
  update wallets set business_escrow = business_escrow - total where profile_id = me;
  update tasks set status = 'live' where id = p_task;
  insert into ledger_entries(profile_id, amount, type, title, ref_id, balance_after)
  values (me, -total, 'escrow_hold', 'Funded: ' || t.title, p_task::text, esc - total);
  return json_build_object('ok', true);
end; $$;

-- Provider: approve/reject a manual proof
create or replace function review_proof(p_completion uuid, p_approve boolean)
returns void language plpgsql security definer as $$
declare me uuid := auth.uid(); c task_completions; t tasks; new_bal numeric;
begin
  select * into c from task_completions where id = p_completion for update;
  if c.id is null then raise exception 'Not found'; end if;
  select * into t from tasks where id = c.task_id;
  if t.owner_id <> me then raise exception 'Not your task'; end if;
  if c.status <> 'pending_proof' then return; end if;

  if not p_approve then
    update task_completions set status = 'rejected' where id = p_completion;
    insert into email_outbox(to_email, template, data)
    select u.email, 'task_rejected', jsonb_build_object('title', t.title, 'amount', c.reward)
    from auth.users u where u.id = c.earner_id;
    return;
  end if;

  update task_completions set status = 'approved' where id = p_completion;
  update wallets set earner_balance = earner_balance + c.reward,
                     lifetime_earned = lifetime_earned + c.reward
   where profile_id = c.earner_id returning earner_balance into new_bal;
  update wallets set business_escrow = greatest(0, business_escrow - c.reward) where profile_id = me;
  update tasks set done_count = done_count + 1,
                   status = case when done_count + 1 >= goal_count then 'complete' else status end
   where id = t.id;
  insert into ledger_entries(profile_id, amount, type, title, ref_id, balance_after)
  values (c.earner_id, c.reward, 'task_reward', t.title, t.id::text, coalesce(new_bal, c.reward));
  insert into email_outbox(to_email, template, data)
  select u.email, 'earning', jsonb_build_object('title', t.title, 'amount', c.reward, 'balance', new_bal)
  from auth.users u where u.id = c.earner_id;
end; $$;

-- Earner: claim daily streak bonus
create or replace function claim_daily_bonus()
returns json language plpgsql security definer as $$
declare me uuid := auth.uid(); bal numeric;
begin
  update wallets set earner_balance = earner_balance + 0.05,
                     lifetime_earned = lifetime_earned + 0.05
   where profile_id = me returning earner_balance into bal;
  update profiles set streak_days = streak_days + 1, last_active = now() where id = me;
  insert into ledger_entries(profile_id, amount, type, title, balance_after)
  values (me, 0.05, 'welcome_bonus', 'Daily streak bonus', bal);
  return json_build_object('amount', 0.05, 'balance', bal);
end; $$;

-- Earner: mark identity verified (KYC mock)
create or replace function verify_identity_now()
returns void language plpgsql security definer as $$
begin
  update profiles set identity_verified = true where id = auth.uid();
end; $$;

-- ============================================================================
-- Backfill: give a profile + wallet to any auth users created before this
-- schema existed (e.g. accounts made while only Auth was set up). Idempotent.
-- ============================================================================
insert into profiles (id, display_name, mode, referral_code, member_since, device_hash, signup_ip)
select u.id,
       coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1)),
       coalesce(u.raw_user_meta_data->>'mode', 'earner'),
       upper(substr(md5(u.id::text), 1, 8)),
       to_char(now(), 'Mon YYYY'),
       u.raw_user_meta_data->>'device_hash',
       u.raw_user_meta_data->>'signup_ip'
from auth.users u
where not exists (select 1 from profiles p where p.id = u.id);

insert into wallets (profile_id, earner_balance, lifetime_earned)
select p.id,
       case when p.mode = 'earner' then 0.05 else 0 end,
       case when p.mode = 'earner' then 0.05 else 0 end
from profiles p
where not exists (select 1 from wallets w where w.profile_id = p.id);
