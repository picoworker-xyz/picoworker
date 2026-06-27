-- ============================================================================
-- PicoWorker — withdrawal daily limit + admin approval, and shared-address
-- fraud signal. Run AFTER withdraw.sql / admin_json.sql / moderation.sql.
--
-- Up to $5 per UTC day pays out instantly. Anything that pushes the day over
-- $5 is held as 'pending_review' for an admin to approve (or reject = refund).
-- ============================================================================

create or replace function start_withdrawal(p_profile uuid, p_amount numeric, p_address text, p_source text default 'earner')
returns json language plpgsql security definer set search_path = public as $$
declare src text := case when p_source = 'business' then 'business' else 'earner' end;
        bal numeric; fee numeric := 0.20; wid uuid; daytot numeric; review boolean := false;
begin
  if src = 'business' then
    select business_escrow into bal from wallets where profile_id = p_profile for update;
  else
    select earner_balance into bal from wallets where profile_id = p_profile for update;
  end if;
  if bal is null then raise exception 'No wallet'; end if;
  if p_amount <= fee then raise exception 'Amount must be more than the $0.20 fee'; end if;
  if p_amount > bal then raise exception 'Insufficient balance'; end if;

  -- $5 / day pays instantly; above that needs admin approval
  select coalesce(sum(amount), 0) into daytot from withdrawals
   where profile_id = p_profile and status <> 'failed' and created_at >= date_trunc('day', now());
  if daytot + p_amount > 5 then review := true; end if;

  if src = 'business' then
    update wallets set business_escrow = business_escrow - p_amount where profile_id = p_profile;
  else
    update wallets set earner_balance = earner_balance - p_amount where profile_id = p_profile;
  end if;
  insert into withdrawals(profile_id, amount, asset, network, address, fee, status, source)
  values (p_profile, p_amount, 'USDC', 'Solana', p_address, fee,
          case when review then 'pending_review' else 'pending' end, src)
  returning id into wid;
  insert into ledger_entries(profile_id, amount, type, title, ref_id, balance_after)
  values (p_profile, -p_amount, 'withdrawal', 'Withdraw · Solana', wid::text, bal - p_amount);
  return json_build_object('id', wid, 'net', round(p_amount - fee, 6), 'review', review);
end; $$;

-- finish_withdrawal now also accepts the pending_review state (admin-approved).
create or replace function finish_withdrawal(p_id uuid, p_sig text, p_ok boolean)
returns void language plpgsql security definer set search_path = public as $$
declare w withdrawals; newbal numeric;
begin
  select * into w from withdrawals where id = p_id for update;
  if w.id is null or w.status not in ('pending', 'pending_review') then return; end if;
  if p_ok then
    update withdrawals set status = 'sent', signature = p_sig where id = p_id;
  else
    update withdrawals set status = 'failed', signature = p_sig where id = p_id;
    if w.source = 'business' then
      update wallets set business_escrow = business_escrow + w.amount where profile_id = w.profile_id returning business_escrow into newbal;
    else
      update wallets set earner_balance = earner_balance + w.amount where profile_id = w.profile_id returning earner_balance into newbal;
    end if;
    insert into ledger_entries(profile_id, amount, type, title, ref_id, balance_after)
    values (w.profile_id, w.amount, 'deposit', 'Withdrawal refunded', p_id::text, newbal);
  end if;
end; $$;
revoke execute on function finish_withdrawal(uuid, text, boolean) from anon, authenticated;

-- Admin: reject a held withdrawal (refunds the balance). Approval/payout is done
-- by the admin-withdraw-approve Edge Function (it needs the treasury key).
create or replace function admin_reject_withdrawal(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  perform finish_withdrawal(p_id, null, false);
end; $$;

-- Withdrawals list now includes id + source so the dashboard can act on them.
create or replace function admin_withdrawals()
returns json language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  return (select coalesce(json_agg(r order by r.created_at desc), '[]'::json) from (
    select w.id, u.email, w.amount, w.source, w.address, w.status, w.signature, w.created_at
    from withdrawals w left join auth.users u on u.id = w.profile_id
  ) r);
end; $$;

-- Fraud now also flags one withdrawal address used by multiple accounts.
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
    union all
    select 'withdraw address', w.address, count(distinct w.profile_id), string_agg(distinct u.email, ', ')
    from withdrawals w left join auth.users u on u.id = w.profile_id
    where w.address is not null group by w.address having count(distinct w.profile_id) > 1
  ) r);
end; $$;

notify pgrst, 'reload schema';
