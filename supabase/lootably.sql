-- ============================================================================
-- Lootably offerwall — postback storage and reward crediting.
--
-- Lootably is a direct network, which fixes the two structural defects that
-- made the TaskWall path unreliable: the userID we send is the one their
-- tracking link carries, and device/country targeting is done from the
-- userAgentHeader and ipAddress we forward rather than being pinned to a
-- single placement type.
--
-- MONEY MODEL — deliberately different from KiwiWall.
--
-- KiwiWall told us what it had promised the visitor in placement currency, so
-- the worker's share was decided by an exchange rate in their dashboard and we
-- were hostage to it. Lootably sends `revenue` in plain USD: exactly what they
-- pay PicoWorker for the conversion. That is our gross, and we derive the
-- worker's share ourselves at the same 80% used for tasks. The 20% remainder
-- flows through distribute_platform_cut into referral / team / development,
-- identical to every other earning path on the platform.
--
-- This is why the placement's "Currency Split to User (%)" must be set to 100
-- in the Lootably dashboard. Setting it to 80 there would make Lootably do the
-- split first, so `revenue` would arrive already reduced, we would take 20% of
-- the remainder, and the worker would end up on 64% while the team and
-- referrer were paid out of nothing. The split belongs in exactly one place.
--
-- Dedup key is Lootably's transactionID, a real unique conversion id. Multistep
-- offers fire one postback per goal, each with its own transactionID, so
-- milestone payments arrive as separate credited rows rather than being
-- collapsed — the failure mode we could never get resolved on TaskWall.
-- ============================================================================

