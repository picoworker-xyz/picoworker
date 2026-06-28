-- ============================================================================
-- Fee + escrow model.
--
-- Fees: businesses pay NO platform fee (they pay exactly the reward they set).
--   The 15% cut is on the worker side: worker keeps 85%, referrer gets 10% of
--   the reward, platform keeps 5% (and the 10% too if there's no referrer).
--
-- Escrow: money is held per submission, not at funding.
--   held    = rewards owed to pending submissions + rejections still inside the
--             7-day review window.
--   available (withdrawable) = business_escrow - held.
--   A worker can only submit while available covers the reward; when free
--   balance is gone, new submissions are blocked (the campaign pauses).
--   Rejecting holds the amount for 7 days for team review, then it returns to
--   available automatically (refunded) unless the rejection is overturned.
-- ============================================================================

alter table task_completions add column if not exists decided_at timestamptz;

create or replace function business_held(p_owner uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(sum(c.reward), 0)
  from task_completions c join tasks t on t.id = c.task_id
  where t.owner_id = p_owner
    and (c.status = 'pending_proof'
         or (c.status = 'rejected' and c.decided_at is not null and c.decided_at > now() - interval '7 days'));
$$;

create or replace function business_balance()
returns json language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); esc numeric; held numeric;
begin
  select coalesce(business_escrow, 0) into esc from wallets where profile_id = me;
  held := business_held(me);
  return json_build_object('balance', esc, 'held', held, 'available', greatest(0, esc - held));
end; $$;

-- Funding no longer locks the budget; it just makes the campaign live.
create or replace function fund_and_launch(p_task uuid)
returns json language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); t tasks;
begin
  select * into t from tasks where id = p_task and owner_id = me for update;
  if t.id is null then raise exception 'Task not found'; end if;
  if coalesce((select business_escrow from wallets where profile_id = me), 0) <= 0 then
    return json_build_object('ok', false, 'reason', 'Add funds before launching');
  end if;
  update tasks set status = 'live' where id = p_task;
  return json_build_object('ok', true);
end; $$;

-- Worker submits (manual) or completes (auto). Gated by available balance.
create or replace function complete_task(p_task uuid, p_proof text default null, p_note text default null, p_proof_urls jsonb default '[]'::jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare t tasks%rowtype; me uuid := auth.uid(); net numeric; new_bal numeric; avail numeric;
begin
  select * into t from tasks where id = p_task for update;
  if t.id is null or t.status <> 'live' then raise exception 'Task unavailable'; end if;
  if t.owner_id = me then raise exception 'Cannot complete your own task'; end if;

  avail := coalesce((select business_escrow from wallets where profile_id = t.owner_id), 0) - business_held(t.owner_id);
  if avail < t.reward then raise exception 'This task is out of budget right now. Please try again later.'; end if;

  if not t.auto_verify then
    insert into task_completions(task_id, earner_id, status, proof_url, proof_note, proof_urls, reward)
    values (p_task, me, 'pending_proof', p_proof, p_note, coalesce(p_proof_urls, '[]'::jsonb), t.reward);
    return json_build_object('manual', true, 'reward', round(t.reward * 0.85, 6));
  end if;

  net := round(t.reward * 0.85, 6);
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
  perform pay_referral(me, t.reward, t.title);
  insert into email_outbox(to_email, template, data)
  select u.email, 'earning', jsonb_build_object('title', t.title, 'amount', net, 'balance', new_bal)
  from auth.users u where u.id = me;
  return json_build_object('manual', false, 'reward', net, 'balance', new_bal);
end; $$;

-- Approve: pay worker 85%, referrer 10%, spend the reward from the business.
create or replace function approve_completion(p_completion uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c task_completions; t tasks; net numeric; new_bal numeric;
begin
  select * into c from task_completions where id = p_completion for update;
  if c.id is null or c.status <> 'pending_proof' then return; end if;
  select * into t from tasks where id = c.task_id;
  net := round(c.reward * 0.85, 6);
  update task_completions set status = 'approved', decided_at = now() where id = p_completion;
  update wallets set earner_balance = earner_balance + net, lifetime_earned = lifetime_earned + net
   where profile_id = c.earner_id returning earner_balance into new_bal;
  update wallets set business_escrow = greatest(0, business_escrow - c.reward) where profile_id = t.owner_id;
  update tasks set done_count = done_count + 1,
                   status = case when done_count + 1 >= goal_count then 'complete' else status end
   where id = c.task_id;
  insert into ledger_entries(profile_id, amount, type, title, ref_id, balance_after)
  values (c.earner_id, net, 'task_reward', coalesce(t.title, 'Task'), c.task_id::text, coalesce(new_bal, net));
  perform pay_referral(c.earner_id, c.reward, t.title);
  insert into email_outbox(to_email, template, data)
  select u.email, 'earning', jsonb_build_object('title', t.title, 'amount', net, 'balance', new_bal)
  from auth.users u where u.id = c.earner_id;
end; $$;

-- Reject: stamp decided_at so the 7-day review hold starts.
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
    update task_completions set status = 'rejected', decided_at = now(), reject_reason = nullif(trim(coalesce(p_reason, '')), '') where id = p_completion;
    insert into email_outbox(to_email, template, data)
    select u.email, 'task_rejected', jsonb_build_object('title', t.title, 'amount', c.reward, 'reason', coalesce(p_reason, ''))
    from auth.users u where u.id = c.earner_id;
  end if;
end; $$;

-- Business withdrawals can only take the available (un-held) balance.
create or replace function start_withdrawal(p_profile uuid, p_amount numeric, p_address text, p_source text default 'earner')
returns json language plpgsql security definer set search_path = public as $$
declare src text := case when p_source = 'business' then 'business' else 'earner' end;
        bal numeric; fee numeric := 0.20; wid uuid; daytot numeric; review boolean := false;
begin
  if src = 'business' then
    select greatest(0, coalesce(business_escrow, 0) - business_held(p_profile)) into bal from wallets where profile_id = p_profile for update;
  else
    select earner_balance into bal from wallets where profile_id = p_profile for update;
  end if;
  if bal is null then raise exception 'No wallet'; end if;
  if p_amount <= fee then raise exception 'Amount must be more than the $0.20 fee'; end if;
  if p_amount > bal then raise exception 'Insufficient balance'; end if;

  select coalesce(sum(amount), 0) into daytot from withdrawals
   where profile_id = p_profile and status <> 'failed' and created_at >= date_trunc('day', now());
  if daytot + p_amount > 5 then review := true; end if;

  if src = 'business' then
    update wallets set business_escrow = business_escrow - p_amount where profile_id = p_profile;
  else
    update wallets set earner_balance = earner_balance - p_amount where profile_id = p_profile;
  end if;
  insert into withdrawals(profile_id, amount, asset, network, address, fee, status, source)
  values (p_profile, p_amount, 'USDC', 'Solana', p_address, fee, case when review then 'pending_review' else 'pending' end, src)
  returning id into wid;
  insert into ledger_entries(profile_id, amount, type, title, ref_id, balance_after)
  values (p_profile, -p_amount, 'withdrawal', 'Withdraw · Solana', wid::text, bal - p_amount);
  return json_build_object('id', wid, 'net', round(p_amount - fee, 6), 'review', review);
end; $$;

notify pgrst, 'reload schema';
