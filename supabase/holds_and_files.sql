-- ============================================================================
-- 1) Job holds with a refundable deposit
-- 2) Business-selectable proof file types
--
-- HOLDS
-- A worker pays a small deposit to reserve a slot on a task. The deposit is
-- refunded when their proof is approved and forfeited if they abandon the hold
-- or let it expire. This exists so that a one-person job is not started by ten
-- people, nine of whom waste their time.
--
-- Blocking rule: a hold only blocks other workers when holds have consumed the
-- remaining slots. On a 500-worker campaign one hold blocks nobody; on a
-- one-person job it blocks everyone else, which is the point.
--
-- Forfeited deposits go to the development account rather than the business,
-- because the business gave up nothing when a worker abandoned.
-- ============================================================================

alter table ledger_entries drop constraint if exists ledger_entries_type_check;
alter table ledger_entries add constraint ledger_entries_type_check
  check (type in ('task_reward','offer_reward','withdrawal','deposit','escrow_hold',
                  'escrow_release','referral_bonus','welcome_bonus',
                  'team_share','development_share',
                  'hold_deposit','hold_refund','hold_forfeit'));

create table if not exists task_holds (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references tasks(id) on delete cascade,
  earner_id   uuid not null references profiles(id) on delete cascade,
  deposit     numeric(12,6) not null check (deposit >= 0),
  status      text not null default 'active' check (status in ('active','released','forfeited')),
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

-- One live hold per worker per task. Partial so a released hold can be retried.
create unique index if not exists task_holds_one_active
  on task_holds (task_id, earner_id) where status = 'active';
create index if not exists task_holds_active_idx
  on task_holds (task_id) where status = 'active';
create index if not exists task_holds_expiry_idx
  on task_holds (expires_at) where status = 'active';

alter table task_holds enable row level security;

drop policy if exists task_holds_read on task_holds;
create policy task_holds_read on task_holds
  for select using (
    earner_id = auth.uid()
    or is_admin()
    or exists (select 1 from tasks t where t.id = task_id and t.owner_id = auth.uid())
  );

-- All writes go through the definer functions below.
drop policy if exists task_holds_no_write on task_holds;
create policy task_holds_no_write on task_holds for all using (false) with check (false);

-- Tunables. Deposit is capped at the task reward so a hold can never cost more
-- than the job pays.
create or replace function hold_deposit_for(p_reward numeric)
returns numeric language sql immutable as $$
  select least(0.01, greatest(0, coalesce(p_reward, 0)));
$$;

create or replace function hold_window() returns interval language sql immutable as $$
  select interval '30 minutes';
$$;

create or replace function max_active_holds() returns int language sql immutable as $$
  select 2;
$$;

-- ---------------------------------------------------------------------------
-- Slots left on a task, counting approved work, work awaiting review, and
-- live holds. Used to decide whether a new hold or submission is allowed.
-- ---------------------------------------------------------------------------
create or replace function task_open_slots(p_task uuid, p_exclude_earner uuid default null)
returns int language sql stable security definer set search_path = public as $$
  select greatest(0,
    (select goal_count - done_count from tasks where id = p_task)
    - (select count(*) from task_completions c
        where c.task_id = p_task and c.status = 'pending_proof')
    - (select count(*) from task_holds h
        where h.task_id = p_task and h.status = 'active' and h.expires_at > now()
          and (p_exclude_earner is null or h.earner_id <> p_exclude_earner))
  )::int;
$$;

-- ---------------------------------------------------------------------------
-- Take a hold. Deducts the deposit immediately.
-- ---------------------------------------------------------------------------
create or replace function hold_task(p_task uuid)
returns json language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); t tasks%rowtype; dep numeric; bal numeric; h uuid; mine int;
begin
  if me is null then raise exception 'Sign in first'; end if;
  select * into t from tasks where id = p_task for update;
  if t.id is null or t.status <> 'live' then raise exception 'Task unavailable'; end if;
  if t.owner_id = me then raise exception 'Cannot hold your own task'; end if;
  if exists (select 1 from task_completions where task_id = p_task and earner_id = me) then
    raise exception 'You already submitted this task';
  end if;

  -- Expire stale holds first so an abandoned hold never blocks a fresh one.
  perform expire_task_holds();

  if exists (select 1 from task_holds
              where task_id = p_task and earner_id = me and status = 'active') then
    raise exception 'You already hold this task';
  end if;

  select count(*) into mine from task_holds
   where earner_id = me and status = 'active' and expires_at > now();
  if mine >= max_active_holds() then
    raise exception 'You can hold % jobs at a time. Finish or release one first.', max_active_holds();
  end if;

  if task_open_slots(p_task) <= 0 then
    raise exception 'No slots left on this task right now';
  end if;

  dep := hold_deposit_for(t.reward);
  select earner_balance into bal from wallets where profile_id = me for update;
  if coalesce(bal, 0) < dep then
    raise exception 'You need % to hold this job', to_char(dep, 'FM$999990.00');
  end if;

  if dep > 0 then
    update wallets set earner_balance = earner_balance - dep
     where profile_id = me returning earner_balance into bal;
    insert into ledger_entries(profile_id, amount, type, title, ref_id, balance_after)
    values (me, -dep, 'hold_deposit', 'Hold deposit · ' || t.title, p_task::text, bal);
  end if;

  insert into task_holds(task_id, earner_id, deposit, expires_at)
  values (p_task, me, dep, now() + hold_window())
  returning id into h;

  return json_build_object('id', h, 'deposit', dep,
                           'expires_at', now() + hold_window(), 'balance', bal);
