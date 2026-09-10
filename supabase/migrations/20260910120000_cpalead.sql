-- ============================================================================
-- CPAlead offerwall — offer catalogue, click tracking, postbacks and crediting.
--
-- CPAlead's publisher Offers API (https://www.cpalead.com/api/offers) can filter
-- by country and device itself, but only against the CALLER's IP when asked to
-- detect ("country=user"), and the caller here is an Edge Function in a data
-- centre. Filtering per visitor would therefore mean one outbound API call on
-- every page render, keyed on values we already know. So we pull the catalogue
-- unfiltered (limit 5000, the documented maximum) on a shared cadence and do
-- the country / device targeting in SQL, exactly as the Notik wall does.
--
-- The catalogue lives as real rows rather than one jsonb blob:
--   * targeting is an index scan instead of a full-catalogue sweep
--   * "hide what this worker already completed" is a single anti-join, and
--     CPAlead does not pay twice for the same campaign per user, so showing a
--     completed offer again is traffic we know is worthless
--
-- Money model. Simpler than Notik: there is no virtual-currency ratio. The
-- catalogue's `amount` is what CPAlead pays PicoWorker in `payout_currency`
-- (USD), and the postback's {payout} is the same figure for the conversion that
-- actually happened. The worker is credited amount * CPALEAD_WORKER_SHARE, the
-- cards are priced with the same multiplier so the wall matches the wallet, and
-- the remainder is split by distribute_platform_cut.
--
-- CPAlead's publisher callback has no reversal notification (their postback
-- documentation says so explicitly), so there is no chargeback path here. The
-- /api/reversals endpoint exists for offline reconciliation if the reversal
-- rate ever turns out to be worth acting on.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------
create table if not exists cpalead_offers (
  offer_id            text primary key,
  title               text not null,
  description         text,
  long_description    text,
  -- CPAlead's `conversion` field: the KPI in the publisher's words ("Install
  -- and reach level 5"). It is the single most useful line on a card, because
  -- it is what the worker is actually being asked to do.
  conversion          text,
  link                text not null,
  preview_link        text,
  image_url           text,
  countries           text[] not null default '{}',
  devices             text[] not null default '{}',
  amount              numeric(14,6) not null default 0,
  payout_currency     text,
  payout_type         text,
  epc                 numeric(14,6),
  offer_rank          numeric(14,6),
  daily_cap           int,
  is_fast_pay         boolean not null default false,
  conversion_mode     text,
  verification_method text,
  events              jsonb not null default '[]'::jsonb,
  creatives           jsonb not null default '[]'::jsonb,
  synced_at           timestamptz not null default now()
);

-- The two array filters every request applies. GIN turns the containment
-- checks into index scans rather than a full catalogue sweep.
create index if not exists cpalead_offers_countries_idx on cpalead_offers using gin (countries);
create index if not exists cpalead_offers_devices_idx   on cpalead_offers using gin (devices);
create index if not exists cpalead_offers_amount_idx    on cpalead_offers (amount desc);

alter table cpalead_offers enable row level security;
revoke all on table cpalead_offers from public, anon, authenticated;
grant all on table cpalead_offers to service_role;

-- Single-row bookkeeping for the refresh cadence. `syncing_at` is the lock: two
-- concurrent visitors must not both pull the same 5000-offer catalogue, so
-- whoever claims the row does the work and everyone else serves what is stored.
create table if not exists cpalead_sync (
  id         boolean primary key default true check (id),
  synced_at  timestamptz,
  syncing_at timestamptz,
  offers     int not null default 0,
  error      text
);
insert into cpalead_sync (id) values (true) on conflict (id) do nothing;

alter table cpalead_sync enable row level security;
revoke all on table cpalead_sync from public, anon, authenticated;
grant all on table cpalead_sync to service_role;

-- ---------------------------------------------------------------------------
-- Claim the catalogue refresh. Returns true only for the caller that won it.
--
-- A crashed sync would otherwise hold the lock forever, so a claim older than
-- p_stale_minutes is treated as abandoned and can be taken over.
-- ---------------------------------------------------------------------------
create or replace function claim_cpalead_sync(
  p_max_age_minutes int default 15,
  p_stale_minutes int default 10
) returns boolean
language plpgsql security definer set search_path = public as $$
declare claimed boolean;
begin
  update cpalead_sync
     set syncing_at = now()
   where id
     and (synced_at is null or synced_at < now() - make_interval(mins => p_max_age_minutes))
     and (syncing_at is null or syncing_at < now() - make_interval(mins => p_stale_minutes))
  returning true into claimed;

  return coalesce(claimed, false);
end; $$;

-- ---------------------------------------------------------------------------
-- Write one pulled batch into the catalogue.
--
-- Upsert then delete-by-timestamp (in finish_cpalead_sync) rather than
-- truncate-then-insert: the table stays readable throughout, so a visitor
-- arriving mid-refresh sees the old catalogue instead of an empty page.
-- `p_started` is the caller's sync stamp, shared by every batch of one run —
-- it is what marks a row as belonging to this refresh.
-- ---------------------------------------------------------------------------
create or replace function replace_cpalead_offers(p_offers jsonb, p_started timestamptz)
returns int
language plpgsql security definer set search_path = public as $$
declare started timestamptz := coalesce(p_started, now()); written int;
begin
  insert into cpalead_offers (
    offer_id, title, description, long_description, conversion, link, preview_link,
    image_url, countries, devices, amount, payout_currency, payout_type, epc,
    offer_rank, daily_cap, is_fast_pay, conversion_mode, verification_method,
    events, creatives, synced_at
  )
  select
    o->>'offer_id',
    o->>'title',
    nullif(o->>'description', ''),
    nullif(o->>'long_description', ''),
    nullif(o->>'conversion', ''),
    o->>'link',
    nullif(o->>'preview_link', ''),
    nullif(o->>'image_url', ''),
    coalesce(array(select upper(jsonb_array_elements_text(o->'countries'))), '{}'),
    coalesce(array(select lower(jsonb_array_elements_text(o->'devices'))), '{}'),
    coalesce((o->>'amount')::numeric, 0),
    nullif(o->>'payout_currency', ''),
    nullif(o->>'payout_type', ''),
    (o->>'epc')::numeric,
    (o->>'offer_rank')::numeric,
    (o->>'daily_cap')::int,
    coalesce((o->>'is_fast_pay')::boolean, false),
    nullif(o->>'conversion_mode', ''),
    nullif(o->>'verification_method', ''),
    coalesce(o->'events', '[]'::jsonb),
    coalesce(o->'creatives', '[]'::jsonb),
    started
  from jsonb_array_elements(coalesce(p_offers, '[]'::jsonb)) as o
  where coalesce(o->>'offer_id', '') <> ''
    and coalesce(o->>'title', '') <> ''
    and coalesce(o->>'link', '') <> ''
  on conflict (offer_id) do update set
    title               = excluded.title,
    description         = excluded.description,
    long_description    = excluded.long_description,
    conversion          = excluded.conversion,
    link                = excluded.link,
    preview_link        = excluded.preview_link,
    image_url           = excluded.image_url,
    countries           = excluded.countries,
    devices             = excluded.devices,
    amount              = excluded.amount,
    payout_currency     = excluded.payout_currency,
    payout_type         = excluded.payout_type,
    epc                 = excluded.epc,
    offer_rank          = excluded.offer_rank,
    daily_cap           = excluded.daily_cap,
    is_fast_pay         = excluded.is_fast_pay,
    conversion_mode     = excluded.conversion_mode,
    verification_method = excluded.verification_method,
    events              = excluded.events,
    creatives           = excluded.creatives,
    synced_at           = excluded.synced_at;

  get diagnostics written = row_count;
  return written;
end; $$;

-- ---------------------------------------------------------------------------
-- Close a sync: drop everything the run did not touch and release the lock.
--
-- Anything the pull did not mention is paused, capped out or expired, and
-- CPAlead does not reward traffic sent to those, so it must not survive.
-- ---------------------------------------------------------------------------
create or replace function finish_cpalead_sync(p_started timestamptz)
returns int
language plpgsql security definer set search_path = public as $$
declare kept int;
begin
  delete from cpalead_offers where synced_at < p_started;
  select count(*) into kept from cpalead_offers;

  update cpalead_sync
     set synced_at = now(), syncing_at = null, offers = kept, error = null
   where id;

  return kept;
end; $$;

-- Release the lock without marking a successful sync, so the next visitor
-- retries instead of waiting out the full cadence on a failed pull.
create or replace function fail_cpalead_sync(p_error text)
returns void
language sql security definer set search_path = public as $$
  update cpalead_sync set syncing_at = null, error = left(coalesce(p_error, ''), 500) where id;
$$;

-- ---------------------------------------------------------------------------
-- Clicks. `subid` on the offer link is our own click id, which comes back on
-- the postback and ties a conversion to the exact card the worker tapped.
-- `subid2` carries the profile id, so a conversion is still creditable even if
-- the click row is missing.
-- ---------------------------------------------------------------------------
create table if not exists cpalead_clicks (
  click_id     uuid primary key,
  profile_id   uuid not null references profiles(id) on delete cascade,
  offer_id     text not null,
  offer_name   text,
  amount       numeric(14,6) not null default 0,
  reward_usd   numeric(14,6) not null default 0,
  country      text,
  device       text,
  created_at   timestamptz not null default now()
);

create index if not exists cpalead_clicks_profile_idx on cpalead_clicks (profile_id, created_at desc);

alter table cpalead_clicks enable row level security;
revoke all on table cpalead_clicks from public, anon, authenticated;
grant all on table cpalead_clicks to service_role;

drop policy if exists cpalead_clicks_own on cpalead_clicks;
create policy cpalead_clicks_own on cpalead_clicks
  for select using (profile_id = auth.uid() or is_admin());

-- ---------------------------------------------------------------------------
-- Postbacks. `lead_id` is CPAlead's unique conversion id and the macro their
-- docs name as the one to dedup retries on, so it is the unique key here.
-- ---------------------------------------------------------------------------
create table if not exists cpalead_postbacks (
  id                uuid primary key default gen_random_uuid(),
  lead_id           text not null unique,
  player_id         uuid,
  click_id          uuid,
  offer_id          text,
  offer_name        text,
  event_key         text,
  event_name        text,
  payout            numeric(14,6) not null default 0,  -- USD CPAlead pays us
  reward_amount     numeric(14,6) not null default 0,  -- the worker's share
  credited_amount   numeric(14,6) not null default 0,
  gateway_id        text,
  country_iso       text,
  conversion_ip     text,
  raw_payload       jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);

create index if not exists cpalead_postbacks_player_idx on cpalead_postbacks (player_id, created_at desc);
create index if not exists cpalead_postbacks_offer_idx  on cpalead_postbacks (player_id, offer_id);

alter table cpalead_postbacks enable row level security;
revoke all on table cpalead_postbacks from public, anon, authenticated;
grant all on table cpalead_postbacks to service_role;

-- ---------------------------------------------------------------------------
-- Record a postback and, when it is a real credit, pay the worker.
--
-- The receiver resolves the worker before calling in: `subid` is our click id,
-- whose row carries the profile, and `subid2` is the profile id directly. This
-- function takes the resolved id so the lookup order stays in one place.
-- ---------------------------------------------------------------------------
create or replace function credit_cpalead_reward(
  p_lead_id text,
  p_player uuid,
  p_click_id uuid default null,
  p_offer_id text default null,
  p_offer_name text default null,
  p_event_key text default null,
  p_event_name text default null,
  p_payout numeric default 0,
  p_rewarded numeric default 0,
  p_gateway_id text default null,
  p_country text default null,
  p_ip text default null,
  p_raw jsonb default '{}'::jsonb
) returns json
language plpgsql security definer set search_path = public as $$
declare row_id uuid; net numeric; gross numeric; new_balance numeric; label text;
begin
  if p_lead_id is null or btrim(p_lead_id) = '' then
    raise exception 'Missing CPAlead lead_id';
  end if;

  gross := round(coalesce(p_payout, 0), 6);
  net   := round(coalesce(p_rewarded, 0), 6);
  label := coalesce(nullif(btrim(p_event_name), ''), nullif(btrim(p_offer_name), ''), 'Offer completed');

  insert into cpalead_postbacks (
    lead_id, player_id, click_id, offer_id, offer_name, event_key, event_name,
    payout, reward_amount, credited_amount, gateway_id, country_iso,
    conversion_ip, raw_payload
  ) values (
    btrim(p_lead_id), p_player, p_click_id, nullif(btrim(p_offer_id), ''),
    nullif(btrim(p_offer_name), ''), nullif(btrim(p_event_key), ''), nullif(btrim(p_event_name), ''),
    gross, net, 0, nullif(btrim(p_gateway_id), ''), nullif(upper(btrim(p_country)), ''),
    nullif(btrim(p_ip), ''), coalesce(p_raw, '{}'::jsonb)
  )
  on conflict (lead_id) do nothing
  returning id into row_id;

  -- Same lead_id twice is a CPAlead retry, not a second conversion. Their docs
  -- are explicit that we must dedup on it.
  if row_id is null then
    return json_build_object('credited', false, 'duplicate', true);
  end if;

  if net <= 0 then
    return json_build_object('credited', false, 'reason', 'zero_reward');
  end if;

  -- subid was absent, or neither subid nor subid2 resolved to a PicoWorker
  -- account (their test postbacks send placeholders). Permanent condition, so
  -- the receiver acknowledges rather than making them retry forever. A resolved
  -- id with no wallet raises below instead, because that one is transient.
  if p_player is null then
    raise warning 'CPAlead lead % has no PicoWorker user (subid unresolved)', p_lead_id;
    return json_build_object('credited', false, 'reason', 'no_user');
  end if;

  update wallets
     set earner_balance = earner_balance + net,
         lifetime_earned = lifetime_earned + net
   where profile_id = p_player
   returning earner_balance into new_balance;

  if new_balance is null then
    raise exception 'CPAlead user does not have a PicoWorker wallet';
  end if;

  update cpalead_postbacks set credited_amount = net where id = row_id;

  insert into ledger_entries(profile_id, amount, type, title, ref_id, balance_after)
  values (p_player, net, 'offer_reward', 'Offer · ' || label, btrim(p_lead_id), new_balance);

  -- Split only what we actually earned above the worker's promised reward.
  if gross > net then
    perform distribute_platform_cut(p_player, gross, net, label, btrim(p_lead_id));
  else
    raise warning 'CPAlead lead %: paid worker % but earned % — check CPALEAD_WORKER_SHARE',
      p_lead_id, net, gross;
  end if;

  update profiles set last_active = now() where id = p_player;

  return json_build_object('credited', true, 'amount', net, 'balance', new_balance);
end; $$;

-- ---------------------------------------------------------------------------
-- The catalogue as one visitor should see it.
--
-- CPAlead expresses "no restriction" as the literal string "all" in both the
-- country and device fields, and either may also arrive empty. Every filter
-- therefore has to accept its wildcard. p_devices is the caller's device plus
-- the families it belongs to ("android" also matches "mobile"), so the family
-- mapping lives in one place in the edge function rather than being spelled out
-- in SQL.
--
-- Offers the caller has already been credited for are excluded: CPAlead does
-- not pay for the same campaign twice per user, so showing them again is
-- traffic we know is worthless and a support ticket waiting to happen.
-- ---------------------------------------------------------------------------
create or replace function list_cpalead_offers(
  p_country text,
  p_devices text[],
  p_profile uuid,
  p_limit int default 300
) returns setof cpalead_offers
language sql stable security definer set search_path = public as $$
  select o.*
    from cpalead_offers o
   where o.amount > 0
     and (cardinality(o.countries) = 0
          or o.countries && array['ALL', upper(coalesce(p_country, ''))])
     and (cardinality(o.devices) = 0
          or o.devices && (array['all'] || coalesce(p_devices, '{}')))
     and not exists (
       select 1 from cpalead_postbacks p
        where p.player_id = p_profile
          and p.offer_id = o.offer_id
          and p.credited_amount > 0
     )
   order by o.amount desc
   limit greatest(1, least(coalesce(p_limit, 300), 1000));
$$;

revoke all on function list_cpalead_offers(text, text[], uuid, int) from public, anon, authenticated;
revoke all on function claim_cpalead_sync(int, int) from public, anon, authenticated;
revoke all on function replace_cpalead_offers(jsonb, timestamptz) from public, anon, authenticated;
revoke all on function finish_cpalead_sync(timestamptz) from public, anon, authenticated;
revoke all on function fail_cpalead_sync(text) from public, anon, authenticated;
revoke all on function credit_cpalead_reward(
  text, uuid, uuid, text, text, text, text, numeric, numeric, text, text, text, jsonb
) from public, anon, authenticated;

notify pgrst, 'reload schema';
