-- ============================================================================
-- PicoWorker — moderation: account suspension + proof appeals (admin only).
-- Run AFTER admin.sql / admin_json.sql / admin_detail.sql / withdraw.sql.
-- ============================================================================

alter table profiles add column if not exists suspended boolean not null default false;
alter table profiles add column if not exists suspended_reason text;
alter table profiles add column if not exists suspended_at timestamptz;

alter table task_completions add column if not exists appeal_status text not null default 'none'; -- none|pending|reviewed|denied
alter table task_completions add column if not exists appeal_note text;

-- ---- Suspension -----------------------------------------------------------
create or replace function admin_set_suspended(p_profile uuid, p_suspended boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  update profiles set
    suspended = p_suspended,
    suspended_reason = case when p_suspended then p_reason else null end,
    suspended_at = case when p_suspended then now() else null end
  where id = p_profile;
end; $$;

-- Defense in depth: block suspended users from earning or cashing out, even if
-- they hit the API directly. Support and reading still work.
-- One function for several tables: read whichever owner column exists via JSON
-- (referencing new.earner_id directly would error on tables without it).
create or replace function block_suspended() returns trigger language plpgsql security definer set search_path = public as $$
declare j jsonb := to_jsonb(new); uid uuid;
begin
  uid := nullif(coalesce(j->>'earner_id', j->>'profile_id', j->>'owner_id'), '')::uuid;
  if uid is not null and (select suspended from profiles where id = uid) then
    raise exception 'Account suspended';
  end if;
  return new;
end; $$;

drop trigger if exists block_suspended_completion on task_completions;
create trigger block_suspended_completion before insert on task_completions
  for each row execute function block_suspended();

drop trigger if exists block_suspended_withdrawal on withdrawals;
create trigger block_suspended_withdrawal before insert on withdrawals
  for each row execute function block_suspended();

drop trigger if exists block_suspended_task on tasks;
create trigger block_suspended_task before insert on tasks
  for each row execute function block_suspended();

-- ---- Appeals --------------------------------------------------------------
-- Earner appeals their own rejected completion.
create or replace function appeal_completion(p_completion uuid, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); c task_completions;
begin
  select * into c from task_completions where id = p_completion and earner_id = me;
  if c.id is null then raise exception 'Not found'; end if;
  if c.status <> 'rejected' then raise exception 'Only rejected tasks can be appealed'; end if;
  if c.appeal_status = 'pending' then raise exception 'Appeal already submitted'; end if;
  update task_completions set appeal_status = 'pending', appeal_note = p_note where id = p_completion;
end; $$;

-- Admin: list pending appeals.
create or replace function admin_appeals()
returns json language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  return (select coalesce(json_agg(r order by r.created_at desc), '[]'::json) from (
    select c.id, t.title, p.display_name as earner, u.email, c.reward, c.proof_url,
           c.appeal_note, c.created_at
    from task_completions c
    left join tasks t on t.id = c.task_id
    left join profiles p on p.id = c.earner_id
    left join auth.users u on u.id = c.earner_id
    where c.appeal_status = 'pending'
  ) r);
end; $$;

-- Admin: approve (pays the earner) or deny an appeal.
create or replace function admin_resolve_appeal(p_completion uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare c task_completions; t tasks; new_bal numeric;
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  select * into c from task_completions where id = p_completion for update;
  if c.id is null or c.appeal_status <> 'pending' then return; end if;
  select * into t from tasks where id = c.task_id;

  if not p_approve then
    update task_completions set appeal_status = 'denied' where id = p_completion;
    return;
  end if;

  update task_completions set status = 'approved', appeal_status = 'reviewed' where id = p_completion;
  update wallets set earner_balance = earner_balance + c.reward, lifetime_earned = lifetime_earned + c.reward
   where profile_id = c.earner_id returning earner_balance into new_bal;
  update tasks set done_count = done_count + 1,
                   status = case when done_count + 1 >= goal_count then 'complete' else status end
   where id = c.task_id;
  insert into ledger_entries(profile_id, amount, type, title, ref_id, balance_after)
  values (c.earner_id, c.reward, 'task_reward', coalesce(t.title, 'Task'), c.task_id::text, coalesce(new_bal, c.reward));
  perform pay_referral(c.earner_id, c.reward, t.title);
  insert into email_outbox(to_email, template, data)
  select u.email, 'earning', jsonb_build_object('title', t.title, 'amount', c.reward, 'balance', new_bal)
  from auth.users u where u.id = c.earner_id;
end; $$;

-- ---- Surface suspension in the admin views --------------------------------
create or replace function admin_users()
returns json language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  return (select coalesce(json_agg(r order by r.created_at desc), '[]'::json) from (
    select p.id, u.email, p.display_name, p.mode, p.level, p.suspended, p.identity_verified,
           w.earner_balance, w.business_escrow, w.lifetime_earned, p.tasks_done,
           p.device_hash, p.signup_ip, p.is_admin, p.created_at
    from profiles p
    left join wallets w on w.profile_id = p.id
    left join auth.users u on u.id = p.id
  ) r);
end; $$;

create or replace function admin_user_detail(p_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare result json;
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  select json_build_object(
    'profile', (select row_to_json(x) from (
        select p.id, u.email, u.last_sign_in_at, u.email_confirmed_at, u.created_at as signed_up,
               p.display_name, p.business_name, p.mode, p.level, p.member_since,
               p.identity_verified, p.kyc_status, p.is_admin, p.suspended, p.suspended_reason, p.suspended_at,
               p.referral_code, p.referred_by, p.streak_days, p.last_bonus_date, p.tasks_done,
               p.device_hash, p.signup_ip, p.last_active
        from profiles p left join auth.users u on u.id = p.id where p.id = p_id) x),
    'referred_by_name', (select display_name from profiles where id = (select referred_by from profiles where id = p_id)),
    'wallet', (select row_to_json(w) from (
        select earner_balance, business_escrow, lifetime_earned from wallets where profile_id = p_id) w),
    'deposit_address', (select address from deposit_wallets where profile_id = p_id),
    'shared_device', greatest(0, (select count(*) - 1 from profiles where device_hash is not null
        and device_hash = (select device_hash from profiles where id = p_id))),
    'shared_ip', greatest(0, (select count(*) - 1 from profiles where signup_ip is not null
        and signup_ip = (select signup_ip from profiles where id = p_id))),
    'counts', json_build_object(
        'completions', (select count(*) from task_completions where earner_id = p_id),
        'approved',    (select count(*) from task_completions where earner_id = p_id and status in ('approved','verified')),
        'pending',     (select count(*) from task_completions where earner_id = p_id and status = 'pending_proof'),
        'deposits',    (select count(*) from deposits where profile_id = p_id),
        'withdrawals', (select count(*) from withdrawals where profile_id = p_id),
        'referred',    (select count(*) from referrals where referrer_id = p_id),
        'ref_earnings',(select coalesce(sum(earnings), 0) from referrals where referrer_id = p_id)),
    'recent_completions', (select coalesce(json_agg(c), '[]'::json) from (
        select t.title, tc.status, tc.reward, tc.created_at
        from task_completions tc left join tasks t on t.id = tc.task_id
        where tc.earner_id = p_id order by tc.created_at desc limit 15) c),
    'deposits', (select coalesce(json_agg(d), '[]'::json) from (
        select amount, signature, status, created_at from deposits where profile_id = p_id
        order by created_at desc limit 15) d),
    'withdrawals', (select coalesce(json_agg(wd), '[]'::json) from (
        select amount, address, status, signature, created_at from withdrawals where profile_id = p_id
        order by created_at desc limit 15) wd),
    'referrals', (select coalesce(json_agg(r), '[]'::json) from (
        select rp.display_name, rf.status, rf.earnings, rf.tasks
        from referrals rf left join profiles rp on rp.id = rf.referred_id
        where rf.referrer_id = p_id) r)
  ) into result;
  return result;
end; $$;

notify pgrst, 'reload schema';
