-- ============================================================================
-- PicoWorker — fixes (run AFTER schema.sql). Idempotent.
-- ============================================================================

-- Daily streak bonus: enforce once per calendar day (server-side, abuse-proof).
alter table profiles add column if not exists last_bonus_date date;

create or replace function claim_daily_bonus()
returns json language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); bal numeric; lastd date;
begin
  select last_bonus_date into lastd from profiles where id = me;
  if lastd = current_date then
    return json_build_object('claimed', false, 'amount', 0,
                             'balance', coalesce((select earner_balance from wallets where profile_id = me), 0));
  end if;
  update wallets set earner_balance = earner_balance + 0.05, lifetime_earned = lifetime_earned + 0.05
   where profile_id = me returning earner_balance into bal;
  update profiles set last_bonus_date = current_date, streak_days = streak_days + 1, last_active = now()
   where id = me;
  insert into ledger_entries(profile_id, amount, type, title, balance_after)
  values (me, 0.05, 'welcome_bonus', 'Daily streak bonus', bal);
  return json_build_object('claimed', true, 'amount', 0.05, 'balance', bal);
end; $$;
