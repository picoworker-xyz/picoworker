-- ============================================================================
-- PicoWorker — ayet-studios offerwall (placement 24848, "Offerwall API").
--
-- Ayet pays in USD (payout_usd) and reports the wall's virtual currency in
-- currency_amount at 1000 coins = $1 (placement setting). The worker is
-- credited at AYET_USD_PER_COIN (0.0008 = 80% share) by the edge function; the
-- gross (payout_usd) is what ayet pays us. Chargebacks arrive as a second
-- callback for the same transaction_id with is_chargeback=1: recorded against
-- the original row and clawed back from everyone paid (reversals.sql).
-- Run AFTER revenue_split.sql (distribute_platform_cut).
-- ============================================================================

create table if not exists ayet_postbacks (
  id               uuid primary key default gen_random_uuid(),
  transaction_id   text not null unique,
  player_id        uuid,
  offer_id         text,
  offer_name       text,
  payout_usd       numeric(14,6) not null default 0,   -- what ayet pays us
  currency_amount  numeric(14,6) not null default 0,   -- raw coins
  rewarded_amount  numeric(14,6) not null default 0,   -- coins converted to USD
  credited_amount  numeric(14,6) not null default 0,
  chargeback       boolean not null default false,
  reversed_at      timestamptz,
  sandbox          boolean not null default false,
  ip_address       text,
  raw_payload      jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);

create index if not exists ayet_postbacks_player_idx
  on ayet_postbacks (player_id, created_at desc);

alter table ayet_postbacks enable row level security;
revoke all on table ayet_postbacks from public, anon, authenticated;
grant all on table ayet_postbacks to service_role;

create or replace function credit_ayet_reward(
  p_transaction_id text,
  p_player uuid,
  p_offer_id text default null,
  p_offer_name text default null,
  p_payout_usd numeric default 0,
  p_currency_amount numeric default 0,
  p_rewarded numeric default 0,
  p_chargeback boolean default false,
  p_sandbox boolean default false,
  p_ip text default null,
  p_raw jsonb default '{}'::jsonb
) returns json
language plpgsql security definer set search_path = public as $$
declare row_id uuid; net numeric; gross numeric; new_balance numeric; label text;
begin
  if p_transaction_id is null or btrim(p_transaction_id) = '' then
    raise exception 'Missing ayet transaction_id';
  end if;

  gross := round(coalesce(p_payout_usd, 0), 6);
  net   := round(coalesce(p_rewarded, 0), 6);
  label := 'Offer · ' || coalesce(nullif(btrim(p_offer_name), ''), 'ayet');

  -- Chargeback: same transaction_id as the original credit, so it must be
  -- handled before the insert below whose conflict would swallow it.
  if p_chargeback then
    update ayet_postbacks
       set chargeback = true,
           reversed_at = now(),
           raw_payload = raw_payload || jsonb_build_object('chargeback', coalesce(p_raw, '{}'::jsonb))
     where transaction_id = btrim(p_transaction_id)
    returning id into row_id;
    if row_id is null then
      insert into ayet_postbacks (
        transaction_id, player_id, offer_id, offer_name, payout_usd, currency_amount,
        rewarded_amount, credited_amount, chargeback, reversed_at, sandbox, ip_address, raw_payload
      ) values (
        btrim(p_transaction_id), p_player, nullif(btrim(p_offer_id), ''), nullif(btrim(p_offer_name), ''),
        gross, round(coalesce(p_currency_amount, 0), 6), net, 0, true, now(), p_sandbox,
        nullif(btrim(p_ip), ''), coalesce(p_raw, '{}'::jsonb)
      ) on conflict (transaction_id) do nothing;
    end if;
    net := reverse_conversion(btrim(p_transaction_id), 'ayet chargeback');
    raise warning 'ayet chargeback on transaction % (payout %, clawed back %)', p_transaction_id, gross, net;
    return json_build_object('credited', false, 'reversed', true, 'clawed_back', net);
  end if;

  insert into ayet_postbacks (
    transaction_id, player_id, offer_id, offer_name, payout_usd, currency_amount,
    rewarded_amount, credited_amount, sandbox, ip_address, raw_payload
  ) values (
    btrim(p_transaction_id), p_player, nullif(btrim(p_offer_id), ''), nullif(btrim(p_offer_name), ''),
    gross, round(coalesce(p_currency_amount, 0), 6), net, 0, p_sandbox,
    nullif(btrim(p_ip), ''), coalesce(p_raw, '{}'::jsonb)
  )
  on conflict (transaction_id) do nothing
  returning id into row_id;

  if row_id is null then
    return json_build_object('credited', false, 'duplicate', true);
  end if;

  -- Sandbox and test callbacks are recorded for the integration check but
  -- never credited: their payouts are fake.
  if p_sandbox then
    return json_build_object('credited', false, 'sandbox', true);
  end if;

  if net <= 0 then
    return json_build_object('credited', false, 'reason', 'zero');
  end if;

  if p_player is null then
    raise warning 'ayet transaction % has no PicoWorker user (uid absent or malformed)', p_transaction_id;
    return json_build_object('credited', false, 'reason', 'no_user');
  end if;

  update wallets
     set earner_balance = earner_balance + net,
         lifetime_earned = lifetime_earned + net
   where profile_id = p_player
   returning earner_balance into new_balance;

  if new_balance is null then
    raise exception 'ayet user does not have a PicoWorker wallet';
  end if;

  update ayet_postbacks set credited_amount = net where id = row_id;

  insert into ledger_entries(profile_id, amount, type, title, ref_id, balance_after)
  values (p_player, net, 'offer_reward', label, btrim(p_transaction_id), new_balance);

  if gross > net then
    perform distribute_platform_cut(p_player, gross, net, label, btrim(p_transaction_id));
  else
    raise warning 'ayet transaction %: paid worker % but earned % — check AYET_USD_PER_COIN',
      p_transaction_id, net, gross;
  end if;

  update profiles set last_active = now() where id = p_player;

  return json_build_object('credited', true, 'amount', net, 'balance', new_balance);
end; $$;

revoke all on function credit_ayet_reward(
  text, uuid, text, text, numeric, numeric, numeric, boolean, boolean, text, jsonb
) from public, anon, authenticated;
grant execute on function credit_ayet_reward(
  text, uuid, text, text, numeric, numeric, numeric, boolean, boolean, text, jsonb
) to service_role;

notify pgrst, 'reload schema';
