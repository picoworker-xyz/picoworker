-- ============================================================================
-- Revenue split: worker 80%, referrer 5%, team 10%, development 5%.
--
-- Replaces the old 85/10/5 model in fees.sql, agents.sql and referral.sql,
-- where the platform's 5% was deducted from the business but credited to no
-- account at all. Every share is now paid into a real wallet.
--
-- Conservation rule: the development share is computed as the RESIDUAL
-- (gross - worker - referrer - team), never as gross * 0.05. Six-way splits of
-- 10% do not divide evenly at 6dp, so computing each share independently would
-- leak or mint fractions of a cent on every task. The residual absorbs all
-- rounding, so the four shares always sum to exactly the gross.
--
-- Recipients are data, not code: seed revenue_recipients with the six team
-- profiles and one development profile. If a role has no active recipient its
-- share falls through to development; if development is empty too, the amount
-- stays undistributed and is logged rather than silently lost.
-- ============================================================================

-- New ledger types for the shares.
alter table ledger_entries drop constraint if exists ledger_entries_type_check;
alter table ledger_entries add constraint ledger_entries_type_check
  check (type in ('task_reward','offer_reward','withdrawal','deposit','escrow_hold',
                  'escrow_release','referral_bonus','welcome_bonus',
                  'team_share','development_share',
   'hold_deposit','hold_refund','hold_forfeit'));

create table if not exists revenue_recipients (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  role        text not null check (role in ('team','development')),
  weight      integer not null default 1 check (weight > 0),
  active      boolean not null default true,
  note        text,
  created_at  timestamptz not null default now(),
  unique (profile_id, role)
);

alter table revenue_recipients enable row level security;

drop policy if exists revenue_recipients_admin_read on revenue_recipients;
create policy revenue_recipients_admin_read on revenue_recipients
  for select using (is_admin() or profile_id = auth.uid());

-- Writes go through admin RPCs only, never straight from the client.
drop policy if exists revenue_recipients_admin_write on revenue_recipients;
create policy revenue_recipients_admin_write on revenue_recipients
  for all using (false) with check (false);

create index if not exists revenue_recipients_active_idx
  on revenue_recipients (role, active) where active;

-- ---------------------------------------------------------------------------
-- Credit one wallet and write its ledger row. Returns the amount actually paid.
-- ---------------------------------------------------------------------------
create or replace function credit_share(
  p_profile uuid, p_amount numeric, p_type text, p_title text, p_ref_id text
) returns numeric language plpgsql security definer set search_path = public as $$
declare bal numeric;
begin
  if p_profile is null or p_amount is null or p_amount <= 0 then return 0; end if;
  update wallets set earner_balance = earner_balance + p_amount,
                     lifetime_earned = lifetime_earned + p_amount
   where profile_id = p_profile returning earner_balance into bal;
  -- No wallet means the recipient row points at a deleted or unprovisioned
  -- profile. Skip rather than abort: one bad recipient must not block payout
  -- of the worker's own reward.
  if bal is null then
    raise warning 'revenue split: no wallet for recipient %', p_profile;
    return 0;
  end if;
  insert into ledger_entries(profile_id, amount, type, title, ref_id, balance_after)
  values (p_profile, p_amount, p_type, p_title, p_ref_id, bal);
  return p_amount;
end; $$;

-- ---------------------------------------------------------------------------
-- Distribute the 20% platform cut. Called after the worker has been credited.
-- Returns the total actually distributed.
-- ---------------------------------------------------------------------------
create or replace function distribute_platform_cut(
  p_earner uuid, p_gross numeric, p_net numeric, p_title text, p_ref_id text default null
) returns numeric language plpgsql security definer set search_path = public as $$
declare ref uuid; ref_paid numeric := 0; team_pool numeric; team_paid numeric := 0;
        dev_share numeric; dev_paid numeric := 0; total_weight numeric; r record;
        label text := coalesce(nullif(btrim(p_title), ''), 'earning');
