-- ============================================================================
-- Lootably: make the conversion key goal-aware, and pay each goal exactly once.
--
-- TWO SEPARATE FAILURES, OPPOSITE DIRECTIONS.
--
-- 1. UNDER-PAYING (the one we are actually chasing)
--
--    The old unique key was transaction_id alone. Their docs say a transactionID
--    identifies one conversion and each goal is its own conversion, so that
--    should be unique per goal. But if a transactionID is ever reused across
--    goals of the same offer, the upsert finds the existing row, sees
--    credited_amount > 0, returns 'duplicate' and pays nothing. Goal 1 pays and
--    every later goal is silently swallowed — indistinguishable from the
--    advertiser never reporting them.
--
--    We cannot rule this out from the data: every conversion received so far has
--    been on a different offer, so two goals of one offer have never arrived.
--    Rather than wait to find out in production, the key becomes
--    (transaction_id, goal_id). A reused transactionID carrying a different
--    goalID is now a distinct conversion and credits normally.
--
--    goal_id is null for singlestep offers, so it is coalesced to '' — a null in
--    a unique index would let unlimited duplicate singlestep rows through.
--
-- 2. OVER-PAYING
--
--    Making the key wider re-opens the other direction: the same goal arriving
--    twice under two different transaction IDs, from a provider bug, a replay,
--    or an advertiser resend. For a multistep goal a repeat is never legitimate,
--    so it is blocked at the crediting step by looking for an existing paid row
--    for the same (player, offer, goal).
--
--    Singlestep offers are exempt: multipleConversionsAllowed genuinely permits
--    repeats, and blocking those would underpay people doing real repeat work.
--    They are identified by having no goal_id.
-- ============================================================================

-- Rebuild the uniqueness constraint on the wider key.
alter table lootably_postbacks drop constraint if exists lootably_postbacks_transaction_id_key;
drop index if exists lootably_postbacks_txn_goal_key;
create unique index lootably_postbacks_txn_goal_key
  on lootably_postbacks (transaction_id, coalesce(goal_id, ''));

-- Finding "has this worker already been paid for this goal" must not scan.
create index if not exists lootably_paid_goal_idx
  on lootably_postbacks (player_id, offer_id, goal_id)
  where credited_amount > 0;

create or replace function credit_lootably_webhook(
  p_transaction_id text,
  p_event text,
  p_player uuid,
  p_offer_id text default null,
  p_offer_name text default null,
  p_goal_id text default null,
  p_goal_name text default null,
  p_percent numeric default null,
  p_revenue numeric default 0,
  p_currency_reward numeric default 0,
  p_ip text default null,
  p_country text default null,
  p_webhook_id text default null,
  p_raw jsonb default '{}'::jsonb
) returns json
language plpgsql security definer set search_path = public as $$
declare
  gross numeric; net numeric; new_balance numeric; label text;
  already numeric; row_id uuid; goal text; paid_before int;
  worker_share constant numeric := 0.80;   -- matches complete_task
begin
  if p_transaction_id is null or btrim(p_transaction_id) = '' then
    raise exception 'Missing Lootably transactionID';
  end if;
  if p_event not in ('pending','approved','rejected') then
    raise exception 'Unknown Lootably webhook event %', p_event;
  end if;

  goal  := nullif(btrim(p_goal_id), '');
  gross := round(coalesce(p_revenue, 0), 6);
  net   := round(gross * worker_share, 6);
  label := coalesce(
    nullif(btrim(p_goal_name), ''),
    nullif(btrim(p_offer_name), ''),
    'Offer completed'
  );

  insert into lootably_postbacks (
    transaction_id, state, status, player_id, offer_id, offer_name, goal_id, goal_name,
    percent_complete, revenue, currency_reward, credited_amount,
    ip_address, country_code, webhook_id, raw_payload, updated_at
  ) values (
    btrim(p_transaction_id), p_event, case when p_event = 'rejected' then 0 else 1 end,
    p_player, nullif(btrim(p_offer_id), ''), nullif(btrim(p_offer_name), ''),
    goal, nullif(btrim(p_goal_name), ''),
    p_percent, gross, round(coalesce(p_currency_reward, 0), 6), 0,
    nullif(btrim(p_ip), ''), nullif(btrim(p_country), ''), nullif(btrim(p_webhook_id), ''),
    coalesce(p_raw, '{}'::jsonb), now()
  )
  on conflict (transaction_id, coalesce(goal_id, '')) do update set
    state         = excluded.state,
    status        = excluded.status,
    player_id     = coalesce(lootably_postbacks.player_id, excluded.player_id),
    goal_name     = coalesce(excluded.goal_name, lootably_postbacks.goal_name),
    percent_complete = coalesce(excluded.percent_complete, lootably_postbacks.percent_complete),
    revenue       = excluded.revenue,
    currency_reward = excluded.currency_reward,
    country_code  = coalesce(excluded.country_code, lootably_postbacks.country_code),
    webhook_id    = excluded.webhook_id,
    raw_payload   = excluded.raw_payload,
    updated_at    = now()
  returning id, credited_amount into row_id, already;

  if p_event <> 'approved' then
    return json_build_object('credited', false, 'state', p_event);
  end if;
  -- This exact conversion already paid: a webhook redelivery.
  if already > 0 then
    return json_build_object('credited', false, 'duplicate', true);
  end if;
  if net <= 0 then
    return json_build_object('credited', false, 'reason', 'zero_revenue');
  end if;
  if p_player is null then
    raise warning 'Lootably transaction % approved but userID is absent or malformed', p_transaction_id;
    return json_build_object('credited', false, 'reason', 'no_user');
  end if;

  -- Same goal, different transaction. Never legitimate for a multistep goal.
  -- Singlestep offers carry no goal_id and are left alone, because
  -- multipleConversionsAllowed makes repeats real work that must be paid.
  if goal is not null then
    select count(*) into paid_before
      from lootably_postbacks
     where player_id = p_player
       and offer_id is not distinct from nullif(btrim(p_offer_id), '')
       and goal_id = goal
       and credited_amount > 0
       and id <> row_id;
    if paid_before > 0 then
      raise warning 'Lootably goal % on offer % already paid for user % (transaction %)',
        goal, p_offer_id, p_player, p_transaction_id;
      return json_build_object('credited', false, 'duplicate_goal', true);
    end if;
  end if;

  update wallets
     set earner_balance  = earner_balance + net,
         lifetime_earned = lifetime_earned + net
   where profile_id = p_player
   returning earner_balance into new_balance;

  if new_balance is null then
    raise exception 'Lootably user does not have a PicoWorker wallet';
  end if;

  update lootably_postbacks set credited_amount = net where id = row_id;

  insert into ledger_entries(profile_id, amount, type, title, ref_id, balance_after)
  values (p_player, net, 'offer_reward', 'Offer · ' || label, btrim(p_transaction_id), new_balance);

  perform distribute_platform_cut(p_player, gross, net, label, btrim(p_transaction_id));

  update profiles set last_active = now() where id = p_player;

  return json_build_object('credited', true, 'amount', net, 'balance', new_balance);
end; $$;

revoke all on function credit_lootably_webhook(
  text, text, uuid, text, text, text, text, numeric, numeric, numeric, text, text, text, jsonb
) from public, anon, authenticated;

notify pgrst, 'reload schema';
