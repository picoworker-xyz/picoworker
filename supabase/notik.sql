-- ============================================================================
-- Notik offerwall — offer catalogue, click tracking, postbacks and crediting.
--
-- Notik's All Offers API is unfiltered: it returns the ENTIRE catalogue,
-- paginated at 1000 offers per page, and expects the publisher to store it and
-- do the country / device / os filtering themselves. It is also rate limited to
-- 30 pulls per 15 minutes for the whole app, so it cannot be called per user.
--
-- We therefore keep the catalogue as real rows rather than one jsonb blob:
--   * filtering happens in SQL, so a large catalogue stays cheap to serve
--   * "hide offers the user already completed" (which Notik requires for its
--     new-users-only offers, and which is unrewarded traffic otherwise) is a
--     single anti-join instead of a client-side scan
--
-- Money model. Notik sends two amounts on every conversion:
--   payout  what Notik pays PicoWorker, in USD
--   amount  what the wall promised the visitor, in the app's virtual currency
--           ("coins"), at the app's payout ratio (100 coins per USD of payout)
--
-- The receiver converts coins to dollars with NOTIK_USD_PER_COIN before calling
-- in here, so p_rewarded arrives in dollars and p_reward_units keeps the raw
-- coin figure for reconciliation against Notik's reporting. The offer cards are
-- priced with the same conversion, so what the worker saw is what they get.
-- Our margin is payout minus that, split by distribute_platform_cut.
-- ============================================================================

alter table ledger_entries drop constraint if exists ledger_entries_type_check;
alter table ledger_entries add constraint ledger_entries_type_check
  check (type in ('task_reward','offer_reward','withdrawal','deposit','escrow_hold',
                  'escrow_release','referral_bonus','welcome_bonus',
                  'team_share','development_share',
                  'hold_deposit','hold_refund','hold_forfeit'));

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------
create table if not exists notik_offers (
  offer_id      text primary key,
  name          text not null,
  image_url     text,
  click_url     text not null,
  categories    text[] not null default '{}',
  country_codes text[] not null default '{}',
  devices       text[] not null default '{}',
  platforms     text[] not null default '{}',
  os            text[] not null default '{}',
  description1  text,
  description2  text,
  description3  text,
  payout        numeric(14,6) not null default 0,
  events        jsonb not null default '[]'::jsonb,
  synced_at     timestamptz not null default now()
);

-- The three filters every request applies. GIN on the arrays turns the
-- containment checks into index scans instead of a full catalogue sweep.
create index if not exists notik_offers_country_idx on notik_offers using gin (country_codes);
create index if not exists notik_offers_devices_idx on notik_offers using gin (devices);
create index if not exists notik_offers_os_idx      on notik_offers using gin (os);
create index if not exists notik_offers_payout_idx  on notik_offers (payout desc);

alter table notik_offers enable row level security;
revoke all on table notik_offers from public, anon, authenticated;
grant all on table notik_offers to service_role;

-- Single-row bookkeeping for the 15-minute pull cadence. `syncing_at` is the
-- lock: two concurrent visitors must not both burn the rate limit pulling the
-- same catalogue, so whoever claims the row does the work and everyone else
-- serves what is already stored.
create table if not exists notik_sync (
  id         boolean primary key default true check (id),
  synced_at  timestamptz,
  syncing_at timestamptz,
  offers     int not null default 0,
  error      text
);
insert into notik_sync (id) values (true) on conflict (id) do nothing;

alter table notik_sync enable row level security;
revoke all on table notik_sync from public, anon, authenticated;
grant all on table notik_sync to service_role;

-- ---------------------------------------------------------------------------
-- Claim the catalogue refresh. Returns true only for the caller that won it.
--
-- A crashed sync would otherwise hold the lock forever, so a claim older than
-- p_stale_minutes is treated as abandoned and can be taken over.
-- ---------------------------------------------------------------------------
create or replace function claim_notik_sync(
  p_max_age_minutes int default 15,
  p_stale_minutes int default 10
) returns boolean
language plpgsql security definer set search_path = public as $$
declare claimed boolean;
begin
  update notik_sync
     set syncing_at = now()
   where id
     and (synced_at is null or synced_at < now() - make_interval(mins => p_max_age_minutes))
     and (syncing_at is null or syncing_at < now() - make_interval(mins => p_stale_minutes))
  returning true into claimed;

  return coalesce(claimed, false);
