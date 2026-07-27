-- ============================================================================
-- PicoWorker — TaskWall Offers API postbacks.
-- Run after schema.sql and precision.sql.
--
-- TaskWall authenticates each GET postback with a shared password. This SQL
-- keeps the provider event and wallet movement in one idempotent transaction.
-- ============================================================================

create table if not exists taskwall_postbacks (
  id               uuid primary key default gen_random_uuid(),
  event_key        text not null unique,
  player_id        uuid not null references profiles(id) on delete restrict,
  offer_id         text not null,
  offer_name       text,
  app_name         text,
  user_amount      numeric(18,6) not null check (user_amount > 0),
  payout           numeric(18,6) not null check (payout >= 0),
  credited_amount  numeric(18,6) not null check (credited_amount > 0),
  currency_name    text,
  provider_date    text,
  ip_address       text,
  raw_payload      jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);

create index if not exists taskwall_postbacks_player_idx
  on taskwall_postbacks (player_id, created_at desc);

alter table taskwall_postbacks enable row level security;
revoke all on table taskwall_postbacks from public, anon, authenticated;

-- Keep the ledger constraint compatible even when this file is installed
-- without the AdGem migration.
alter table ledger_entries drop constraint if exists ledger_entries_type_check;
alter table ledger_entries add constraint ledger_entries_type_check check (type in
  ('task_reward','offer_reward','withdrawal','deposit','escrow_hold','escrow_release',
   'referral_bonus','welcome_bonus'));

create or replace function credit_taskwall_reward(
  p_event_key text,
  p_player uuid,
  p_offer_id text,
  p_offer_name text,
  p_app_name text,
  p_user_amount numeric,
  p_payout numeric,
  p_credited_amount numeric,
  p_currency_name text default null,
  p_provider_date text default null,
  p_ip_address text default null,
  p_raw_payload jsonb default '{}'::jsonb
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  postback_id uuid;
  new_balance numeric;
begin
  if p_event_key is null or btrim(p_event_key) = '' then
    raise exception 'Missing TaskWall event key';
  end if;
  if p_player is null then raise exception 'Missing TaskWall user'; end if;
  if p_offer_id is null or btrim(p_offer_id) = '' then
    raise exception 'Missing TaskWall offer';
  end if;
  if p_user_amount is null or p_user_amount <= 0 then
    raise exception 'Invalid TaskWall user amount';
  end if;
  if p_payout is null or p_payout < 0 then
    raise exception 'Invalid TaskWall payout';
  end if;
  if p_credited_amount is null or p_credited_amount <= 0 then
    raise exception 'Invalid TaskWall wallet amount';
  end if;

  insert into taskwall_postbacks (
    event_key, player_id, offer_id, offer_name, app_name, user_amount, payout,
    credited_amount, currency_name, provider_date, ip_address, raw_payload
  ) values (
    btrim(p_event_key), p_player, btrim(p_offer_id), nullif(btrim(p_offer_name), ''),
    nullif(btrim(p_app_name), ''), round(p_user_amount, 6), round(p_payout, 6),
    round(p_credited_amount, 6), nullif(btrim(p_currency_name), ''),
    nullif(btrim(p_provider_date), ''), nullif(btrim(p_ip_address), ''),
    coalesce(p_raw_payload, '{}'::jsonb)
  )
  on conflict (event_key) do nothing
  returning id into postback_id;

  if postback_id is null then
    select earner_balance into new_balance from wallets where profile_id = p_player;
    return json_build_object(
      'credited', false, 'duplicate', true, 'balance', new_balance
    );
  end if;

  update wallets
     set earner_balance = earner_balance + round(p_credited_amount, 6),
         lifetime_earned = lifetime_earned + round(p_credited_amount, 6)
   where profile_id = p_player
   returning earner_balance into new_balance;

  if new_balance is null then
    -- Raising rolls back the postback insert so a provider retry can succeed
    -- after the user's wallet has been repaired.
    raise exception 'TaskWall user does not have a PicoWorker wallet';
  end if;

  insert into ledger_entries(profile_id, amount, type, title, ref_id, balance_after)
  values (
    p_player,
    round(p_credited_amount, 6),
    'offer_reward',
    'TaskWall · ' || coalesce(nullif(btrim(p_offer_name), ''), 'Offer completed'),
    btrim(p_event_key),
    new_balance
  );

  update profiles set last_active = now() where id = p_player;

  return json_build_object(
    'credited', true, 'duplicate', false,
    'amount', round(p_credited_amount, 6), 'balance', new_balance
  );
end;
$$;

revoke execute on function credit_taskwall_reward(
  text, uuid, text, text, text, numeric, numeric, numeric, text, text, text, jsonb
) from public, anon, authenticated;
grant execute on function credit_taskwall_reward(
  text, uuid, text, text, text, numeric, numeric, numeric, text, text, text, jsonb
) to service_role;

-- Provider offer catalog cache. Tracking links stored here contain a neutral
-- placeholder; taskwall-offers inserts the authenticated user's UUID only when
-- responding. Browser clients cannot read or write this table directly.
create table if not exists taskwall_offer_cache (
  country       text not null check (country ~ '^[A-Z]{2}$'),
  os            text not null check (os in ('android', 'ios', 'desktop')),
  offers        jsonb not null default '[]'::jsonb check (jsonb_typeof(offers) = 'array'),
  fetched_at    timestamptz not null default now(),
  primary key (country, os)
);

alter table taskwall_offer_cache enable row level security;
revoke all on table taskwall_offer_cache from public, anon, authenticated;
grant all on table taskwall_offer_cache to service_role;
