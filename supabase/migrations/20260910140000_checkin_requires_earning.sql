-- ============================================================================
-- Daily check-in now requires the worker to have earned something.
--
-- claim_daily_bonus() had no activity requirement, so any registration could
-- claim every day forever. A full 100 day streak pays $5.00, which made a farm
-- of accounts a pure, predictable loss with no work done in return.
--
-- The rule: a claim needs at least one credited earning since the previous
-- claim. Every partner wall credits 'offer_reward' (CPAlead, Notik, Lootably,
-- KiwiWall, AdGem, CPX, Paymentwall, TaskWall) and every on-site task credits
-- 'task_reward', so those two types cover Offers, Surveys, Bonus, Featured and
-- ordinary tasks without naming any provider here.
--
-- Deliberately NOT counted:
--   * 'welcome_bonus', which is what check-in itself writes. Counting it would
--     let each claim fund the next one, which is the loop being closed.
--   * 'referral_bonus', which costs money without the worker producing
--     anything, so a ring of accounts referring each other would stay eligible.
--   * negative amounts, so a reversal cannot be used as an activity ticket.
--
-- The boundary is a timestamp, not last_bonus_date. A date resolves to midnight,
-- which would count earnings made BEFORE the previous claim on the same day and
-- hand out a free extra claim.
-- ============================================================================

alter table profiles add column if not exists last_bonus_at timestamptz;

-- Backfill so the gate is not retroactively unfair to existing workers: prefer
-- the real timestamp of their last check-in ledger line, and fall back to
-- midnight of last_bonus_date where no line survives.
update profiles p
   set last_bonus_at = coalesce(
     (select max(l.created_at)
        from ledger_entries l
       where l.profile_id = p.id
         and l.type = 'welcome_bonus'
         and l.title like 'Daily check-in%'),
     p.last_bonus_date::timestamptz
   )
 where p.last_bonus_date is not null
   and p.last_bonus_at is null;

create or replace function claim_daily_bonus()
returns json language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  bal numeric; lastd date; last_at timestamptz; prevday int; newday int; amt numeric;
begin
  select last_bonus_date, last_bonus_at, coalesce(streak_days, 0)
    into lastd, last_at, prevday
    from profiles where id = me;

  if lastd = current_date then
    return json_build_object('claimed', false, 'reason', 'already_claimed',
                             'amount', 0, 'day', greatest(prevday, 1),
                             'balance', coalesce((select earner_balance from wallets where profile_id = me), 0));
  end if;

  -- The gate. Anything credited from a partner wall or an on-site task since
  -- the last claim qualifies, at any amount.
  if not exists (
    select 1 from ledger_entries l
     where l.profile_id = me
       and l.type in ('task_reward', 'offer_reward')
       and l.amount > 0
       and l.created_at > coalesce(last_at, '-infinity'::timestamptz)
  ) then
    return json_build_object('claimed', false, 'reason', 'needs_earning',
                             'amount', 0, 'day', greatest(prevday, 1),
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
  update profiles set last_bonus_date = current_date, last_bonus_at = now(), streak_days = newday, last_active = now()
   where id = me;
  insert into ledger_entries(profile_id, amount, type, title, balance_after)
  values (me, amt, 'welcome_bonus', 'Daily check-in · Day ' || newday, bal);
  return json_build_object('claimed', true, 'amount', amt, 'day', newday, 'balance', bal);
end; $$;

-- The gate reads the caller's own ledger inside a security definer function, so
-- the index that already serves (profile_id, created_at desc) covers it.

notify pgrst, 'reload schema';