create table if not exists lootably_postbacks (
  id              uuid primary key default gen_random_uuid(),
  transaction_id  text not null unique,
  status          int  not null,                       -- 1 completion, 0 chargeback
  player_id       uuid,
  offer_id        text,
  offer_name      text,
  goal_id         text,
  goal_name       text,
  percent_complete numeric(6,2),
  revenue         numeric(14,6) not null default 0,    -- USD paid to PicoWorker
  currency_reward numeric(14,6) not null default 0,    -- raw placement currency
  credited_amount numeric(14,6) not null default 0,
  ip_address      text,
  raw_payload     jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

-- `create table if not exists` is a no-op once the table exists, so any column
-- added later must be stated explicitly to keep this file re-runnable.
alter table lootably_postbacks add column if not exists goal_name text;
alter table lootably_postbacks add column if not exists percent_complete numeric(6,2);

create index if not exists lootably_postbacks_player_idx
  on lootably_postbacks (player_id, created_at desc);
create index if not exists lootably_postbacks_status_idx
  on lootably_postbacks (status, created_at desc);

alter table lootably_postbacks enable row level security;
revoke all on table lootably_postbacks from public, anon, authenticated;
grant all on table lootably_postbacks to service_role;

-- ---------------------------------------------------------------------------
-- Offer catalogue cache, keyed the same way as the other walls so the three
-- can be compared directly. Lootably's User API does targeting for us, but we
-- still cache per country/device: the catalogue is stable for minutes at a
-- time and re-fetching on every page view would burn rate limit for nothing.
-- ---------------------------------------------------------------------------
create table if not exists lootably_offer_cache (
  country    text not null,
  device     text not null,
  offers     jsonb not null default '[]'::jsonb,
  fetched_at timestamptz not null default now(),
  primary key (country, device)
);

alter table lootably_offer_cache enable row level security;
revoke all on table lootably_offer_cache from public, anon, authenticated;
grant all on table lootably_offer_cache to service_role;

-- ---------------------------------------------------------------------------
-- Record a postback and, on a completion, pay the worker.
--
-- status 1 = completion, 0 = chargeback. Lootably currently only sends 1, but
-- 0 is stored so the reversal rate can be measured before deciding whether to
-- claw back from a worker who may already have withdrawn.
-- ---------------------------------------------------------------------------
create or replace function credit_lootably_reward(
  p_transaction_id text,
  p_status int,
  p_player uuid,
  p_offer_id text default null,
  p_offer_name text default null,
  p_goal_id text default null,
  p_goal_name text default null,
  p_percent numeric default null,
  p_revenue numeric default 0,
  p_currency_reward numeric default 0,
  p_ip text default null,
  p_raw jsonb default '{}'::jsonb
) returns json
language plpgsql security definer set search_path = public as $$
declare
  row_id uuid; gross numeric; net numeric; new_balance numeric; label text;
  -- Matches complete_task and the rest of the platform. Change all together.
  worker_share constant numeric := 0.80;
begin
  if p_transaction_id is null or btrim(p_transaction_id) = '' then
    raise exception 'Missing Lootably transactionID';
  end if;

  gross := round(coalesce(p_revenue, 0), 6);
  net   := round(gross * worker_share, 6);
  label := coalesce(
    nullif(btrim(p_goal_name), ''),
    nullif(btrim(p_offer_name), ''),
    'Offer completed'
  );

  if p_status <> 1 then
    net := 0;
  end if;

  insert into lootably_postbacks (
    transaction_id, status, player_id, offer_id, offer_name, goal_id, goal_name,
    percent_complete, revenue, currency_reward, credited_amount, ip_address, raw_payload
  ) values (
    btrim(p_transaction_id), p_status, p_player, nullif(btrim(p_offer_id), ''),
    nullif(btrim(p_offer_name), ''), nullif(btrim(p_goal_id), ''), nullif(btrim(p_goal_name), ''),
    p_percent, gross, round(coalesce(p_currency_reward, 0), 6), 0,
    nullif(btrim(p_ip), ''), coalesce(p_raw, '{}'::jsonb)
  )
  on conflict (transaction_id) do nothing
  returning id into row_id;

  -- Same transactionID twice is a provider retry, not a second conversion.
  if row_id is null then
    return json_build_object('credited', false, 'duplicate', true);
  end if;

  if p_status = 0 then
    raise warning 'Lootably chargeback on transaction % (revenue %)', p_transaction_id, gross;
    return json_build_object('credited', false, 'reversed', true);
  end if;

  if net <= 0 then
    return json_build_object('credited', false, 'status', p_status);
  end if;

  -- userID absent or not a PicoWorker uuid. Their test postback sends a literal
  -- placeholder, and that is a permanent condition, so acknowledge rather than
  -- fail: forcing retries would only fill their delivery log. A well-formed id
  -- with no wallet still raises below, because a retry there can succeed.
  if p_player is null then
    raise warning 'Lootably transaction % has no PicoWorker user (userID absent or malformed)', p_transaction_id;
    return json_build_object('credited', false, 'reason', 'no_user');
  end if;

  update wallets
     set earner_balance  = earner_balance + net,
         lifetime_earned = lifetime_earned + net
   where profile_id = p_player
   returning earner_balance into new_balance;

  if new_balance is null then
    -- Roll back the insert so a provider retry can succeed once the wallet
    -- exists, rather than being swallowed as a duplicate.
    raise exception 'Lootably user does not have a PicoWorker wallet';
  end if;

  update lootably_postbacks set credited_amount = net where id = row_id;

  insert into ledger_entries(profile_id, amount, type, title, ref_id, balance_after)
  values (p_player, net, 'offer_reward', 'Offer · ' || label, btrim(p_transaction_id), new_balance);

  perform distribute_platform_cut(p_player, gross, net, label, btrim(p_transaction_id));

  update profiles set last_active = now() where id = p_player;

  return json_build_object('credited', true, 'amount', net, 'balance', new_balance);
end; $$;

revoke all on function credit_lootably_reward(
  text, int, uuid, text, text, text, text, numeric, numeric, numeric, text, jsonb
) from public, anon, authenticated;

notify pgrst, 'reload schema';
