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