end; $$;

-- ---------------------------------------------------------------------------
-- Settle a hold. p_refund true on approval, false on abandon/expiry.
-- Forfeited deposits go to the development recipients.
-- ---------------------------------------------------------------------------
create or replace function settle_task_hold(p_hold uuid, p_refund boolean)
returns void language plpgsql security definer set search_path = public as $$
declare h task_holds; bal numeric; total_weight numeric; r record; paid numeric := 0;
begin
  select * into h from task_holds where id = p_hold for update;
  if h.id is null or h.status <> 'active' then return; end if;

  if p_refund then
    update task_holds set status = 'released', resolved_at = now() where id = p_hold;
    if h.deposit > 0 then
      update wallets set earner_balance = earner_balance + h.deposit
       where profile_id = h.earner_id returning earner_balance into bal;
      insert into ledger_entries(profile_id, amount, type, title, ref_id, balance_after)
      values (h.earner_id, h.deposit, 'hold_refund', 'Hold deposit returned', h.task_id::text, bal);
    end if;
    return;
  end if;

  update task_holds set status = 'forfeited', resolved_at = now() where id = p_hold;
  if h.deposit <= 0 then return; end if;

  select coalesce(sum(weight), 0) into total_weight
    from revenue_recipients where role = 'development' and active;
  if total_weight > 0 then
    for r in select profile_id, weight from revenue_recipients
              where role = 'development' and active order by created_at, id loop
      paid := paid + credit_share(r.profile_id,
                round(h.deposit * r.weight / total_weight, 6),
                'hold_forfeit', 'Forfeited hold deposit', h.task_id::text);
    end loop;
  else
    raise warning 'hold forfeit: no development recipient, % undistributed', h.deposit;
  end if;
end; $$;

-- Worker gives the slot back. Deposit is forfeited: that is what deters
-- holding jobs speculatively.
create or replace function release_task_hold(p_task uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); h uuid;
begin
  select id into h from task_holds
   where task_id = p_task and earner_id = me and status = 'active';
  if h is null then return; end if;
  perform settle_task_hold(h, false);
end; $$;

create or replace function expire_task_holds()
returns int language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  for r in select id from task_holds where status = 'active' and expires_at <= now() loop
    perform settle_task_hold(r.id, false);
    n := n + 1;
  end loop;
  return n;
end; $$;

select cron.unschedule('expire-task-holds')
 where exists (select 1 from cron.job where jobname = 'expire-task-holds');
select cron.schedule('expire-task-holds', '*/5 * * * *', $$ select expire_task_holds(); $$);

-- ---------------------------------------------------------------------------
-- 2) Proof file types, declared per task.
-- ---------------------------------------------------------------------------
alter table tasks add column if not exists accepted_file_types text[] not null default '{image}';
alter table tasks add column if not exists max_file_mb int not null default 10;

