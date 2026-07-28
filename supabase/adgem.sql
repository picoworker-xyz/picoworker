-- ============================================================================
-- PicoWorker — AdGem server postbacks.
-- Run after schema.sql (and precision.sql) in the Supabase SQL editor.
-- The Edge Function verifies AdGem's HMAC before calling this service-role-only
-- RPC. The RPC keeps the postback record and wallet credit in one transaction.
-- ============================================================================

create table if not exists adgem_postbacks (
  id               uuid primary key default gen_random_uuid(),
  request_id       text not null unique,
  transaction_id   text not null unique,
  player_id        uuid not null references profiles(id) on delete restrict,
  amount           numeric(18,6) not null check (amount > 0),
  payout           numeric(18,6) not null check (payout >= 0),
  campaign_id      text,
  goal_id          text,
  goal_name        text,
  offer_name       text,
  raw_payload      jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);

create index if not exists adgem_postbacks_player_idx
  on adgem_postbacks (player_id, created_at desc);

alter table adgem_postbacks enable row level security;
revoke all on table adgem_postbacks from public, anon, authenticated;

-- Keep the existing ledger constraint in sync for both existing and fresh DBs.
-- Keep in sync with revenue_split.sql and taskwall.sql; this file is re-runnable
-- and would otherwise drop the revenue-share types back out of the constraint,
-- which breaks every task payout.
alter table ledger_entries drop constraint if exists ledger_entries_type_check;
alter table ledger_entries add constraint ledger_entries_type_check check (type in
  ('task_reward','offer_reward','withdrawal','deposit','escrow_hold','escrow_release',
   'referral_bonus','welcome_bonus','team_share','development_share'));

create or replace function credit_adgem_reward(
  p_request_id text,
  p_transaction_id text,
  p_player uuid,
  p_amount numeric,
  p_payout numeric,
  p_campaign_id text default null,
  p_goal_id text default null,
  p_goal_name text default null,
  p_offer_name text default null,
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
  reward_title text;
begin
  if p_request_id is null or btrim(p_request_id) = '' then
    raise exception 'Missing AdGem request ID';
  end if;
  if p_transaction_id is null or btrim(p_transaction_id) = '' then
    raise exception 'Missing AdGem transaction ID';
  end if;
  if p_player is null then
    raise exception 'Missing player ID';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Invalid reward amount';
  end if;
  if p_payout is null or p_payout < 0 then
    raise exception 'Invalid payout amount';
  end if;

  -- Either unique ID makes a retry harmless. ON CONFLICT without a target
  -- intentionally covers both request_id and transaction_id.
  insert into adgem_postbacks (
    request_id, transaction_id, player_id, amount, payout, campaign_id,
    goal_id, goal_name, offer_name, raw_payload
  ) values (
    btrim(p_request_id), btrim(p_transaction_id), p_player, round(p_amount, 6),
    round(p_payout, 6), nullif(btrim(p_campaign_id), ''),
    nullif(btrim(p_goal_id), ''), nullif(btrim(p_goal_name), ''),
    nullif(btrim(p_offer_name), ''), coalesce(p_raw_payload, '{}'::jsonb)
  )
  on conflict do nothing
  returning id into postback_id;

  if postback_id is null then
    select earner_balance into new_balance
      from wallets where profile_id = p_player;
    return json_build_object(
      'credited', false,
      'duplicate', true,
      'balance', new_balance
    );
  end if;

  update wallets
     set earner_balance = earner_balance + round(p_amount, 6),
         lifetime_earned = lifetime_earned + round(p_amount, 6)
   where profile_id = p_player
   returning earner_balance into new_balance;

  if new_balance is null then
    -- Raising rolls back the postback insert, allowing AdGem's retry to work
    -- after the player/wallet mapping has been corrected.
    raise exception 'AdGem player does not have a PicoWorker wallet';
  end if;

  reward_title := 'AdGem · ' || coalesce(
    nullif(btrim(p_goal_name), ''),
    nullif(btrim(p_offer_name), ''),
    'Offer completed'
  );

  insert into ledger_entries(profile_id, amount, type, title, ref_id, balance_after)
  values (p_player, round(p_amount, 6), 'offer_reward', reward_title,
          btrim(p_transaction_id), new_balance);

  update profiles set last_active = now() where id = p_player;

  return json_build_object(
    'credited', true,
    'duplicate', false,
    'amount', round(p_amount, 6),
    'balance', new_balance
  );
end;
$$;

revoke execute on function credit_adgem_reward(
  text, text, uuid, numeric, numeric, text, text, text, text, jsonb
) from public, anon, authenticated;
grant execute on function credit_adgem_reward(
  text, text, uuid, numeric, numeric, text, text, text, text, jsonb
) to service_role;

