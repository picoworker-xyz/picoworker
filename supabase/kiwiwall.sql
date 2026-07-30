-- ============================================================================
-- KiwiWall offerwall — postback storage and reward crediting.
--
-- KiwiWall gives us two amounts on every completed conversion:
--   earned_amount    what KiwiWall pays PicoWorker (USD)
--   rewarded_amount  what the wall promised the visitor, in the PLACEMENT'S
--                    VIRTUAL CURRENCY — not dollars. Their own test sends
--                    rewarded_amount 100.0000 against earned_amount 1.2500.
--
-- The receiver multiplies it by KIWIWALL_USD_PER_CREDIT before calling this, so
-- p_rewarded arrives in dollars and p_reward_units keeps the raw figure for
-- reconciliation against their reporting.
--
-- We credit the worker exactly that converted amount. The wall showed them that
-- number before they started, so paying anything less is a broken promise and
-- generates exactly the "I earned X but got Y" support load we saw on TaskWall.
-- Our margin is the difference, and that difference is what gets split across
-- referrer / team / development via distribute_platform_cut.
--
-- This means the split percentages are controlled by the placement's exchange
-- rate in the KiwiWall dashboard, not by us. Set the rate so the displayed
-- reward is ~80% of earned_amount and the usual 80/5/10/5 falls out naturally.
-- If the rate is set so we would pay out more than we earn, we still honour the
-- promise to the worker, skip the split, and log a warning.
--
-- Dedup key is KiwiWall's click_id — a real unique identifier, unlike TaskWall
-- where we had to hash user+offer+date+amount and could merge two genuine
-- conversions that happened to share an amount on the same day.
-- ============================================================================

alter table ledger_entries drop constraint if exists ledger_entries_type_check;
alter table ledger_entries add constraint ledger_entries_type_check
  check (type in ('task_reward','offer_reward','withdrawal','deposit','escrow_hold',
                  'escrow_release','referral_bonus','welcome_bonus',
                  'team_share','development_share',
                  'hold_deposit','hold_refund','hold_forfeit'));

