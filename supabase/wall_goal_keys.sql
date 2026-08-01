-- ============================================================================
-- TaskWall + KiwiWall: stop distinct milestones colliding into one conversion.
--
-- THE BUG (same shape as the Lootably one, different mechanism)
--
-- Neither provider sends a goal id, and both keys were too narrow to separate
-- two milestones of one offer.
--
-- TaskWall has no transaction-id macro at all, so we fingerprint the event as
--   sha256(userId | offerId | date | userAmount | payout)
-- offer_name is absent from that key. Milestones share one offer_id — offer
-- 19658911 carries both Dragon_Down_Collect_150_gems and
-- Dragon_Down_Collect_1000_gems — and TaskWall pays a flat $0.01 on 28 of its
-- 31 conversions to date. So a worker clearing two milestones of one offer on
-- one day produces an identical key and the second is dropped by
-- `on conflict do nothing`, silently, leaving no row to notice.
--
-- KiwiWall dedups on click_id alone. That is genuinely unique per click, but a
-- multi-goal offer reports several conversions against the same click, so every
-- goal after the first collides the same way.
--
-- Both produce the symptom we have been chasing: the first milestone pays and
-- nothing after it ever does.
--
-- THE FIX
--
-- Widen both keys by the only milestone discriminator these providers give us,
-- the offer/goal name. A genuine provider retry resends an identical payload
-- including the name, so retries still dedup correctly. Two different
-- milestones now differ in the key and both credit.
--
-- This is weaker than Lootably's real goalID and it is the best available here.
-- A provider that renames a milestone between the original and a retry would
-- double-pay; neither has ever done that in the data we hold.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- KiwiWall: (click_id) -> (click_id, offer_name)
-- ---------------------------------------------------------------------------
alter table kiwiwall_postbacks drop constraint if exists kiwiwall_postbacks_click_id_key;
drop index if exists kiwiwall_postbacks_click_goal_key;
create unique index kiwiwall_postbacks_click_goal_key
  on kiwiwall_postbacks (click_id, coalesce(offer_name, ''));

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
  -- Widened: the same click reporting a different goal is a new conversion.
  on conflict (click_id, coalesce(offer_name, '')) do nothing
  returning id into row_id;

  if row_id is null then
    return json_build_object('credited', false, 'duplicate', true);
  end if;

  if p_status = 4 then
    raise warning 'KiwiWall reversal on click % (earned %)', p_click_id, gross;
    return json_build_object('credited', false, 'reversed', true);
  end if;

  if net <= 0 then
    return json_build_object('credited', false, 'status', p_status);
  end if;
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
    raise exception 'KiwiWall user does not have a PicoWorker wallet';
  end if;

  update kiwiwall_postbacks set credited_amount = net where id = row_id;

  insert into ledger_entries(profile_id, amount, type, title, ref_id, balance_after)
  values (p_player, net, 'offer_reward', 'Offer · ' || label, btrim(p_click_id), new_balance);

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
