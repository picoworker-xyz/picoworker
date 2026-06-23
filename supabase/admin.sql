-- ============================================================================
-- PicoWorker — Team / super-admin dashboard (run AFTER schema.sql). Idempotent.
--
-- After running, grant admin to your team accounts:
--   update profiles set is_admin = true where id in (select id from auth.users where email in ('you@x.com','teammate@x.com'));
-- ============================================================================

alter table profiles add column if not exists is_admin boolean not null default false;

-- True if the caller is a team admin.
create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

-- ---- Overview stats ----
create or replace function admin_stats()
returns json language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  return json_build_object(
    'users',               (select count(*) from profiles),
    'earners',             (select count(*) from profiles where mode='earner'),
    'businesses',          (select count(*) from profiles where mode='business'),
    'verified',            (select count(*) from profiles where identity_verified),
    'tasks',               (select count(*) from tasks),
    'live_tasks',          (select count(*) from tasks where status='live'),
    'completions',         (select count(*) from task_completions),
    'pending_proofs',      (select count(*) from task_completions where status='pending_proof'),
    'total_escrow',        (select coalesce(sum(business_escrow),0) from wallets),
    'total_earner_balance',(select coalesce(sum(earner_balance),0) from wallets),
    'deposits_total',      (select coalesce(sum(amount),0) from deposits),
    'withdrawals_total',   (select coalesce(sum(amount),0) from withdrawals)
  );
end; $$;

-- ---- Users (with email, balances, fraud signals) ----
create or replace function admin_users()
returns table (id uuid, email text, display_name text, mode text, level text, identity_verified boolean,
  earner_balance numeric, business_escrow numeric, lifetime_earned numeric, tasks_done int,
  device_hash text, signup_ip text, is_admin boolean, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  return query
    select p.id, u.email, p.display_name, p.mode, p.level, p.identity_verified,
           w.earner_balance, w.business_escrow, w.lifetime_earned, p.tasks_done,
           p.device_hash, p.signup_ip, p.is_admin, p.created_at
    from profiles p
    left join wallets w on w.profile_id = p.id
    left join auth.users u on u.id = p.id
    order by p.created_at desc;
end; $$;

-- ---- Tasks / campaigns ----
create or replace function admin_tasks()
returns table (id uuid, type text, title text, status text, owner text, reward numeric,
  goal_count int, done_count int, auto_verify boolean, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  return query
    select t.id, t.type, t.title, t.status, p.display_name, t.reward,
           t.goal_count, t.done_count, t.auto_verify, t.created_at
    from tasks t left join profiles p on p.id = t.owner_id
    order by t.created_at desc;
end; $$;

-- ---- Completions (with proof for verification) ----
create or replace function admin_completions()
returns table (id uuid, task_title text, earner text, earner_email text, status text,
  proof_url text, reward numeric, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  return query
    select c.id, t.title, p.display_name, u.email, c.status, c.proof_url, c.reward, c.created_at
    from task_completions c
    left join tasks t on t.id = c.task_id
    left join profiles p on p.id = c.earner_id
    left join auth.users u on u.id = c.earner_id
    order by c.created_at desc;
end; $$;

-- ---- Deposits (on-chain) ----
create or replace function admin_deposits()
returns table (email text, amount numeric, signature text, status text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  return query
    select u.email, d.amount, d.signature, d.status, d.created_at
    from deposits d left join auth.users u on u.id = d.profile_id
    order by d.created_at desc;
end; $$;

-- ---- Withdrawals ----
create or replace function admin_withdrawals()
returns table (email text, amount numeric, asset text, network text, address text, status text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  return query
    select u.email, w.amount, w.asset, w.network, w.address, w.status, w.created_at
    from withdrawals w left join auth.users u on u.id = w.profile_id
    order by w.created_at desc;
end; $$;

-- ---- Fraud signals: accounts sharing a device or IP ----
create or replace function admin_fraud()
returns table (signal text, value text, accounts bigint, emails text)
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  return query
    select 'device'::text, p.device_hash, count(*), string_agg(u.email, ', ')
    from profiles p left join auth.users u on u.id = p.id
    where p.device_hash is not null group by p.device_hash having count(*) > 1
    union all
    select 'ip'::text, p.signup_ip, count(*), string_agg(u.email, ', ')
    from profiles p left join auth.users u on u.id = p.id
    where p.signup_ip is not null group by p.signup_ip having count(*) > 1;
end; $$;
