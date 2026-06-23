-- ============================================================================
-- PicoWorker — manual proof for social tasks (run AFTER schema.sql). Idempotent.
-- Follow/watch/visit can't be auto-verified, so they require a username + a
-- screenshot and the provider approves them.
-- ============================================================================

alter table task_completions add column if not exists proof_note text;

-- complete_task now also stores the earner's note (username/handle).
create or replace function complete_task(p_task uuid, p_proof text default null, p_note text default null)
returns json language plpgsql security definer set search_path = public as $$
declare t tasks%rowtype; me uuid := auth.uid(); w_e wallets%rowtype; new_bal numeric;
begin
  select * into t from tasks where id = p_task for update;
  if t.id is null or t.status <> 'live' then raise exception 'Task unavailable'; end if;
  if t.owner_id = me then raise exception 'Cannot complete your own task'; end if;

  if not t.auto_verify then
    insert into task_completions(task_id, earner_id, status, proof_url, proof_note, reward)
    values (p_task, me, 'pending_proof', p_proof, p_note, t.reward);
    return json_build_object('manual', true, 'reward', t.reward);
  end if;

  insert into task_completions(task_id, earner_id, status, reward)
  values (p_task, me, 'verified', t.reward);
  update wallets set earner_balance = earner_balance + t.reward, lifetime_earned = lifetime_earned + t.reward
   where profile_id = me returning * into w_e;
  new_bal := w_e.earner_balance;
  update wallets set business_escrow = greatest(0, business_escrow - t.reward) where profile_id = t.owner_id;
  update tasks set done_count = done_count + 1,
                   status = case when done_count + 1 >= goal_count then 'complete' else status end
   where id = p_task;
  update profiles set tasks_done = tasks_done + 1, streak_days = greatest(1, streak_days), last_active = now() where id = me;
  insert into ledger_entries(profile_id, amount, type, title, ref_id, balance_after)
  values (me, t.reward, 'task_reward', t.title, p_task::text, new_bal);
  insert into ledger_entries(profile_id, amount, type, title, ref_id, balance_after)
  values (t.owner_id, -t.reward, 'escrow_release', t.title, p_task::text,
          (select business_escrow from wallets where profile_id = t.owner_id));
  insert into email_outbox(to_email, template, data)
  select u.email, 'earning', jsonb_build_object('title', t.title, 'amount', t.reward, 'balance', new_bal)
  from auth.users u where u.id = me;
  return json_build_object('manual', false, 'reward', t.reward, 'balance', new_bal);
end; $$;

-- Social/watch/visit tasks are manual (proof + provider approval), not auto.
update tasks set auto_verify = false where type in ('follow_x', 'yt_views', 'visit_site');
