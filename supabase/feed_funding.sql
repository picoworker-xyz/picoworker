-- Hide live tasks from the earner feed when the owner can't currently cover the reward.
-- The earner can't read other businesses' wallets (RLS), so this runs SECURITY DEFINER and
-- returns just the ids to hide. The store loads it in parallel and filters liveTasks().
create or replace function underfunded_task_ids()
returns json language sql security definer set search_path = public stable as $$
  select coalesce(json_agg(t.id), '[]'::json)
  from tasks t
  join wallets w on w.profile_id = t.owner_id
  where t.status = 'live'
    and (w.business_escrow - business_held(t.owner_id)) < t.reward;
$$;

grant execute on function underfunded_task_ids() to anon, authenticated;

-- Server-side guard: a task can never be set 'live' unless its owner has enough
-- available balance (escrow minus held) to cover the reward. This closes the hole
-- where the Pause/Resume button flipped tasks.status directly, letting a $0 owner
-- launch a task. Enforced in the DB, so it holds regardless of the frontend.
create or replace function enforce_task_funding()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'live' then
    if (coalesce((select business_escrow from wallets where profile_id = new.owner_id), 0) - business_held(new.owner_id)) < new.reward then
      new.status := 'paused';
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_task_funding on tasks;
create trigger trg_task_funding before insert or update on tasks
  for each row execute function enforce_task_funding();
