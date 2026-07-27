-- Persist TaskWall's country/device catalogs so normal page loads do not wait
-- for the provider API. Links contain a server-only user placeholder and are
-- personalized by the taskwall-offers Edge Function before being returned.
create table if not exists public.taskwall_offer_cache (
  country       text not null check (country ~ '^[A-Z]{2}$'),
  os            text not null check (os in ('android', 'ios', 'desktop')),
  offers        jsonb not null default '[]'::jsonb check (jsonb_typeof(offers) = 'array'),
  fetched_at    timestamptz not null default now(),
  primary key (country, os)
);

alter table public.taskwall_offer_cache enable row level security;
revoke all on table public.taskwall_offer_cache from public, anon, authenticated;
grant all on table public.taskwall_offer_cache to service_role;
