-- ============================================================================
-- PicoWorker — provider chargebacks are clawed back from everyone who was paid.
--
-- Every credit written for a conversion (worker offer_reward, referrer 5%,
-- team and development shares) carries the provider transaction id in
-- ledger_entries.ref_id. A reversal walks those rows and writes a matching
-- negative 'reversal' entry per recipient, debiting their wallet. Balances may
-- go negative: the 15 day withdrawal hold means the money is usually still
-- there, and when it is not the next earnings fill the hole before the worker
-- can withdraw again. Run AFTER revenue_split.sql, cpx.sql and ayet.sql.
-- ============================================================================

alter table ledger_entries drop constraint if exists ledger_entries_type_check;
alter table ledger_entries add constraint ledger_entries_type_check check (type in
  ('task_reward','offer_reward','withdrawal','deposit','escrow_hold','escrow_release',
   'referral_bonus','welcome_bonus','team_share','development_share',
   'hold_deposit','hold_refund','hold_forfeit','reversal'));

-- Unwinds every credit for p_ref_id. Idempotent: a second call finds the
-- reversal rows already present and does nothing. Returns the total clawed back.
create or replace function reverse_conversion(p_ref_id text, p_reason text default 'Provider reversed this completion')
returns numeric language plpgsql security definer set search_path = public as $$
declare r record; total numeric := 0; new_bal numeric; ref text := btrim(coalesce(p_ref_id, ''));
begin
  if ref = '' then return 0; end if;
  if exists (select 1 from ledger_entries where ref_id = ref and type = 'reversal') then
    return 0;
  end if;

  for r in
    select profile_id, amount, type, title
      from ledger_entries
     where ref_id = ref
       and type in ('offer_reward', 'referral_bonus', 'team_share', 'development_share')
       and amount > 0
  loop
    update wallets
       set earner_balance = earner_balance - r.amount,
           lifetime_earned = greatest(0, lifetime_earned - r.amount)
     where profile_id = r.profile_id
    returning earner_balance into new_bal;
    if new_bal is null then continue; end if;

    insert into ledger_entries(profile_id, amount, type, title, ref_id, balance_after)
    values (r.profile_id, -r.amount, 'reversal', 'Reversed · ' || r.title, ref, new_bal);

    if r.type = 'referral_bonus' then
      update referrals set earnings = greatest(0, earnings - r.amount)
       where referrer_id = r.profile_id
         and referred_id = (select profile_id from ledger_entries
                             where ref_id = ref and type = 'offer_reward' limit 1);
    end if;

    total := total + r.amount;
  end loop;

  if total > 0 then
    raise notice 'reversed % for ref % (%)', total, ref, p_reason;
  end if;
  return total;
end; $$;
revoke all on function reverse_conversion(text, text) from public, anon, authenticated;
grant execute on function reverse_conversion(text, text) to service_role;

notify pgrst, 'reload schema';
