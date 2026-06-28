-- ============================================================================
-- Task features:
--  1) screenshots_required + per-screenshot pricing (handled in reward at create)
--  2) reject with a reason the worker can see, and allow a redo
--  3) auto-approve pending proofs that sit unreviewed for 7 days
-- ============================================================================

alter table tasks add column if not exists screenshots_required int not null default 1;
alter table task_completions add column if not exists reject_reason text;
alter table task_completions add column if not exists proof_urls jsonb not null default '[]'::jsonb;

-- create_campaign now also stores screenshots_required.
drop function if exists create_campaign(text, text, text, text, numeric, int, boolean, text, text, jsonb);
create or replace function create_campaign(
  p_type text, p_title text, p_subtitle text, p_target text,
  p_reward numeric, p_goal int, p_auto boolean, p_category text,
  p_proof_instructions text default null, p_reference_images jsonb default '[]'::jsonb,
  p_screenshots int default 1)
returns tasks language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); row tasks;
begin
  insert into tasks(owner_id, type, title, subtitle, target, reward, goal_count, auto_verify, status, category,
                    est_seconds, proof_instructions, reference_images, screenshots_required)
  values (me, p_type, p_title, p_subtitle, nullif(p_target,''), p_reward, p_goal, p_auto, 'paused', p_category,
          case when p_type='survey' then 240 when p_type='app_install' then 120 else 30 end,
          nullif(p_proof_instructions,''), coalesce(p_reference_images, '[]'::jsonb), greatest(1, coalesce(p_screenshots, 1)))
  returning * into row;
  return row;
end; $$;

-- complete_task now stores multiple proof image URLs for manual tasks.
drop function if exists complete_task(uuid, text, text);
create or replace function complete_task(p_task uuid, p_proof text default null, p_note text default null, p_proof_urls jsonb default '[]'::jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare t tasks%rowtype; me uuid := auth.uid(); w_e wallets%rowtype; new_bal numeric;
begin
  select * into t from tasks where id = p_task for update;
  if t.id is null or t.status <> 'live' then raise exception 'Task unavailable'; end if;
  if t.owner_id = me then raise exception 'Cannot complete your own task'; end if;

  if not t.auto_verify then
    insert into task_completions(task_id, earner_id, status, proof_url, proof_note, proof_urls, reward)
    values (p_task, me, 'pending_proof', p_proof, p_note, coalesce(p_proof_urls, '[]'::jsonb), t.reward);
    return json_build_object('manual', true, 'reward', t.reward);
  end if;

  insert into task_completions(task_id, earner_id, status, reward)
  values (p_task, me, 'verified', t.reward);
  update wallets set earner_balance = earner_balance + t.reward, lifetime_earned = lifetime_earned + t.reward
   where profile_id = me returning * into w_e;
  new_bal := w_e.earner_balance;
  update tasks set done_count = done_count + 1,
                   status = case when done_count + 1 >= goal_count then 'complete' else status end
   where id = p_task;
  update profiles set tasks_done = tasks_done + 1, streak_days = greatest(1, streak_days), last_active = now() where id = me;
  insert into ledger_entries(profile_id, amount, type, title, ref_id, balance_after)
  values (me, t.reward, 'task_reward', t.title, p_task::text, new_bal);
  perform pay_referral(me, t.reward, t.title);
  insert into email_outbox(to_email, template, data)
  select u.email, 'earning', jsonb_build_object('title', t.title, 'amount', t.reward, 'balance', new_bal)
  from auth.users u where u.id = me;
  return json_build_object('manual', false, 'reward', t.reward, 'balance', new_bal);
end; $$;

-- Shared approve path (used by manual review, auto-approve, and appeals).
create or replace function approve_completion(p_completion uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c task_completions; t tasks; new_bal numeric;
begin
  select * into c from task_completions where id = p_completion for update;
  if c.id is null or c.status <> 'pending_proof' then return; end if;
  select * into t from tasks where id = c.task_id;
  update task_completions set status = 'approved' where id = p_completion;
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

-- review_proof now takes an optional rejection reason.
drop function if exists review_proof(uuid, boolean);
create or replace function review_proof(p_completion uuid, p_approve boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); c task_completions; t tasks;
begin
  select * into c from task_completions where id = p_completion for update;
  if c.id is null then raise exception 'Not found'; end if;
  select * into t from tasks where id = c.task_id;
  if t.owner_id <> me then raise exception 'Not your task'; end if;
  if c.status <> 'pending_proof' then return; end if;

  if p_approve then
    perform approve_completion(p_completion);
  else
    update task_completions set status = 'rejected', reject_reason = nullif(trim(coalesce(p_reason, '')), '') where id = p_completion;
    insert into email_outbox(to_email, template, data)
    select u.email, 'task_rejected', jsonb_build_object('title', t.title, 'amount', c.reward, 'reason', coalesce(p_reason, ''))
    from auth.users u where u.id = c.earner_id;
  end if;
end; $$;

-- Auto-approve proofs left unreviewed for 7 days.
create or replace function auto_approve_old_proofs()
returns int language plpgsql security definer set search_path = public as $$
declare r record; cnt int := 0;
begin
  for r in select id from task_completions where status = 'pending_proof' and created_at < now() - interval '7 days' loop
    perform approve_completion(r.id);
    cnt := cnt + 1;
  end loop;
  return cnt;
end; $$;

select cron.unschedule('auto-approve-proofs') where exists (select 1 from cron.job where jobname = 'auto-approve-proofs');
select cron.schedule('auto-approve-proofs', '0 2 * * *', $$ select auto_approve_old_proofs(); $$);

notify pgrst, 'reload schema';
