-- ============================================================================
-- AI agents on PicoWorker. Run after the other migrations (needs fees.sql).
--
-- Two sides:
--   1) Agents POST tasks: same escrow model as businesses, driven through the
--      agent-api Edge Function with an API key instead of a browser session.
--   2) Agents DO tasks: only tasks whose audience allows it. The human feed
--      and the agent API are kept apart by tasks.audience plus a trigger, so
--      agent submissions can never touch humans-only inventory (and humans
--      are never judged against agents-only work).
--
-- audience values:
--   humans  (default) real people only. Follow, watch, app test, survey.
--   agents  AI agents only. Data collection, categorization, research.
--   any     either may complete it.
-- ============================================================================

alter table tasks
  add column if not exists audience text not null default 'humans'
  check (audience in ('humans','agents','any'));
create index if not exists tasks_audience_idx on tasks (audience) where status = 'live';

alter table task_completions add column if not exists via_agent boolean not null default false;

-- ---- API keys (one business/earner profile can own several) ----
create table if not exists agent_keys (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references profiles(id) on delete cascade,
  name         text not null,
  key_hash     text not null unique,   -- sha256 hex of the full key; plaintext is never stored
  key_hint     text not null,          -- last 4 chars, for display
  revoked      boolean not null default false,
  last_used_at timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists agent_keys_profile_idx on agent_keys (profile_id);

alter table agent_keys enable row level security;
drop policy if exists "agent keys self read" on agent_keys;
create policy "agent keys self read" on agent_keys for select using (profile_id = auth.uid());

-- ---- The audience wall. Fires on every completion insert no matter which
--      RPC created it, so a future rewrite of complete_task cannot bypass it.
create or replace function enforce_task_audience()
returns trigger language plpgsql security definer set search_path = public as $$
declare aud text;
begin
  select audience into aud from tasks where id = new.task_id;
  if aud = 'agents' and not new.via_agent then
    raise exception 'This task accepts AI agent submissions only';
  end if;
  if aud = 'humans' and new.via_agent then
    raise exception 'This task accepts human submissions only';
  end if;
  return new;
end; $$;

drop trigger if exists task_audience_wall on task_completions;
create trigger task_audience_wall before insert on task_completions
  for each row execute function enforce_task_audience();

-- ---- Key management (called by the logged-in user from the app) ----
-- search_path includes extensions: on Supabase pgcrypto (gen_random_bytes,
-- digest) lives there, not in public.
create or replace function create_agent_key(p_name text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare me uuid := auth.uid(); raw text; hash text; row_id uuid; n int;
begin
  if me is null then raise exception 'Not signed in'; end if;
  select count(*) into n from agent_keys where profile_id = me and not revoked;
  if n >= 5 then raise exception 'Key limit reached (5). Revoke an old key first.'; end if;
  raw := 'pw_agent_' || encode(gen_random_bytes(24), 'hex');
  hash := encode(digest(raw, 'sha256'), 'hex');
  insert into agent_keys(profile_id, name, key_hash, key_hint)
  values (me, coalesce(nullif(trim(p_name), ''), 'Agent key'), hash, right(raw, 4))
  returning id into row_id;
  -- The plaintext key crosses the wire exactly once, here.
  return json_build_object('id', row_id, 'key', raw);
end; $$;

create or replace function revoke_agent_key(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update agent_keys set revoked = true where id = p_id and profile_id = auth.uid();
end; $$;

-- ============================================================================
-- Service-role RPCs, called only by the agent-api Edge Function, which passes
-- the key owner's profile id explicitly (there is no auth.uid() for API keys).
-- ============================================================================

-- Agent completes a task. Mirrors complete_task's auto path (worker keeps 85%,
-- referrer 10%) but: agents-eligible audience only, auto-verify only, flagged
-- via_agent, and no email spam to the key owner.
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

  net := round(t.reward * 0.85, 6);
  update wallets set earner_balance = earner_balance + net, lifetime_earned = lifetime_earned + net
   where profile_id = p_profile returning earner_balance into new_bal;
  update wallets set business_escrow = greatest(0, business_escrow - t.reward) where profile_id = t.owner_id;
  update tasks set done_count = done_count + 1,
                   status = case when done_count + 1 >= goal_count then 'complete' else status end
   where id = p_task;
  update profiles set tasks_done = tasks_done + 1, last_active = now() where id = p_profile;
  insert into ledger_entries(profile_id, amount, type, title, ref_id, balance_after)
  values (p_profile, net, 'task_reward', t.title, p_task::text, new_bal);
  perform pay_referral(p_profile, t.reward, t.title);
  return json_build_object('reward', net, 'balance', new_bal);
end; $$;

-- Agent posts a campaign (starts paused, funded separately like the app flow).
create or replace function agent_create_campaign(
  p_profile uuid, p_type text, p_title text, p_subtitle text, p_target text,
  p_reward numeric, p_goal int, p_audience text default 'humans',
  p_category text default 'Apps', p_auto boolean default true)
returns tasks language plpgsql security definer set search_path = public as $$
declare row tasks;
begin
  if p_reward is null or p_reward < 0.01 then raise exception 'Reward must be at least $0.01'; end if;
  if p_goal is null or p_goal < 1 then raise exception 'Goal must be at least 1'; end if;
  if p_audience not in ('humans','agents','any') then raise exception 'audience must be humans, agents or any'; end if;
  insert into tasks(owner_id, type, title, subtitle, target, reward, goal_count, auto_verify, status,
                    category, audience, est_seconds)
  values (p_profile, p_type, p_title, nullif(p_subtitle,''), nullif(p_target,''), p_reward, p_goal, p_auto,
          'paused', p_category, p_audience,
          case when p_type='survey' then 240 when p_type='app_install' then 120 else 30 end)
  returning * into row;
  return row;
end; $$;

-- Agent launches its campaign (same rule as fund_and_launch: needs escrow).
create or replace function agent_fund_launch(p_profile uuid, p_task uuid)
returns json language plpgsql security definer set search_path = public as $$
declare t tasks;
begin
  select * into t from tasks where id = p_task and owner_id = p_profile for update;
  if t.id is null then raise exception 'Task not found'; end if;
  if coalesce((select business_escrow from wallets where profile_id = p_profile), 0) <= 0 then
    return json_build_object('ok', false, 'reason', 'Add funds before launching');
  end if;
  update tasks set status = 'live' where id = p_task;
  return json_build_object('ok', true);
end; $$;

-- Lock the service RPCs away from browser sessions: only the Edge Function
-- (service_role) may call them.
revoke execute on function agent_complete_task(uuid, uuid) from public, anon, authenticated;
revoke execute on function agent_create_campaign(uuid, text, text, text, text, numeric, int, text, text, boolean) from public, anon, authenticated;
revoke execute on function agent_fund_launch(uuid, uuid) from public, anon, authenticated;
grant execute on function agent_complete_task(uuid, uuid) to service_role;
grant execute on function agent_create_campaign(uuid, text, text, text, text, numeric, int, text, text, boolean) to service_role;
grant execute on function agent_fund_launch(uuid, uuid) to service_role;

-- Agent reviews a manual proof on its own campaign: mirrors review_proof but
-- with the owner passed explicitly (API keys have no auth.uid()).
create or replace function agent_review_proof(p_profile uuid, p_completion uuid, p_approve boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare c task_completions; t tasks;
begin
  select * into c from task_completions where id = p_completion for update;
  if c.id is null then raise exception 'Not found'; end if;
  select * into t from tasks where id = c.task_id;
  if t.owner_id <> p_profile then raise exception 'Not your task'; end if;
  if c.status <> 'pending_proof' then return; end if;
  if p_approve then
    perform approve_completion(p_completion);
  else
    update task_completions
       set status = 'rejected', decided_at = now(),
           reject_reason = nullif(trim(coalesce(p_reason, '')), '')
     where id = p_completion;
    insert into email_outbox(to_email, template, data)
    select u.email, 'task_rejected', jsonb_build_object('title', t.title, 'amount', c.reward, 'reason', coalesce(p_reason, ''))
    from auth.users u where u.id = c.earner_id;
  end if;
end; $$;

revoke execute on function agent_review_proof(uuid, uuid, boolean, text) from public, anon, authenticated;
grant execute on function agent_review_proof(uuid, uuid, boolean, text) to service_role;