begin
  if p_gross is null or p_gross <= 0 then return 0; end if;

  -- Referrer: 5%, down from 10%. Falls through to development when the worker
  -- was not referred.
  select referred_by into ref from profiles where id = p_earner;
  if ref is not null then
    ref_paid := credit_share(ref, round(p_gross * 0.05, 6), 'referral_bonus',
                             'Referral · 5% of ' || label, p_ref_id);
    if ref_paid > 0 then
      update referrals set earnings = earnings + ref_paid, status = 'active', tasks = tasks + 1
       where referrer_id = ref and referred_id = p_earner;
    end if;
  end if;

  -- Team: 10% split by weight across active team members.
  team_pool := round(p_gross * 0.10, 6);
  select coalesce(sum(weight), 0) into total_weight
    from revenue_recipients where role = 'team' and active;
  if total_weight > 0 then
    for r in select profile_id, weight from revenue_recipients
              where role = 'team' and active order by created_at, id loop
      team_paid := team_paid + credit_share(
        r.profile_id, round(team_pool * r.weight / total_weight, 6),
        'team_share', 'Team share · ' || label, p_ref_id);
    end loop;
  end if;

  -- Development takes its 5% plus every unclaimed remainder, so the four
  -- shares reconcile to the gross exactly.
  dev_share := p_gross - p_net - ref_paid - team_paid;
  if dev_share > 0 then
    select coalesce(sum(weight), 0) into total_weight
      from revenue_recipients where role = 'development' and active;
    if total_weight > 0 then
      for r in select profile_id, weight from revenue_recipients
                where role = 'development' and active order by created_at, id loop
        dev_paid := dev_paid + credit_share(
          r.profile_id, round(dev_share * r.weight / total_weight, 6),
          'development_share', 'Development share · ' || label, p_ref_id);
      end loop;
    else
      raise warning 'revenue split: no development recipient, % undistributed', dev_share;
    end if;
  end if;

  return ref_paid + team_paid + dev_paid;
end; $$;

-- pay_referral is now folded into distribute_platform_cut. Kept as a no-op
-- shim so any call site missed by this migration cannot double-pay a referrer.
create or replace function pay_referral(p_earner uuid, p_amount numeric, p_title text)
returns void language plpgsql security definer set search_path = public as $$
begin
  raise warning 'pay_referral is deprecated; distribute_platform_cut handles referrals';
end; $$;

-- ---------------------------------------------------------------------------
-- Worker share drops from 85% to 80%.
-- ---------------------------------------------------------------------------
create or replace function complete_task(
  p_task uuid, p_proof text default null, p_note text default null,
  p_proof_urls jsonb default '[]'::jsonb
) returns json language plpgsql security definer set search_path = public as $$
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
  insert into email_outbox(to_email, template, data)
  select u.email, 'earning', jsonb_build_object('title', t.title, 'amount', net, 'balance', new_bal)
  from auth.users u where u.id = me;
  return json_build_object('manual', false, 'reward', net, 'balance', new_bal);
end; $$;

