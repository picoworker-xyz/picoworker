-- ============================================================================
-- PicoWorker — Paymentwall Virtual Currency / Offerwall pingbacks.
-- Run after schema.sql, precision.sql, and adgem.sql.
--
-- Every signed pingback is stored once. Live type 0/1 events credit the wallet;
-- type 2 events reverse the exact original credit. Test events are recorded for
-- Paymentwall review but never create withdrawable PicoWorker balance.
-- ============================================================================

create table if not exists paymentwall_transactions (
  ref              text primary key,
  player_id        uuid not null references profiles(id) on delete restrict,
  currency_units   bigint not null check (currency_units > 0),
  amount           numeric(18,6) not null check (amount > 0),
  status           text not null default 'credited'
                     check (status in ('credited','reversed')),
  raw_payload      jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  reversed_at      timestamptz,
  reversal_reason  text
);

create index if not exists paymentwall_transactions_player_idx
  on paymentwall_transactions (player_id, created_at desc);

create table if not exists paymentwall_events (
  id               uuid primary key default gen_random_uuid(),
  ref              text not null,
  event_type       int not null check (event_type in (0,1,2)),
  player_id        uuid not null references profiles(id) on delete restrict,
  currency_units   bigint not null check (currency_units > 0),
  amount           numeric(18,6) not null check (amount > 0),
  is_test          boolean not null default false,
  reason           text,
  raw_payload      jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  unique (ref, event_type)
);

create index if not exists paymentwall_events_player_idx
  on paymentwall_events (player_id, created_at desc);

alter table paymentwall_transactions enable row level security;
alter table paymentwall_events enable row level security;
revoke all on table paymentwall_transactions from public, anon, authenticated;
revoke all on table paymentwall_events from public, anon, authenticated;

create or replace function process_paymentwall_pingback(
  p_ref text,
  p_player uuid,
  p_currency_units bigint,
  p_amount numeric,
  p_type int,
  p_is_test boolean default false,
  p_reason text default null,
  p_raw_payload jsonb default '{}'::jsonb
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  event_id uuid;
  inserted_ref text;
  tx paymentwall_transactions%rowtype;
  new_balance numeric;
begin
  if p_ref is null or btrim(p_ref) = '' or length(p_ref) > 200 then
    raise exception 'Invalid Paymentwall reference';
  end if;
  if p_player is null then raise exception 'Missing Paymentwall user'; end if;
  if p_currency_units is null or p_currency_units <= 0 then
    raise exception 'Invalid Paymentwall currency amount';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Invalid Paymentwall wallet amount';
  end if;
  if p_type not in (0,1,2) then
    raise exception 'Unsupported Paymentwall pingback type';
  end if;

  insert into paymentwall_events (
    ref, event_type, player_id, currency_units, amount, is_test, reason, raw_payload
  ) values (
    btrim(p_ref), p_type, p_player, p_currency_units, round(p_amount, 6),
    coalesce(p_is_test, false), nullif(btrim(p_reason), ''),
    coalesce(p_raw_payload, '{}'::jsonb)
  )
  on conflict (ref, event_type) do nothing
  returning id into event_id;

  if event_id is null then
    return json_build_object('processed', false, 'duplicate', true);
  end if;

  -- Sandbox completions prove the integration without minting withdrawable USDC.
  if coalesce(p_is_test, false) then
    return json_build_object(
      'processed', true, 'duplicate', false, 'test', true, 'credited', false
    );
  end if;

  if p_type in (0,1) then
    insert into paymentwall_transactions (
      ref, player_id, currency_units, amount, raw_payload
    ) values (
      btrim(p_ref), p_player, p_currency_units, round(p_amount, 6),
      coalesce(p_raw_payload, '{}'::jsonb)
    )
    on conflict (ref) do nothing
    returning ref into inserted_ref;

    if inserted_ref is null then
      return json_build_object('processed', false, 'duplicate', true);
    end if;

    update wallets
       set earner_balance = earner_balance + round(p_amount, 6),
           lifetime_earned = lifetime_earned + round(p_amount, 6)
     where profile_id = p_player
     returning earner_balance into new_balance;

    if new_balance is null then
      raise exception 'Paymentwall user does not have a PicoWorker wallet';
    end if;

    insert into ledger_entries(profile_id, amount, type, title, ref_id, balance_after)
    values (
      p_player, round(p_amount, 6), 'offer_reward', 'Paymentwall · Offer completed',
      btrim(p_ref), new_balance
    );
    update profiles set last_active = now() where id = p_player;

    return json_build_object(
      'processed', true, 'duplicate', false, 'credited', true,
      'amount', round(p_amount, 6), 'balance', new_balance
    );
  end if;

  -- type=2: reverse only a real credit that is still active. The original
  -- stored amount is authoritative even if dashboard conversion settings later
  -- change. A negative balance preserves chargeback liability.
  select * into tx
    from paymentwall_transactions
   where ref = btrim(p_ref)
   for update;

  if tx.ref is null then
    return json_build_object(
      'processed', true, 'duplicate', false, 'reversed', false, 'matched', false
    );
  end if;
  if tx.status = 'reversed' then
    return json_build_object('processed', false, 'duplicate', true, 'reversed', false);
  end if;

  update paymentwall_transactions
     set status = 'reversed',
         reversed_at = now(),
         reversal_reason = nullif(btrim(p_reason), '')
   where ref = tx.ref;

  update wallets
     set earner_balance = earner_balance - tx.amount,
         lifetime_earned = greatest(0, lifetime_earned - tx.amount)
   where profile_id = tx.player_id
   returning earner_balance into new_balance;

  if new_balance is null then
    raise exception 'Paymentwall user does not have a PicoWorker wallet';
  end if;

  insert into ledger_entries(profile_id, amount, type, title, ref_id, balance_after)
  values (
    tx.player_id, -tx.amount, 'offer_reward', 'Paymentwall · Reward reversed',
    tx.ref, new_balance
  );

  return json_build_object(
    'processed', true, 'duplicate', false, 'reversed', true,
    'amount', tx.amount, 'balance', new_balance
  );
end;
$$;

revoke execute on function process_paymentwall_pingback(
  text, uuid, bigint, numeric, int, boolean, text, jsonb
) from public, anon, authenticated;
grant execute on function process_paymentwall_pingback(
  text, uuid, bigint, numeric, int, boolean, text, jsonb
) to service_role;

