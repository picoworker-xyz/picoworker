-- ============================================================================
-- Lootably: record every offer open, and let a worker see work in review.
--
-- WHY CLICKS ARE RECORDED
--
-- Lootably links are direct — their redirect already carries our userID — so
-- unlike the other walls there is no server-side mint and we learn nothing
-- until a conversion arrives. That leaves two very different situations
-- looking identical in the database:
--
--   a) forty workers opened an offer and none reached goal 2
--   b) forty workers opened an offer, reached goal 2, and it was never reported
--
-- Without the denominator we cannot tell them apart, which is exactly the
-- argument we cannot win with a provider. With it:
--
--   OneShot Pool Elite   opened 38
--     coins_55           paid 22
--     coins_250          paid  0    <- all 22 necessarily passed 250
--
-- A click row is cheap, carries no money, and is never in the payment path: if
-- the insert fails the worker still opens the offer and still gets paid.
--
-- Goal metadata is snapshotted at click time on purpose. Catalogues change, and
-- a report is worthless if the goals an offer had last week are gone today.
-- ============================================================================

create table if not exists lootably_clicks (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  offer_id    text not null,
  offer_name  text,
  device      text,
  country     text,
  -- The goal list as advertised when this worker opened it.
  goals       jsonb not null default '[]'::jsonb,
  reward_usd  numeric(14,6) not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists lootably_clicks_offer_idx on lootably_clicks (offer_id, created_at desc);
create index if not exists lootably_clicks_profile_idx on lootably_clicks (profile_id, created_at desc);

alter table lootably_clicks enable row level security;
revoke all on table lootably_clicks from public, anon, authenticated;
grant all on table lootably_clicks to service_role;

-- ---------------------------------------------------------------------------
-- Called by the browser as the worker opens an offer. security definer so the
-- table stays closed to clients; the caller can only ever write their own row
-- because profile_id comes from auth.uid(), never from the request.
-- ---------------------------------------------------------------------------
create or replace function record_lootably_click(
  p_offer_id text,
  p_offer_name text default null,
  p_device text default null,
  p_country text default null,
  p_goals jsonb default '[]'::jsonb,
  p_reward numeric default 0
) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null or p_offer_id is null or btrim(p_offer_id) = '' then
    return;   -- never raise: this must not block opening the offer
  end if;
  insert into lootably_clicks (profile_id, offer_id, offer_name, device, country, goals, reward_usd)
  values (me, btrim(p_offer_id), nullif(btrim(p_offer_name), ''),
          nullif(btrim(p_device), ''), nullif(btrim(p_country), ''),
          coalesce(p_goals, '[]'::jsonb), round(coalesce(p_reward, 0), 6));
end; $$;

grant execute on function record_lootably_click(text, text, text, text, jsonb, numeric) to authenticated;

-- ---------------------------------------------------------------------------
-- A worker's offer activity, including conversions still in review.
--
-- Pending conversions live only in lootably_postbacks and never reach the
-- ledger, so today a worker who completes a goal sees nothing at all and
-- assumes it was lost. This exposes only their own rows, and only the columns
-- they should see — never the ip, the raw payload, or our gross revenue.
-- ---------------------------------------------------------------------------
create or replace function my_offer_activity()
returns table (
  offer_name text,
  goal_name text,
  state text,
  amount numeric,
  happened_at timestamptz
)
language sql security definer set search_path = public as $$
  select coalesce(offer_name, 'Offer'),
         goal_name,
         state,
         -- Show the worker their share, not our gross.
         round(revenue * 0.80, 6),
         created_at
    from lootably_postbacks
   where player_id = auth.uid()
     and state in ('pending', 'rejected')
   order by created_at desc
   limit 25;
$$;

grant execute on function my_offer_activity() to authenticated;

-- ---------------------------------------------------------------------------
-- Operator view: the funnel, per offer. This is the report to send a provider.
-- ---------------------------------------------------------------------------
create or replace view lootably_goal_funnel as
  select c.offer_id,
         max(c.offer_name)                     as offer_name,
         count(distinct c.profile_id)          as workers_opened,
         count(distinct c.id)                  as opens,
         (select count(distinct p.player_id)
            from lootably_postbacks p
           where p.offer_id = c.offer_id and p.credited_amount > 0) as workers_paid,
         (select count(*)
            from lootably_postbacks p
           where p.offer_id = c.offer_id and p.credited_amount > 0) as goals_paid,
         (select round(coalesce(sum(p.credited_amount), 0), 6)
            from lootably_postbacks p
           where p.offer_id = c.offer_id) as paid_out
    from lootably_clicks c
   group by c.offer_id;

revoke all on lootably_goal_funnel from public, anon, authenticated;
grant select on lootably_goal_funnel to service_role;

notify pgrst, 'reload schema';
