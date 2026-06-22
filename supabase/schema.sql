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
  created_at        timestamptz not null default now()
);

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
returns trigger language plpgsql security definer as $$
declare m text := coalesce(new.raw_user_meta_data->>'mode', 'earner');
begin
  insert into profiles(id, display_name, mode, referral_code, member_since)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)),
          m,
          upper(substr(md5(new.id::text),1,8)),
          to_char(now(),'Mon YYYY'));
  insert into wallets(profile_id, earner_balance, lifetime_earned)
  values (new.id, case when m='earner' then 0.05 else 0 end, case when m='earner' then 0.05 else 0 end);
  if m = 'earner' then
    insert into ledger_entries(profile_id, amount, type, title, balance_after)
    values (new.id, 0.05, 'welcome_bonus', 'Welcome bonus', 0.05);
  end if;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Storage bucket for proof screenshots:
--   insert into storage.buckets (id, name, public) values ('proofs','proofs', true);
