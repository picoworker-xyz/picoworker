-- ============================================================================
-- PicoWorker — no instant payouts. Every withdrawal is held as pending_review
-- and paid automatically 15 days after it was requested unless an admin
-- approves it earlier (admin-withdraw-approve) or rejects it (refund).
--
-- Why: provider revenue (surveys especially) can be reversed for weeks after a
-- completion and is paid to us net-30; paying workers instantly meant fronting
-- the float and eating every reversal. Run AFTER withdraw_limits.sql and
-- base_payouts.sql.
-- ============================================================================

alter table withdrawals add column if not exists auto_pay_at timestamptz;
create index if not exists withdrawals_auto_pay_idx
  on withdrawals (auto_pay_at) where status = 'pending_review';

create or replace function start_withdrawal(p_profile uuid, p_amount numeric, p_address text, p_source text default 'earner')
returns json language plpgsql security definer set search_path = public as $$
declare src text := case when p_source = 'business' then 'business' else 'earner' end;
        bal numeric; fee numeric := 0.005; wid uuid; hold interval := interval '15 days';
begin
  if src = 'business' then
    select greatest(0, coalesce(business_escrow, 0) - business_held(p_profile)) into bal
      from wallets where profile_id = p_profile for update;
  else
    select earner_balance into bal from wallets where profile_id = p_profile for update;
  end if;
  if bal is null then raise exception 'No wallet'; end if;

  if p_address !~ '^0x[0-9a-fA-F]{40}$' then
    raise exception 'Enter a valid Base address. It starts with 0x and is 42 characters.';
  end if;

  if p_amount <= fee then raise exception 'Amount must be more than the $0.005 fee'; end if;
  if p_amount > bal then raise exception 'Insufficient balance'; end if;

  if src = 'business' then
    update wallets set business_escrow = business_escrow - p_amount where profile_id = p_profile;
  else
    update wallets set earner_balance = earner_balance - p_amount where profile_id = p_profile;
  end if;

  insert into withdrawals(profile_id, amount, asset, network, address, fee, status, source, auto_pay_at)
  values (p_profile, p_amount, 'USDC', 'Base', p_address, fee, 'pending_review', src, now() + hold)
  returning id into wid;

  insert into ledger_entries(profile_id, amount, type, title, ref_id, balance_after)
  values (p_profile, -p_amount, 'withdrawal', 'Withdraw · Base', wid::text, bal - p_amount);

  return json_build_object('id', wid, 'net', round(p_amount - fee, 6), 'review', true,
                           'auto_pay_at', now() + hold);
end; $$;

-- Held withdrawals whose 15 days are up. Service role only; the withdraw-auto-pay
-- edge function pays them from the treasury and calls finish_withdrawal.
create or replace function due_withdrawals(p_limit int default 20)
returns table (id uuid, amount numeric, fee numeric, address text)
language sql security definer set search_path = public as $$
  select id, amount, fee, address
    from withdrawals
   where status = 'pending_review' and auto_pay_at is not null and auto_pay_at <= now()
   order by auto_pay_at
   limit greatest(1, least(p_limit, 50));
$$;
revoke all on function due_withdrawals(int) from public, anon, authenticated;
grant execute on function due_withdrawals(int) to service_role;

-- Admin list shows when each held withdrawal will pay itself.
create or replace function admin_withdrawals()
returns json language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  return (select coalesce(json_agg(r order by r.created_at desc), '[]'::json) from (
    select w.id, u.email, w.amount, w.source, w.address, w.status, w.signature, w.created_at, w.auto_pay_at
    from withdrawals w left join auth.users u on u.id = w.profile_id
  ) r);
end; $$;

-- Existing held withdrawals get the same 15 day clock from when they were made.
update withdrawals set auto_pay_at = created_at + interval '15 days'
 where status = 'pending_review' and auto_pay_at is null;

-- The hourly cron lives in withdraw_auto_cron.sql because it embeds the
-- internal secret; run that file by hand after replacing the placeholder.

notify pgrst, 'reload schema';