revoke all on function settle_task_hold(uuid, boolean) from public, anon, authenticated;
revoke all on function expire_task_holds() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Wire holds into the submission paths. These bodies are revenue_split.sql's
-- (80/5/10/5 split) plus the hold checks, so this file must be applied AFTER
-- revenue_split.sql.
--
-- Refund timing: the deposit is returned when the worker SUBMITS, not when the
-- proof is approved. Forfeiting on rejection would punish someone who did the
-- work and lost a judgement call, which turns every rejection into a money
-- dispute. The deposit exists to deter holding a job and walking away, and
-- submitting proves they did not.
-- ---------------------------------------------------------------------------
create or replace function complete_task(
  p_task uuid, p_proof text default null, p_note text default null,
  p_proof_urls jsonb default '[]'::jsonb
) returns json language plpgsql security definer set search_path = public as $$
declare t tasks%rowtype; me uuid := auth.uid(); net numeric; new_bal numeric; avail numeric; h uuid;
begin
  select * into t from tasks where id = p_task for update;
  if t.id is null or t.status <> 'live' then raise exception 'Task unavailable'; end if;
  if t.owner_id = me then raise exception 'Cannot complete your own task'; end if;

  avail := coalesce((select business_escrow from wallets where profile_id = t.owner_id), 0) - business_held(t.owner_id);
  if avail < t.reward then raise exception 'This task is out of budget right now. Please try again later.'; end if;

  -- Respect other people's holds. task_open_slots ignores this worker's own
  -- hold, so holding a job is what guarantees the slot is still there.
  perform expire_task_holds();
  select id into h from task_holds
   where task_id = p_task and earner_id = me and status = 'active';
  if h is null and task_open_slots(p_task, me) <= 0 then
    raise exception 'This job is held by another worker right now. Try again shortly.';
  end if;

  if not t.auto_verify then
    insert into task_completions(task_id, earner_id, status, proof_url, proof_note, proof_urls, reward)
    values (p_task, me, 'pending_proof', p_proof, p_note, coalesce(p_proof_urls, '[]'::jsonb), t.reward);
    if h is not null then perform settle_task_hold(h, true); end if;
    return json_build_object('manual', true, 'reward', round(t.reward * 0.80, 6));
  end if;

  net := round(t.reward * 0.80, 6);
  insert into task_completions(task_id, earner_id, status, reward, decided_at)
  values (p_task, me, 'verified', t.reward, now());
  update wallets set earner_balance = earner_balance + net, lifetime_earned = lifetime_earned + net
   where profile_id = me returning earner_balance into new_bal;
  update wallets set business_escrow = greatest(0, business_escrow - t.reward) where profile_id = t.owner_id;
  update tasks set done_count = done_count + 1,
                   status = case when done_count + 1 >= goal_count then 'complete' else status end
   where id = p_task;
  update profiles set tasks_done = tasks_done + 1, streak_days = greatest(1, streak_days), last_active = now() where id = me;
  insert into ledger_entries(profile_id, amount, type, title, ref_id, balance_after)
  values (me, net, 'task_reward', t.title, p_task::text, new_bal);
  perform distribute_platform_cut(me, t.reward, net, t.title, p_task::text);
  if h is not null then perform settle_task_hold(h, true); end if;
  insert into email_outbox(to_email, template, data)
  select u.email, 'earning', jsonb_build_object('title', t.title, 'amount', net, 'balance', new_bal)
  from auth.users u where u.id = me;
  return json_build_object('manual', false, 'reward', net, 'balance', new_bal);
end; $$;

-- Agents must respect holds too, or a held one-person job could be taken by an
-- agent through the API while a human is still working on it.
create or replace function agent_complete_task(p_profile uuid, p_task uuid)
returns json language plpgsql security definer set search_path = public as $$
declare t tasks%rowtype; net numeric; new_bal numeric; avail numeric;
begin
  select * into t from tasks where id = p_task for update;
  if t.id is null or t.status <> 'live' then raise exception 'Task unavailable'; end if;
  if t.owner_id = p_profile then raise exception 'Cannot complete your own task'; end if;
  if t.audience not in ('agents','any') then raise exception 'This task is for humans only'; end if;
  if not t.auto_verify then raise exception 'Agents can only complete auto-verify tasks'; end if;

  avail := coalesce((select business_escrow from wallets where profile_id = t.owner_id), 0) - business_held(t.owner_id);
  if avail < t.reward then raise exception 'Task is out of budget right now'; end if;

  perform expire_task_holds();
  if task_open_slots(p_task, p_profile) <= 0 then
    raise exception 'This job is held by another worker right now';
  end if;

  begin
    insert into task_completions(task_id, earner_id, status, reward, decided_at, via_agent)
    values (p_task, p_profile, 'verified', t.reward, now(), true);
  exception when unique_violation then
    raise exception 'Already completed';
  end;

  net := round(t.reward * 0.80, 6);
  update wallets set earner_balance = earner_balance + net, lifetime_earned = lifetime_earned + net
   where profile_id = p_profile returning earner_balance into new_bal;
  update wallets set business_escrow = greatest(0, business_escrow - t.reward) where profile_id = t.owner_id;
  update tasks set done_count = done_count + 1,
                   status = case when done_count + 1 >= goal_count then 'complete' else status end
   where id = p_task;
  update profiles set tasks_done = tasks_done + 1, last_active = now() where id = p_profile;
  insert into ledger_entries(profile_id, amount, type, title, ref_id, balance_after)
  values (p_profile, net, 'task_reward', t.title, p_task::text, new_bal);
  perform distribute_platform_cut(p_profile, t.reward, net, t.title, p_task::text);
  return json_build_object('reward', net, 'balance', new_bal);
