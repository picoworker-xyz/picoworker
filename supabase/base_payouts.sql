-- ============================================================================
-- Move payouts from Solana to Base, and drop the withdrawal fee to $0.005.
--
-- Why: measured per-transfer cost is effectively identical on both chains
-- (~$0.0004). The difference is that USDC on Solana requires an Associated
-- Token Account per recipient, whose ~0.00204 SOL rent the treasury pays on a
-- worker's first withdrawal. That one-off is what forced the $0.20 minimum.
-- ERC-20 needs no per-recipient setup, so the floor can drop to cents.
--
-- $0.005 covers a ~$0.0004 transfer roughly 12x over, so it absorbs gas spikes
-- while still letting someone cash out $0.01.
-- ============================================================================

create or replace function start_withdrawal(
  p_profile uuid, p_amount numeric, p_address text, p_source text default 'earner'
) returns json language plpgsql security definer set search_path = public as $$
declare src text := case when p_source = 'business' then 'business' else 'earner' end;
        bal numeric; fee numeric := 0.005; wid uuid; daytot numeric; review boolean := false;
begin
  if src = 'business' then
    select greatest(0, coalesce(business_escrow, 0) - business_held(p_profile)) into bal
      from wallets where profile_id = p_profile for update;
  else
    select earner_balance into bal from wallets where profile_id = p_profile for update;
  end if;
  if bal is null then raise exception 'No wallet'; end if;

  -- Basic shape check for an EVM address. The edge function validates the
  -- EIP-55 checksum too; this stops a Solana address reaching the payout path
  -- now that every user must re-enter one for Base.
  if p_address !~ '^0x[0-9a-fA-F]{40}$' then
    raise exception 'Enter a valid Base address. It starts with 0x and is 42 characters.';
  end if;

  if p_amount <= fee then raise exception 'Amount must be more than the $0.005 fee'; end if;
  if p_amount > bal then raise exception 'Insufficient balance'; end if;

  select coalesce(sum(amount), 0) into daytot from withdrawals
   where profile_id = p_profile and status <> 'failed' and created_at >= date_trunc('day', now());
  if daytot + p_amount > 5 then review := true; end if;

  if src = 'business' then
    update wallets set business_escrow = business_escrow - p_amount where profile_id = p_profile;
  else
    update wallets set earner_balance = earner_balance - p_amount where profile_id = p_profile;
  end if;

  insert into withdrawals(profile_id, amount, asset, network, address, fee, status, source)
  values (p_profile, p_amount, 'USDC', 'Base', p_address, fee,
          case when review then 'pending_review' else 'pending' end, src)
  returning id into wid;

  insert into ledger_entries(profile_id, amount, type, title, ref_id, balance_after)
  values (p_profile, -p_amount, 'withdrawal', 'Withdraw · Base', wid::text, bal - p_amount);

  return json_build_object('id', wid, 'net', round(p_amount - fee, 6), 'review', review);
end; $$;

-- Saved Solana payout addresses cannot receive on Base, so clear them rather
-- than leave a stored address that would silently send funds nowhere. Users
-- re-enter and re-verify a Base address through the existing confirm flow.
update profiles
   set payout_wallet = null
 where payout_wallet is not null
   and payout_wallet !~ '^0x[0-9a-fA-F]{40}$';

notify pgrst, 'reload schema';
