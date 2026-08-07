-- ============================================================================
-- CPX Research surveys — postback storage and reward crediting.
--
-- CPX sends two amounts per conversion:
--   amount_usd    what CPX pays PicoWorker (USD)
--   amount_local  what the survey wall promised the user, in the app's VIRTUAL
--                 CURRENCY configured under Reward Settings in the CPX dashboard.
--
-- The receiver multiplies amount_local by CPX_USD_PER_CREDIT before calling
-- this, so p_rewarded arrives in dollars and p_reward_units keeps the raw
-- figure for reconciliation against CPX reporting.
--
-- Same contract as KiwiWall (see kiwiwall.sql): we pay the worker exactly the
-- number the wall showed them, our margin is the difference, and that margin is
-- what distribute_platform_cut splits. The split is therefore controlled by the
-- conversion rate under Reward Settings, not by us. Set that rate so the shown
-- reward is ~80% of amount_usd and the usual 80/5/10/5 falls out naturally.
--
-- Dedup key is CPX's trans_id, which is unique per conversion.
-- ============================================================================

create table if not exists cpx_postbacks (
  id              uuid primary key default gen_random_uuid(),
  trans_id        text not null unique,
  status          int  not null,
  player_id       uuid,
  offer_id        text,
  survey_id       text,
  event_type      text,                                -- CPX {type}: complete, out, bonus
  earned_amount   numeric(14,6) not null default 0,   -- amount_usd, what CPX pays us
  rewarded_amount numeric(14,6) not null default 0,   -- amount_local converted to USD
  reward_units    numeric(14,6) not null default 0,   -- raw amount_local
  credited_amount numeric(14,6) not null default 0,
  ip_click        text,
  raw_payload     jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

-- `create table if not exists` is a no-op once the table exists, so new columns
-- must be added explicitly for this file to stay re-runnable.
alter table cpx_postbacks add column if not exists survey_id text;
alter table cpx_postbacks add column if not exists event_type text;

create index if not exists cpx_postbacks_player_idx
  on cpx_postbacks (player_id, created_at desc);
create index if not exists cpx_postbacks_status_idx
  on cpx_postbacks (status, created_at desc);

alter table cpx_postbacks enable row level security;
revoke all on table cpx_postbacks from public, anon, authenticated;
grant all on table cpx_postbacks to service_role;

-- ---------------------------------------------------------------------------
-- Record a postback and, for a completed status, pay the worker.
--
-- CPX status values: 1 = complete (pay), 2 = cancelled/reversal (do not pay).
-- Everything else is stored unpaid so it can be reconciled later.
-- ---------------------------------------------------------------------------
create or replace function credit_cpx_reward(
  p_trans_id text,
  p_status int,
  p_player uuid,
  p_offer_id text default null,
  p_survey_id text default null,
  p_type text default null,
  p_earned numeric default 0,
  p_rewarded numeric default 0,
  p_reward_units numeric default 0,
  p_ip text default null,
  p_raw jsonb default '{}'::jsonb
) returns json
language plpgsql security definer set search_path = public as $$
declare row_id uuid; net numeric; gross numeric; new_balance numeric; label text;
begin
  if p_trans_id is null or btrim(p_trans_id) = '' then
    raise exception 'Missing CPX trans_id';
  end if;

  gross := round(coalesce(p_earned, 0), 6);
  net   := round(coalesce(p_rewarded, 0), 6);
  -- CPX pays a small amount for screenouts too, so `out` is a real credited
  -- event, not a failure. The label distinguishes it in the worker's ledger,
  -- because "Survey completed" on a screenout reads as a bug to them.
  label := case lower(coalesce(p_type, ''))
             when 'out'   then 'Survey screenout'
             when 'bonus' then 'Survey bonus'
             else 'Survey completed'
           end;

  -- Only status 1 represents confirmed value.
  if p_status <> 1 then
    net := 0;
  end if;

  insert into cpx_postbacks (
    trans_id, status, player_id, offer_id, survey_id, event_type,
    earned_amount, rewarded_amount, reward_units, credited_amount,
    ip_click, raw_payload
  ) values (
    btrim(p_trans_id), p_status, p_player, nullif(btrim(p_offer_id), ''),
    nullif(btrim(p_survey_id), ''), nullif(btrim(p_type), ''),
    gross, round(coalesce(p_rewarded, 0), 6), round(coalesce(p_reward_units, 0), 6), 0,
    nullif(btrim(p_ip), ''), coalesce(p_raw, '{}'::jsonb)
  )
  on conflict (trans_id) do nothing
  returning id into row_id;

  -- Same trans_id twice is a CPX retry, not a second conversion.
  if row_id is null then
    return json_build_object('credited', false, 'duplicate', true);
  end if;

  -- Status 2 is a screenout reversal or fraud cancellation: CPX takes the money
  -- back from us. We do not claw it back from the worker yet; it is recorded so
  -- the reversal rate can be measured before deciding whether to build that.
  if p_status = 2 then
    raise warning 'CPX reversal on trans % (earned %)', p_trans_id, gross;
    return json_build_object('credited', false, 'reversed', true);
  end if;

  if net <= 0 then
    return json_build_object('credited', false, 'status', p_status);
  end if;

  -- ext_user_id was missing or not a PicoWorker user id. CPX's test postback
  -- sends a placeholder, so acknowledge rather than making them retry forever.
  -- A well-formed id with a missing wallet still raises below, because that is
  -- transient and a retry can succeed.
  if p_player is null then
    raise warning 'CPX trans % has no PicoWorker user (ext_user_id absent or malformed)', p_trans_id;
    return json_build_object('credited', false, 'reason', 'no_user');
  end if;

  update wallets
     set earner_balance = earner_balance + net,
         lifetime_earned = lifetime_earned + net
   where profile_id = p_player
   returning earner_balance into new_balance;

  if new_balance is null then
    -- Roll back the insert so a CPX retry can succeed once the wallet exists,
    -- rather than being swallowed as a duplicate.
    raise exception 'CPX user does not have a PicoWorker wallet';
  end if;

  update cpx_postbacks set credited_amount = net where id = row_id;

  insert into ledger_entries(profile_id, amount, type, title, ref_id, balance_after)
  -- label already begins with "Survey", so no 'Survey · ' prefix here; the
  -- other walls prefix because their label is a raw offer name.
  values (p_player, net, 'offer_reward', label, btrim(p_trans_id), new_balance);

  -- Split only what we actually earned above the worker's promised reward.
  --
  -- Screenouts and ratings run at a bonus factor of 1.00, i.e. the whole bonus
  -- is passed to the worker on purpose (CPX's own recommendation, to keep people
  -- willing to sit through screening). There is nothing to split and nothing
  -- wrong, so those must not warn — otherwise every screenout logs a false
  -- misconfiguration alert and the real ones get lost in the noise.
  if gross > net then
    perform distribute_platform_cut(p_player, gross, net, label, btrim(p_trans_id));
  elsif lower(coalesce(p_type, '')) not in ('out', 'bonus') then
    raise warning 'CPX trans %: paid worker % but earned % — check the Reward Settings conversion rate',
      p_trans_id, net, gross;
  end if;

  update profiles set last_active = now() where id = p_player;

  return json_build_object('credited', true, 'amount', net, 'balance', new_balance);
end; $$;

revoke all on function credit_cpx_reward(
  text, int, uuid, text, text, text, numeric, numeric, numeric, text, jsonb
) from public, anon, authenticated;

notify pgrst, 'reload schema';