end; $$;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- create_campaign gains the proof file-type fields. New params are appended
-- with defaults so any client still on the old signature keeps working.
-- ---------------------------------------------------------------------------
create or replace function create_campaign(
  p_type text, p_title text, p_subtitle text, p_target text, p_reward numeric,
  p_goal integer, p_auto boolean, p_category text,
  p_proof_instructions text default null,
  p_reference_images jsonb default '[]'::jsonb,
  p_screenshots integer default 1,
  p_screenshot_specs jsonb default '[]'::jsonb,
  p_accepted_file_types text[] default '{image}',
  p_max_file_mb integer default 10
) returns tasks language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); row tasks; kinds text[];
begin
  -- Only file kinds the app knows how to accept and render. Anything else is
  -- dropped rather than trusted, since this value drives the upload filter.
  select coalesce(array_agg(k), '{image}')
    into kinds
    from unnest(coalesce(p_accepted_file_types, '{image}')) k
   where k in ('image','pdf','vector','archive');

  insert into tasks(owner_id, type, title, subtitle, target, reward, goal_count, auto_verify, status, category,
                    est_seconds, proof_instructions, reference_images, screenshots_required, screenshot_specs,
                    accepted_file_types, max_file_mb)
  values (me, p_type, p_title, p_subtitle, nullif(p_target,''), p_reward, p_goal, p_auto, 'paused', p_category,
          case when p_type='survey' then 240 when p_type='app_install' then 120 else 30 end,
          nullif(p_proof_instructions,''), coalesce(p_reference_images,'[]'::jsonb),
          greatest(1, coalesce(p_screenshots,1)), coalesce(p_screenshot_specs,'[]'::jsonb),
          kinds, least(50, greatest(1, coalesce(p_max_file_mb, 10))))
  returning * into row;
  return row;
end; $$;

notify pgrst, 'reload schema';

-- ============================================================================
-- Hold duration: admin-set defaults, per-task override, worker extension.
--
-- A 30-minute window is fine for "follow this account" and useless for "record
-- a 20-minute video". The business sets the window per task; admins set the
-- default and the ceiling; a worker who needs longer can request one extension
-- rather than losing the deposit to a clock that was never realistic.
-- ============================================================================

create table if not exists platform_settings (
  id                     boolean primary key default true check (id),
  hold_default_minutes   int not null default 30 check (hold_default_minutes between 5 and 1440),
  hold_max_minutes       int not null default 240 check (hold_max_minutes between 5 and 1440),
  hold_extend_minutes    int not null default 30 check (hold_extend_minutes between 5 and 1440),
  updated_at             timestamptz not null default now()
);
insert into platform_settings(id) values (true) on conflict (id) do nothing;

alter table platform_settings enable row level security;
drop policy if exists platform_settings_read on platform_settings;
create policy platform_settings_read on platform_settings for select using (true);
drop policy if exists platform_settings_no_write on platform_settings;
create policy platform_settings_no_write on platform_settings for all using (false) with check (false);

alter table tasks add column if not exists hold_minutes int;
alter table task_holds add column if not exists extended boolean not null default false;

create or replace function admin_set_hold_settings(
  p_default int, p_max int, p_extend int
) returns json language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  if p_default > p_max then raise exception 'Default hold time cannot exceed the maximum'; end if;
  update platform_settings
     set hold_default_minutes = p_default,
         hold_max_minutes = p_max,
         hold_extend_minutes = p_extend,
         updated_at = now()
   where id;
  return (select row_to_json(s) from platform_settings s where s.id);
end; $$;

-- Effective window for a task: its own value, clamped to the admin ceiling,
-- falling back to the admin default when the business did not choose one.
create or replace function task_hold_minutes(p_task uuid)
returns int language sql stable security definer set search_path = public as $$
  select least(
    coalesce((select t.hold_minutes from tasks t where t.id = p_task),
             (select hold_default_minutes from platform_settings where id)),
    (select hold_max_minutes from platform_settings where id)
  );
$$;

-- hold_task now uses the per-task window instead of a fixed 30 minutes.
create or replace function hold_task(p_task uuid)
returns json language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); t tasks%rowtype; dep numeric; bal numeric; h uuid; mine int;
        win interval; expires timestamptz;