end; $$;

-- ---------------------------------------------------------------------------
-- Write one pulled page into the catalogue.
--
-- The live catalogue is ~5000 offers across 6 pages and roughly 11 MB of JSON,
-- so it is written a page at a time: buffering the whole thing and sending it
-- as one statement would put the edge function's memory and the request body
-- limit on the critical path of every refresh.
--
-- Upsert then delete-by-timestamp (in finish_notik_sync) rather than
-- truncate-then-insert: the table stays readable throughout, so a visitor
-- arriving mid-refresh sees the old catalogue instead of an empty page.
-- `p_started` is the caller's sync stamp, shared by every page of one run —
-- it is what marks a row as belonging to this refresh.
-- ---------------------------------------------------------------------------
create or replace function replace_notik_offers(p_offers jsonb, p_started timestamptz)
returns int
language plpgsql security definer set search_path = public as $$
declare started timestamptz := coalesce(p_started, now()); written int;
begin
  insert into notik_offers (
    offer_id, name, image_url, click_url, categories, country_codes,
    devices, platforms, os, description1, description2, description3,
    payout, events, synced_at
  )
  select
    o->>'offer_id',
    o->>'name',
    nullif(o->>'image_url', ''),
    o->>'click_url',
    coalesce(array(select jsonb_array_elements_text(o->'categories')), '{}'),
    coalesce(array(select upper(jsonb_array_elements_text(o->'country_code'))), '{}'),
    coalesce(array(select lower(jsonb_array_elements_text(o->'devices'))), '{}'),
    coalesce(array(select lower(jsonb_array_elements_text(o->'platforms'))), '{}'),
    coalesce(array(select lower(jsonb_array_elements_text(o->'os'))), '{}'),
    nullif(o->>'description1', ''),
    nullif(o->>'description2', ''),
    nullif(o->>'description3', ''),
    coalesce((o->>'payout')::numeric, 0),
    coalesce(o->'events', '[]'::jsonb),
    started
  from jsonb_array_elements(coalesce(p_offers, '[]'::jsonb)) as o
  where coalesce(o->>'offer_id', '') <> ''
    and coalesce(o->>'name', '') <> ''
    and coalesce(o->>'click_url', '') <> ''
  on conflict (offer_id) do update set
    name          = excluded.name,
    image_url     = excluded.image_url,
    click_url     = excluded.click_url,
    categories    = excluded.categories,
    country_codes = excluded.country_codes,
    devices       = excluded.devices,
    platforms     = excluded.platforms,
    os            = excluded.os,
    description1  = excluded.description1,
    description2  = excluded.description2,
    description3  = excluded.description3,
    payout        = excluded.payout,
    events        = excluded.events,
    synced_at     = excluded.synced_at;

  get diagnostics written = row_count;
  return written;
end; $$;

-- ---------------------------------------------------------------------------
-- Close a sync: drop everything the run did not touch and release the lock.
--
-- Anything the pull did not mention is disabled or expired, and Notik does not
-- reward traffic sent to those, so it must not survive a refresh.
-- ---------------------------------------------------------------------------
create or replace function finish_notik_sync(p_started timestamptz)
returns int
language plpgsql security definer set search_path = public as $$
declare kept int;
begin
  delete from notik_offers where synced_at < p_started;
  select count(*) into kept from notik_offers;

  update notik_sync
     set synced_at = now(), syncing_at = null, offers = kept, error = null
   where id;

  return kept;
end; $$;

-- Release the lock without marking a successful sync, so the next visitor
-- retries instead of waiting out the full 15 minutes on a failed pull.
create or replace function fail_notik_sync(p_error text)
returns void
language sql security definer set search_path = public as $$
  update notik_sync set syncing_at = null, error = left(coalesce(p_error, ''), 500) where id;
$$;

