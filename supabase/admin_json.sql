-- ============================================================================
-- PicoWorker — make every admin dashboard tab work. The old functions used
-- RETURNS TABLE(email text, ...) but auth.users.email is varchar, so Postgres
-- threw "structure of query does not match function result type" on return.
-- Returning JSON arrays avoids strict column typing entirely. (Overview already
-- returned json, which is why only it worked.)
-- ============================================================================

drop function if exists admin_users();
drop function if exists admin_tasks();
drop function if exists admin_completions();
drop function if exists admin_deposits();
drop function if exists admin_withdrawals();
drop function if exists admin_fraud();
drop function if exists admin_tickets();

create or replace function admin_users()
returns json language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  return (select coalesce(json_agg(r order by r.created_at desc), '[]'::json) from (
    select p.id, u.email, p.display_name, p.mode, p.level, p.identity_verified,
           w.earner_balance, w.business_escrow, w.lifetime_earned, p.tasks_done,
           p.device_hash, p.signup_ip, p.is_admin, p.created_at
    from profiles p
    left join wallets w on w.profile_id = p.id
    left join auth.users u on u.id = p.id
  ) r);
end; $$;

create or replace function admin_tasks()
returns json language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  return (select coalesce(json_agg(r order by r.created_at desc), '[]'::json) from (
    select t.id, t.type, t.title, t.status, p.display_name as owner, t.reward,
           t.goal_count, t.done_count, t.auto_verify, t.created_at
    from tasks t left join profiles p on p.id = t.owner_id
  ) r);
end; $$;

create or replace function admin_completions()
returns json language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  return (select coalesce(json_agg(r order by r.created_at desc), '[]'::json) from (
    select c.id, t.title as task_title, p.display_name as earner, u.email as earner_email,
           c.status, c.proof_url, c.reward, c.created_at
    from task_completions c
    left join tasks t on t.id = c.task_id
    left join profiles p on p.id = c.earner_id
    left join auth.users u on u.id = c.earner_id
  ) r);
end; $$;

create or replace function admin_deposits()
returns json language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  return (select coalesce(json_agg(r order by r.created_at desc), '[]'::json) from (
    select u.email, d.amount, d.signature, d.status, d.created_at
    from deposits d left join auth.users u on u.id = d.profile_id
  ) r);
end; $$;

create or replace function admin_withdrawals()
returns json language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  return (select coalesce(json_agg(r order by r.created_at desc), '[]'::json) from (
    select u.email, w.amount, w.asset, w.network, w.address, w.status, w.signature, w.created_at
    from withdrawals w left join auth.users u on u.id = w.profile_id
  ) r);
end; $$;

create or replace function admin_fraud()
returns json language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  return (select coalesce(json_agg(r), '[]'::json) from (
    select 'device' as signal, p.device_hash as value, count(*) as accounts, string_agg(u.email, ', ') as emails
    from profiles p left join auth.users u on u.id = p.id
    where p.device_hash is not null group by p.device_hash having count(*) > 1
    union all
    select 'ip', p.signup_ip, count(*), string_agg(u.email, ', ')
    from profiles p left join auth.users u on u.id = p.id
    where p.signup_ip is not null group by p.signup_ip having count(*) > 1
  ) r);
end; $$;

create or replace function admin_tickets()
returns json language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  return (select coalesce(json_agg(r order by r.updated_at desc), '[]'::json) from (
    select t.id, u.email, p.display_name as name, t.status,
           (select m.body from support_messages m where m.ticket_id = t.id order by m.created_at desc limit 1) as last_message,
           (select count(*) from support_messages m where m.ticket_id = t.id) as messages,
           t.updated_at
    from support_tickets t
    left join profiles p on p.id = t.profile_id
    left join auth.users u on u.id = t.profile_id
  ) r);
end; $$;

notify pgrst, 'reload schema';
