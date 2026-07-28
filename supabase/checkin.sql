-- ============================================================================
-- PicoWorker — 100-day daily check-in (run AFTER schema.sql + fixes.sql).
-- Day 1 pays $0.001 and the reward grows exponentially to $0.16 on day 100,
-- costing $5.00 for a full 100-day streak. The cap was $1.00, which cost
-- $19.90 per completed streak and paid ~25x an average task reward on the
-- final day. The cap alone drives nearly all of the total, so it is the knob
-- to turn: see the CAP constant below.
-- One claim per calendar day; consecutive days advance the streak, a missed
-- day resets it to day 1. Server-side and abuse-proof.
-- ============================================================================

alter table profiles add column if not exists last_bonus_date date;

-- Days 1-10 are linear: $0.001, $0.002 ... $0.010 (plus a tenth of a cent each
-- day). From day 11 it grows exponentially up to the day-100 cap.
--
-- The 16.0 below is CAP / 0.010, where CAP is the day-100 reward. To retarget
-- the total cost of a full streak, change it: 16.0 gives $0.16 on day 100 and
-- $5.00 over 100 days; the old 100.0 gave $1.00 and $19.90.
create or replace function checkin_reward(p_day int)
returns numeric language sql immutable as $$
  select case
    when least(greatest(p_day, 1), 100) <= 10
      then round(0.001 * least(greatest(p_day, 1), 100), 4)
    else round(0.010 * power(16.0, (least(greatest(p_day, 1), 100) - 10)::numeric / 90.0), 4)
  end;
$$;

create or replace function claim_daily_bonus()
returns json language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); bal numeric; lastd date; prevday int; newday int; amt numeric;
begin
  select last_bonus_date, coalesce(streak_days, 0) into lastd, prevday from profiles where id = me;

  if lastd = current_date then
    return json_build_object('claimed', false, 'amount', 0, 'day', greatest(prevday, 1),
                             'balance', coalesce((select earner_balance from wallets where profile_id = me), 0));
  end if;

  -- consecutive day continues the streak; any gap resets to day 1; cap at 100
  if lastd = current_date - 1 then
    newday := least(100, prevday + 1);
  else
    newday := 1;
  end if;

  amt := checkin_reward(newday);
  update wallets set earner_balance = earner_balance + amt, lifetime_earned = lifetime_earned + amt
   where profile_id = me returning earner_balance into bal;
  update profiles set last_bonus_date = current_date, streak_days = newday, last_active = now()
   where id = me;
  insert into ledger_entries(profile_id, amount, type, title, balance_after)
  values (me, amt, 'welcome_bonus', 'Daily check-in · Day ' || newday, bal);
  return json_build_object('claimed', true, 'amount', amt, 'day', newday, 'balance', bal);
end; $$;
