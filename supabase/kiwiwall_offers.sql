-- ============================================================================
-- KiwiWall Publisher API — server-side offer cache.
--
-- The inventory pull is limited to ~10 calls per minute for the whole token, so
-- it cannot be called per user. We cache one catalogue per country+device and
-- serve every visitor in that bucket from it.
--
-- The tradeoff: the API personalises eligibility by `sub`, so a cached card may
-- occasionally be stale for a specific user. That is safe, because the click
-- path is a separate mint call that re-checks eligibility server-side and
-- returns 422 when the offer is no longer available to that person. A stale
-- card fails at click with a clear message rather than paying nothing.
-- ============================================================================

create table if not exists kiwiwall_offer_cache (
  country    text not null,
  device     text not null,
  offers     jsonb not null default '[]'::jsonb,
  fetched_at timestamptz not null default now(),
  primary key (country, device)
);

alter table kiwiwall_offer_cache enable row level security;
revoke all on table kiwiwall_offer_cache from public, anon, authenticated;
grant all on table kiwiwall_offer_cache to service_role;

-- Every minted click, so a conversion postback can be traced back to the user
-- and offer that produced it. transaction_uid is our idempotency key with the
-- provider: replaying one returns 409 on their side.
create table if not exists kiwiwall_clicks (
  transaction_uid text primary key,
  profile_id      uuid not null references profiles(id) on delete cascade,
  offer_id        text not null,
  offer_title     text,
  payout          numeric(14,6) not null default 0,
  reward_units    numeric(14,6) not null default 0,
  country         text,
  created_at      timestamptz not null default now()
);

create index if not exists kiwiwall_clicks_profile_idx
  on kiwiwall_clicks (profile_id, created_at desc);

alter table kiwiwall_clicks enable row level security;
revoke all on table kiwiwall_clicks from public, anon, authenticated;
grant all on table kiwiwall_clicks to service_role;

drop policy if exists kiwiwall_clicks_own on kiwiwall_clicks;
create policy kiwiwall_clicks_own on kiwiwall_clicks
  for select using (profile_id = auth.uid() or is_admin());

notify pgrst, 'reload schema';