-- ---------------------------------------------------------------------------
-- Clicks. s1 on the click URL is our own id, which comes back on the postback
-- and ties a conversion to the exact card the worker tapped.
-- ---------------------------------------------------------------------------
create table if not exists notik_clicks (
  click_id     text primary key,
  profile_id   uuid not null references profiles(id) on delete cascade,
  offer_id     text not null,
  offer_name   text,
  payout       numeric(14,6) not null default 0,
  reward_usd   numeric(14,6) not null default 0,
  country      text,
  device       text,
  created_at   timestamptz not null default now()
);

create index if not exists notik_clicks_profile_idx on notik_clicks (profile_id, created_at desc);

alter table notik_clicks enable row level security;
revoke all on table notik_clicks from public, anon, authenticated;
grant all on table notik_clicks to service_role;

drop policy if exists notik_clicks_own on notik_clicks;
create policy notik_clicks_own on notik_clicks
  for select using (profile_id = auth.uid() or is_admin());

-- ---------------------------------------------------------------------------
-- Postbacks
-- ---------------------------------------------------------------------------
create table if not exists notik_postbacks (
  id                uuid primary key default gen_random_uuid(),
  txn_id            text not null unique,
  player_id         uuid,
  click_id          text,
  offer_id          text,
  offer_name        text,
  event_id          text,
  event_name        text,
  payout            numeric(14,6) not null default 0,   -- USD Notik pays us
  reward_amount     numeric(14,6) not null default 0,   -- converted to USD
  reward_units      numeric(14,6) not null default 0,   -- raw coins
  currency_name     text,
  credited_amount   numeric(14,6) not null default 0,
  chargeback        boolean not null default false,
  rewarded_txn_id   text,
  conversion_ip     text,
  raw_payload       jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);

create index if not exists notik_postbacks_player_idx on notik_postbacks (player_id, created_at desc);
create index if not exists notik_postbacks_offer_idx  on notik_postbacks (player_id, offer_id);

alter table notik_postbacks enable row level security;
revoke all on table notik_postbacks from public, anon, authenticated;
grant all on table notik_postbacks to service_role;

-- ---------------------------------------------------------------------------
-- Record a postback and, when it is a real credit, pay the worker.
--
-- Chargebacks arrive as the same postback shape with NEGATIVE payout/amount and
-- a rewarded_txn_id pointing at the original conversion. We record them but do
-- not claw back from the worker — same policy as KiwiWall, so the reversal rate
-- can be measured before deciding whether that path is worth building.
-- ---------------------------------------------------------------------------
create or replace function credit_notik_reward(
  p_txn_id text,
  p_player uuid,
  p_click_id text default null,
  p_offer_id text default null,
  p_offer_name text default null,
  p_event_id text default null,
  p_event_name text default null,
  p_payout numeric default 0,
  p_rewarded numeric default 0,
  p_reward_units numeric default 0,
  p_currency text default null,
  p_rewarded_txn_id text default null,
  p_ip text default null,
  p_raw jsonb default '{}'::jsonb
) returns json
language plpgsql security definer set search_path = public as $$
declare row_id uuid; net numeric; gross numeric; new_balance numeric; label text; back boolean;
begin
  if p_txn_id is null or btrim(p_txn_id) = '' then
    raise exception 'Missing Notik txn_id';
  end if;

  gross := round(coalesce(p_payout, 0), 6);
  net   := round(coalesce(p_rewarded, 0), 6);
  back  := gross < 0 or net < 0;
  label := coalesce(nullif(btrim(p_event_name), ''), nullif(btrim(p_offer_name), ''), 'Offer completed');

  insert into notik_postbacks (
    txn_id, player_id, click_id, offer_id, offer_name, event_id, event_name,
    payout, reward_amount, reward_units, currency_name, credited_amount,
    chargeback, rewarded_txn_id, conversion_ip, raw_payload
  ) values (
    btrim(p_txn_id), p_player, nullif(btrim(p_click_id), ''), nullif(btrim(p_offer_id), ''),
    nullif(btrim(p_offer_name), ''), nullif(btrim(p_event_id), ''), nullif(btrim(p_event_name), ''),
    gross, net, round(coalesce(p_reward_units, 0), 6), nullif(btrim(p_currency), ''), 0,
    back, nullif(btrim(p_rewarded_txn_id), ''), nullif(btrim(p_ip), ''), coalesce(p_raw, '{}'::jsonb)
  )
  on conflict (txn_id) do nothing
  returning id into row_id;

  -- Same txn_id twice is a Notik retry, not a second conversion. Their docs are
  -- explicit that we must dedup on it.
  if row_id is null then
    return json_build_object('credited', false, 'duplicate', true);
  end if;

  if back then
    raise warning 'Notik chargeback on txn % (payout %, original txn %)', p_txn_id, gross, p_rewarded_txn_id;
    return json_build_object('credited', false, 'chargeback', true);
  end if;

  if net <= 0 then
    return json_build_object('credited', false, 'reason', 'zero_reward');
  end if;

  -- user_id was absent or not a PicoWorker id (their test postbacks send
  -- placeholders). Permanent condition, so acknowledge rather than make them
  -- retry forever. A well-formed id with no wallet raises below instead,
  -- because that one is transient and a retry can succeed.
  if p_player is null then
    raise warning 'Notik txn % has no PicoWorker user (user_id absent or malformed)', p_txn_id;
    return json_build_object('credited', false, 'reason', 'no_user');
  end if;

  update wallets
     set earner_balance = earner_balance + net,
         lifetime_earned = lifetime_earned + net
   where profile_id = p_player
   returning earner_balance into new_balance;

  if new_balance is null then
    raise exception 'Notik user does not have a PicoWorker wallet';
  end if;

  update notik_postbacks set credited_amount = net where id = row_id;

  insert into ledger_entries(profile_id, amount, type, title, ref_id, balance_after)
  values (p_player, net, 'offer_reward', 'Offer · ' || label, btrim(p_txn_id), new_balance);

  -- Split only what we actually earned above the worker's promised reward.
  if gross > net then
    perform distribute_platform_cut(p_player, gross, net, label, btrim(p_txn_id));
  else
    raise warning 'Notik txn %: paid worker % but earned % — check NOTIK_USD_PER_COIN against the app payout ratio',
      p_txn_id, net, gross;
  end if;

  update profiles set last_active = now() where id = p_player;

  return json_build_object('credited', true, 'amount', net, 'balance', new_balance);