create table if not exists kiwiwall_postbacks (
  id              uuid primary key default gen_random_uuid(),
  click_id        text not null unique,
  status          int  not null,
  player_id       uuid,
  offer_id        text,
  offer_name      text,
  category        text,
  earned_amount   numeric(14,6) not null default 0,
  rewarded_amount numeric(14,6) not null default 0,   -- converted to USD
  reward_units    numeric(14,6) not null default 0,   -- raw placement currency
  currency        text,
  credited_amount numeric(14,6) not null default 0,
  country_code    text,
  ip_address      text,
  raw_payload     jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

-- `create table if not exists` above is a no-op once the table exists, so new
-- columns must be added explicitly for the file to stay re-runnable.
alter table kiwiwall_postbacks add column if not exists reward_units numeric(14,6) not null default 0;

create index if not exists kiwiwall_postbacks_player_idx
  on kiwiwall_postbacks (player_id, created_at desc);
create index if not exists kiwiwall_postbacks_status_idx
  on kiwiwall_postbacks (status, created_at desc);

alter table kiwiwall_postbacks enable row level security;
revoke all on table kiwiwall_postbacks from public, anon, authenticated;
grant all on table kiwiwall_postbacks to service_role;

-- ---------------------------------------------------------------------------
-- Record a postback and, for a credited status, pay the worker.
--
-- Status values (KiwiWall):
--   0 blocked  1 redirected  2 pending  3 completed
--   4 reversed 5 pending→completed      6 bonus
-- Only 3, 5 and 6 move money. Everything else is stored for reconciliation so
-- the Trust panel and our own logs can be compared.
-- ---------------------------------------------------------------------------
create or replace function credit_kiwiwall_reward(
  p_click_id text,
  p_status int,
  p_player uuid,
  p_offer_id text default null,
  p_offer_name text default null,
  p_category text default null,
  p_earned numeric default 0,
  p_rewarded numeric default 0,
  p_reward_units numeric default 0,
  p_currency text default null,
  p_country text default null,
  p_ip text default null,
  p_raw jsonb default '{}'::jsonb
) returns json
language plpgsql security definer set search_path = public as $$
declare row_id uuid; net numeric; gross numeric; new_balance numeric; label text;
begin
  if p_click_id is null or btrim(p_click_id) = '' then
    raise exception 'Missing KiwiWall click_id';
  end if;

  gross := round(coalesce(p_earned, 0), 6);
  net   := round(coalesce(p_rewarded, 0), 6);
  label := coalesce(nullif(btrim(p_offer_name), ''), 'Offer completed');

  -- Only pay on statuses that represent confirmed value.
  if p_status not in (3, 5, 6) then
    net := 0;
  end if;

  insert into kiwiwall_postbacks (
    click_id, status, player_id, offer_id, offer_name, category,
    earned_amount, rewarded_amount, reward_units, currency, credited_amount,
    country_code, ip_address, raw_payload
  ) values (
    btrim(p_click_id), p_status, p_player, nullif(btrim(p_offer_id), ''),
    nullif(btrim(p_offer_name), ''), nullif(btrim(p_category), ''),
    gross, round(coalesce(p_rewarded, 0), 6), round(coalesce(p_reward_units, 0), 6),
    nullif(btrim(p_currency), ''), 0,
    nullif(btrim(p_country), ''), nullif(btrim(p_ip), ''), coalesce(p_raw, '{}'::jsonb)
  )
  on conflict (click_id) do nothing
  returning id into row_id;

  -- Same click_id twice is a provider retry, not a second conversion.
  if row_id is null then
    return json_build_object('credited', false, 'duplicate', true);
  end if;

  -- A reversal means KiwiWall clawed the money back from us. We do not yet
  -- claw it back from the worker: it is recorded here so the reversal rate can
  -- be measured before deciding whether to build that path.
  if p_status = 4 then
    raise warning 'KiwiWall reversal on click % (earned %)', p_click_id, gross;
    return json_build_object('credited', false, 'reversed', true);
  end if;

  if net <= 0 then
    return json_build_object('credited', false, 'status', p_status);
  end if;
  -- sub_id was missing or not a PicoWorker user id (their test postback sends
  -- "test_sub_1"). That is a permanent condition, so acknowledge it: making the
  -- provider retry forever would only fill their delivery log with failures.
  -- A well-formed id whose wallet is missing still raises below, because that
  -- one is transient and a retry can succeed.
  if p_player is null then
    raise warning 'KiwiWall click % has no PicoWorker user (sub_id absent or malformed)', p_click_id;
    return json_build_object('credited', false, 'reason', 'no_user');
  end if;

  update wallets
     set earner_balance = earner_balance + net,
         lifetime_earned = lifetime_earned + net
   where profile_id = p_player
   returning earner_balance into new_balance;

  if new_balance is null then
    -- Roll back the insert so a provider retry can succeed once the wallet
    -- exists, rather than being swallowed as a duplicate.
    raise exception 'KiwiWall user does not have a PicoWorker wallet';
  end if;

  update kiwiwall_postbacks set credited_amount = net where id = row_id;

  insert into ledger_entries(profile_id, amount, type, title, ref_id, balance_after)
  values (p_player, net, 'offer_reward', 'Offer · ' || label, btrim(p_click_id), new_balance);

  -- Split only what we actually earned above the worker's promised reward.
  if gross > net then
    perform distribute_platform_cut(p_player, gross, net, label, btrim(p_click_id));
  else
    raise warning 'KiwiWall click %: paid worker % but earned % — check the placement exchange rate',
      p_click_id, net, gross;
  end if;

  update profiles set last_active = now() where id = p_player;

  return json_build_object('credited', true, 'amount', net, 'balance', new_balance);
end; $$;

revoke all on function credit_kiwiwall_reward(
  text, int, uuid, text, text, text, numeric, numeric, numeric, text, text, text, jsonb
) from public, anon, authenticated;

notify pgrst, 'reload schema';