create or replace function approve_completion(p_completion uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c task_completions; t tasks; net numeric; new_bal numeric;
begin
  select * into c from task_completions where id = p_completion for update;
  if c.id is null or c.status <> 'pending_proof' then return; end if;
  select * into t from tasks where id = c.task_id;
  net := round(c.reward * 0.80, 6);
  update task_completions set status = 'approved', decided_at = now() where id = p_completion;
  update wallets set earner_balance = earner_balance + net, lifetime_earned = lifetime_earned + net
   where profile_id = c.earner_id returning earner_balance into new_bal;
  update wallets set business_escrow = greatest(0, business_escrow - c.reward) where profile_id = t.owner_id;
  update tasks set done_count = done_count + 1,
                   status = case when done_count + 1 >= goal_count then 'complete' else status end
   where id = c.task_id;
  insert into ledger_entries(profile_id, amount, type, title, ref_id, balance_after)
  values (c.earner_id, net, 'task_reward', coalesce(t.title, 'Task'), c.task_id::text, coalesce(new_bal, net));
  perform distribute_platform_cut(c.earner_id, c.reward, net, t.title, c.task_id::text);
  insert into email_outbox(to_email, template, data)
  select u.email, 'earning', jsonb_build_object('title', t.title, 'amount', net, 'balance', new_bal)
  from auth.users u where u.id = c.earner_id;
end; $$;

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

-- Stale overloads from schema.sql, proof.sql, referral.sql and withdraw.sql
-- still pay 85% and still resolve by argument count. Dropping them removes the
-- drift and the ambiguous-call risk; the app only ever calls the 4-arg form.
drop function if exists complete_task(uuid, text);
drop function if exists complete_task(uuid, text, text);

-- Appeal approvals paid the worker the FULL reward (moderation.sql:96) and
-- never touched business_escrow, so an overturned rejection minted money. Now
-- it matches approve_completion: 80% to the worker, escrow debited, cut split.
create or replace function admin_resolve_appeal(p_completion uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare c task_completions; t tasks; net numeric; new_bal numeric;
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  select * into c from task_completions where id = p_completion for update;
  if c.id is null or c.appeal_status <> 'pending' then return; end if;
  select * into t from tasks where id = c.task_id;

  if not p_approve then
    update task_completions set appeal_status = 'denied' where id = p_completion;
    return;
  end if;

  net := round(c.reward * 0.80, 6);
  update task_completions set status = 'approved', appeal_status = 'reviewed', decided_at = now()
   where id = p_completion;
  update wallets set earner_balance = earner_balance + net, lifetime_earned = lifetime_earned + net
   where profile_id = c.earner_id returning earner_balance into new_bal;
  update wallets set business_escrow = greatest(0, business_escrow - c.reward)
   where profile_id = t.owner_id;
  update tasks set done_count = done_count + 1,
                   status = case when done_count + 1 >= goal_count then 'complete' else status end
   where id = c.task_id;
  insert into ledger_entries(profile_id, amount, type, title, ref_id, balance_after)
  values (c.earner_id, net, 'task_reward', coalesce(t.title, 'Task'), c.task_id::text, coalesce(new_bal, net));
  perform distribute_platform_cut(c.earner_id, c.reward, net, t.title, c.task_id::text);
  insert into email_outbox(to_email, template, data)
  select u.email, 'earning', jsonb_build_object('title', t.title, 'amount', net, 'balance', new_bal)
  from auth.users u where u.id = c.earner_id;
end; $$;

-- ---------------------------------------------------------------------------
-- Admin management of recipients.
-- ---------------------------------------------------------------------------
create or replace function admin_set_revenue_recipient(
  p_profile uuid, p_role text, p_weight integer default 1,
  p_active boolean default true, p_note text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  if p_role not in ('team','development') then raise exception 'Invalid role'; end if;
  if not exists (select 1 from wallets where profile_id = p_profile) then
    raise exception 'Recipient has no wallet';
  end if;
  insert into revenue_recipients(profile_id, role, weight, active, note)
  values (p_profile, p_role, greatest(1, coalesce(p_weight, 1)), coalesce(p_active, true), p_note)
  on conflict (profile_id, role) do update
    set weight = excluded.weight, active = excluded.active, note = excluded.note;
end; $$;

create or replace function admin_revenue_recipients()
returns json language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  return coalesce((
    select json_agg(row_to_json(x) order by x.role, x.created_at)
    from (
      select r.id, r.profile_id, r.role, r.weight, r.active, r.note, r.created_at,
             p.display_name, w.earner_balance
      from revenue_recipients r
      join profiles p on p.id = r.profile_id
      left join wallets w on w.profile_id = r.profile_id
    ) x
  ), '[]'::json);
end; $$;

revoke all on function credit_share(uuid, numeric, text, text, text) from public, anon, authenticated;
revoke all on function distribute_platform_cut(uuid, numeric, numeric, text, text) from public, anon, authenticated;