end; $$;

-- ---------------------------------------------------------------------------
-- The catalogue as one visitor should see it.
--
-- Notik expresses "no restriction" as the literal string "all" inside the
-- devices / platforms / os arrays, and geo targeting as a country_code array
-- that may also be empty. Every filter therefore has to accept its wildcard.
--
-- Offers the caller has already been credited for are excluded: Notik's
-- new-users-only inventory will not pay for them a second time, so showing
-- them again is traffic we know is worthless and a support ticket waiting to
-- happen.
-- ---------------------------------------------------------------------------
create or replace function list_notik_offers(
  p_country text,
  p_device text,
  p_os text,
  p_profile uuid,
  p_limit int default 300
) returns setof notik_offers
language sql stable security definer set search_path = public as $$
  select o.*
    from notik_offers o
   where o.payout > 0
     and (cardinality(o.country_codes) = 0
          or o.country_codes && array['ALL', upper(coalesce(p_country, ''))])
     and (cardinality(o.devices) = 0
          or o.devices && array['all', lower(coalesce(p_device, ''))])
     and (cardinality(o.os) = 0
          or o.os && array['all', lower(coalesce(p_os, ''))])
     and not exists (
       select 1 from notik_postbacks p
        where p.player_id = p_profile
          and p.offer_id = o.offer_id
          and p.credited_amount > 0
     )
   order by o.payout desc
   limit greatest(1, least(coalesce(p_limit, 300), 1000));
$$;

revoke all on function list_notik_offers(text, text, text, uuid, int) from public, anon, authenticated;
revoke all on function claim_notik_sync(int, int) from public, anon, authenticated;
revoke all on function replace_notik_offers(jsonb, timestamptz) from public, anon, authenticated;
revoke all on function finish_notik_sync(timestamptz) from public, anon, authenticated;
revoke all on function fail_notik_sync(text) from public, anon, authenticated;
revoke all on function credit_notik_reward(
  text, uuid, text, text, text, text, text, numeric, numeric, numeric, text, text, text, jsonb
) from public, anon, authenticated;

notify pgrst, 'reload schema';
