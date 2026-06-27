-- ============================================================================
-- PicoWorker — fix money precision. Balance columns stored only 2 decimals
-- (cents), which rounded the $0.001 check-ins and $0.005 referrals. Widen to
-- 6 decimals (USDC precision). Widening keeps existing values intact.
-- ============================================================================

alter table wallets
  alter column earner_balance  type numeric(18,6),
  alter column business_escrow type numeric(18,6),
  alter column lifetime_earned type numeric(18,6);

alter table referrals   alter column earnings type numeric(18,6);
alter table withdrawals alter column amount   type numeric(18,6);

alter table ledger_entries
  alter column amount        type numeric(18,6),
  alter column balance_after type numeric(18,6);

-- Now earnings can hold sub-cent values: recompute the referral display from
-- each referred user's real completed tasks (10% of what they earned).
update referrals r set
  earnings = coalesce((select round(sum(tc.reward) * 0.10, 6) from task_completions tc
                       where tc.earner_id = r.referred_id and tc.status in ('approved','verified')), 0),
  tasks    = coalesce((select count(*) from task_completions tc
                       where tc.earner_id = r.referred_id and tc.status in ('approved','verified')), 0),
  status   = case when exists(select 1 from task_completions tc
                              where tc.earner_id = r.referred_id and tc.status in ('approved','verified'))
                  then 'active' else 'joined' end;
