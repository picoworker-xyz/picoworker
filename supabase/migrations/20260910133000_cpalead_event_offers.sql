-- ---------------------------------------------------------------------------
-- Keep event offers visible until they are actually finished.
--
-- The first cut of list_cpalead_offers hid any offer the worker had ever been
-- credited for, copied from the Notik wall where a conversion is terminal. That
-- is wrong for CPAlead: one worker can complete several events on the SAME
-- offer, each paid as its own lead_id, so hiding the card after event 1 strands
-- the remaining events and the earnings that go with them.
--
-- An ordinary conversion arrives with event_key blank and does end the offer
-- for that worker, so that case still hides the card. An event conversion does
-- not, so the offer stays on the wall for the next event. CPAlead's own dedup
-- happens on lead_id in credit_cpalead_reward, which is what actually stops
-- double crediting; this filter is only about what is worth showing.
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
          and coalesce(p.event_key, '') = ''
     )
   order by o.amount desc
   limit greatest(1, least(coalesce(p_limit, 300), 1000));
$$;

revoke all on function list_cpalead_offers(text, text[], uuid, int) from public, anon, authenticated;

notify pgrst, 'reload schema';
