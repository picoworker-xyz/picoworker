-- ============================================================================
-- PicoWorker — real Solana USDC payouts (run AFTER schema.sql + referral.sql).
-- Earners withdraw from earner_balance, businesses withdraw their leftover
-- business_escrow (funds committed to live campaigns are already held out of it).
-- Also fixes a double-charge: a campaign budget is held at fund time, so a
-- completion must NOT deduct business_escrow again.
-- ============================================================================

alter table withdrawals add column if not exists signature text;
alter table withdrawals add column if not exists source text default 'earner';

-- A user can hold both an earner_balance and business_escrow (mode is just the
-- current toggle), so the wallet to debit is passed explicitly as p_source.
drop function if exists start_withdrawal(uuid, numeric, text);
create or replace function start_withdrawal(p_profile uuid, p_amount numeric, p_address text, p_source text default 'earner')
returns json language plpgsql security definer set search_path = public as $$
declare src text := case when p_source = 'business' then 'business' else 'earner' end;
        bal numeric; fee numeric := 0.20; wid uuid;
begin
  if src = 'business' then
    select business_escrow into bal from wallets where profile_id = p_profile for update;
  else
    select earner_balance into bal from wallets where profile_id = p_profile for update;
  end if;
  if bal is null then raise exception 'No wallet'; end if;
  if p_amount <= fee then raise exception 'Amount must be more than the $0.20 fee'; end if;
  if p_amount > bal then raise exception 'Insufficient balance'; end if;

  if src = 'business' then
    update wallets set business_escrow = business_escrow - p_amount where profile_id = p_profile;
  else
    update wallets set earner_balance = earner_balance - p_amount where profile_id = p_profile;
  end if;
  insert into withdrawals(profile_id, amount, asset, network, address, fee, status, source)
  values (p_profile, p_amount, 'USDC', 'Solana', p_address, fee, 'pending', src) returning id into wid;
  insert into ledger_entries(profile_id, amount, type, title, ref_id, balance_after)
  values (p_profile, -p_amount, 'withdrawal', 'Withdraw · Solana', wid::text, bal - p_amount);
  return json_build_object('id', wid, 'net', round(p_amount - fee, 6));
end; $$;

-- Mark sent, or failed (which refunds the same wallet it was taken from).
create or replace function finish_withdrawal(p_id uuid, p_sig text, p_ok boolean)
returns void language plpgsql security definer set search_path = public as $$
declare w withdrawals; newbal numeric;
begin
  select * into w from withdrawals where id = p_id for update;
  if w.id is null or w.status <> 'pending' then return; end if;
  if p_ok then
    update withdrawals set status = 'sent', signature = p_sig where id = p_id;
  else
    update withdrawals set status = 'failed', signature = p_sig where id = p_id;
    if w.source = 'business' then
      update wallets set business_escrow = business_escrow + w.amount where profile_id = w.profile_id
        returning business_escrow into newbal;
    else
      update wallets set earner_balance = earner_balance + w.amount where profile_id = w.profile_id
        returning earner_balance into newbal;
    end if;
    insert into ledger_entries(profile_id, amount, type, title, ref_id, balance_after)
    values (w.profile_id, w.amount, 'deposit', 'Withdrawal refunded', p_id::text, newbal);
  end if;
end; $$;

revoke execute on function start_withdrawal(uuid, numeric, text, text) from anon, authenticated;
revoke execute on function finish_withdrawal(uuid, text, boolean) from anon, authenticated;

-- ----------------------------------------------------------------------------
-- Fix the double-charge: a completion pays the earner out of the budget that
-- was already held at fund time, so it must not touch business_escrow again.
-- ----------------------------------------------------------------------------
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

create or replace function review_proof(p_completion uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
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
  update wallets set earner_balance = earner_balance + c.reward, lifetime_earned = lifetime_earned + c.reward
   where profile_id = c.earner_id returning earner_balance into new_bal;
  update tasks set done_count = done_count + 1,
                   status = case when done_count + 1 >= goal_count then 'complete' else status end
   where id = t.id;
  insert into ledger_entries(profile_id, amount, type, title, ref_id, balance_after)
  values (c.earner_id, c.reward, 'task_reward', t.title, t.id::text, coalesce(new_bal, c.reward));
  perform pay_referral(c.earner_id, c.reward, t.title);
  insert into email_outbox(to_email, template, data)
  select u.email, 'earning', jsonb_build_object('title', t.title, 'amount', c.reward, 'balance', new_bal)
  from auth.users u where u.id = c.earner_id;
end; $$;
