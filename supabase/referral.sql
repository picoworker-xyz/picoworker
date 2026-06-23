-- ============================================================================
-- PicoWorker — referrals (run AFTER schema.sql + proof.sql). Idempotent.
-- A referred earner's inviter gets 10% of everything they earn, forever.
-- ============================================================================

-- Credit the inviter 10% whenever a referred earner is paid.
create or replace function pay_referral(p_earner uuid, p_amount numeric, p_title text)
returns void language plpgsql security definer set search_path = public as $$
declare ref uuid; cut numeric; bal numeric;
begin
  select referred_by into ref from profiles where id = p_earner;
  if ref is null then return; end if;
  cut := round(p_amount * 0.10, 4);
  if cut <= 0 then return; end if;
  update wallets set earner_balance = earner_balance + cut, lifetime_earned = lifetime_earned + cut
   where profile_id = ref returning earner_balance into bal;
  update referrals set earnings = earnings + cut, status = 'active', tasks = tasks + 1
   where referrer_id = ref and referred_id = p_earner;
  insert into ledger_entries(profile_id, amount, type, title, balance_after)
  values (ref, cut, 'referral_bonus', 'Referral · 10% of ' || coalesce(p_title, 'earning'), bal);
end; $$;

-- New-user trigger: also link the inviter if a referral code was passed.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare m text := coalesce(new.raw_user_meta_data->>'mode', 'earner');
        rc text := upper(coalesce(new.raw_user_meta_data->>'ref_code', ''));
        ref_id uuid;
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

  if rc <> '' then
    select id into ref_id from profiles where referral_code = rc and id <> new.id limit 1;
    if ref_id is not null then
      update profiles set referred_by = ref_id where id = new.id;
      insert into referrals(referrer_id, referred_id, display_name, status)
      values (ref_id, new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)), 'joined');
    end if;
  end if;

  insert into email_outbox(to_email, template, data)
  values (new.email, 'welcome',
          jsonb_build_object('name', coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)), 'mode', m));
  return new;
end; $$;

-- Auto-verify completion now also pays the referrer.
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
  perform pay_referral(me, t.reward, t.title);
  insert into email_outbox(to_email, template, data)
  select u.email, 'earning', jsonb_build_object('title', t.title, 'amount', t.reward, 'balance', new_bal)
  from auth.users u where u.id = me;
  return json_build_object('manual', false, 'reward', t.reward, 'balance', new_bal);
end; $$;

-- Manual proof approval now also pays the referrer.
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
  update wallets set business_escrow = greatest(0, business_escrow - c.reward) where profile_id = me;
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