begin
  if me is null then raise exception 'Sign in first'; end if;
  select * into t from tasks where id = p_task for update;
  if t.id is null or t.status <> 'live' then raise exception 'Task unavailable'; end if;
  if t.owner_id = me then raise exception 'Cannot hold your own task'; end if;
  if exists (select 1 from task_completions where task_id = p_task and earner_id = me) then
    raise exception 'You already submitted this task';
  end if;

  perform expire_task_holds();

  if exists (select 1 from task_holds
              where task_id = p_task and earner_id = me and status = 'active') then
    raise exception 'You already hold this task';
  end if;

  select count(*) into mine from task_holds
   where earner_id = me and status = 'active' and expires_at > now();
  if mine >= max_active_holds() then
    raise exception 'You can hold % jobs at a time. Finish or release one first.', max_active_holds();
  end if;

  if task_open_slots(p_task) <= 0 then
    raise exception 'No slots left on this task right now';
  end if;

  dep := hold_deposit_for(t.reward);
  select earner_balance into bal from wallets where profile_id = me for update;
  if coalesce(bal, 0) < dep then
    raise exception 'You need % to hold this job', to_char(dep, 'FM$999990.00');
  end if;

  win := make_interval(mins => task_hold_minutes(p_task));
  expires := now() + win;

  if dep > 0 then
    update wallets set earner_balance = earner_balance - dep
     where profile_id = me returning earner_balance into bal;
    insert into ledger_entries(profile_id, amount, type, title, ref_id, balance_after)
    values (me, -dep, 'hold_deposit', 'Hold deposit · ' || t.title, p_task::text, bal);
  end if;

  insert into task_holds(task_id, earner_id, deposit, expires_at)
  values (p_task, me, dep, expires)
  returning id into h;

  return json_build_object('id', h, 'deposit', dep, 'expires_at', expires, 'balance', bal);
end; $$;

-- One extension per hold. This is the appeal path for a job that genuinely
-- needs longer than the business allowed, and it costs the worker nothing.
create or replace function extend_task_hold(p_task uuid)
returns json language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); h task_holds; add int; expires timestamptz;
begin
  select * into h from task_holds
   where task_id = p_task and earner_id = me and status = 'active' for update;
  if h.id is null then raise exception 'You do not hold this job'; end if;
  if h.extended then raise exception 'You have already extended this hold once'; end if;

  select hold_extend_minutes into add from platform_settings where id;
  expires := greatest(h.expires_at, now()) + make_interval(mins => add);
  update task_holds set expires_at = expires, extended = true where id = h.id;
  return json_build_object('expires_at', expires, 'added_minutes', add);
end; $$;

-- Businesses choose the window at creation; clamped to the admin ceiling.
create or replace function create_campaign(
  p_type text, p_title text, p_subtitle text, p_target text, p_reward numeric,
  p_goal integer, p_auto boolean, p_category text,
  p_proof_instructions text default null,
  p_reference_images jsonb default '[]'::jsonb,
  p_screenshots integer default 1,
  p_screenshot_specs jsonb default '[]'::jsonb,
  p_accepted_file_types text[] default '{image}',
  p_max_file_mb integer default 10,
  p_hold_minutes integer default null
) returns tasks language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); row tasks; kinds text[]; ceiling int;
begin
  select coalesce(array_agg(k), '{image}')
    into kinds
    from unnest(coalesce(p_accepted_file_types, '{image}')) k
   where k in ('image','pdf','vector','archive');

  select hold_max_minutes into ceiling from platform_settings where id;

  insert into tasks(owner_id, type, title, subtitle, target, reward, goal_count, auto_verify, status, category,
                    est_seconds, proof_instructions, reference_images, screenshots_required, screenshot_specs,
                    accepted_file_types, max_file_mb, hold_minutes)
  values (me, p_type, p_title, p_subtitle, nullif(p_target,''), p_reward, p_goal, p_auto, 'paused', p_category,
          case when p_type='survey' then 240 when p_type='app_install' then 120 else 30 end,
          nullif(p_proof_instructions,''), coalesce(p_reference_images,'[]'::jsonb),
          greatest(1, coalesce(p_screenshots,1)), coalesce(p_screenshot_specs,'[]'::jsonb),
          kinds, least(50, greatest(1, coalesce(p_max_file_mb, 10))),
          case when p_hold_minutes is null then null
               else least(ceiling, greatest(5, p_hold_minutes)) end)
  returning * into row;
  return row;
end; $$;

revoke all on function task_hold_minutes(uuid) from public, anon;

notify pgrst, 'reload schema';
