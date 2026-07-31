-- ============================================================================
-- Lootably Conversion Webhooks — pending / approved / rejected.
--
-- WHY THIS IS NOT credit_lootably_reward
--
-- The plain postback fires once, at approval, so dedup by transactionID is
-- exactly right there: a second delivery is always a retry. Webhooks are a
-- state machine over the SAME transactionID — a conversion can arrive pending
-- first and approved minutes later. Under `on conflict do nothing` the approval
-- would be discarded as a duplicate and the worker would never be paid.
--
-- So this path upserts and credits on the transition into approved, guarded by
-- credited_amount so a redelivered approval cannot pay twice. The two receivers
-- share one table and one transactionID space, which means running both the
-- postback and the webhooks at once is safe: whichever arrives second finds
-- credited_amount already set and pays nothing.
--
-- Money is only moved on `approved`. Pending is recorded so the UI can show a
-- worker that something is in flight, and rejected is recorded so the rejection
-- rate is measurable — Lootably rejects for fraud, and a worker with a high
-- rejection rate is worth looking at before they cost us a chargeback.
-- ============================================================================

alter table lootably_postbacks add column if not exists state text not null default 'approved';
alter table lootably_postbacks add column if not exists country_code text;
alter table lootably_postbacks add column if not exists webhook_id text;
alter table lootably_postbacks add column if not exists updated_at timestamptz not null default now();

alter table lootably_postbacks drop constraint if exists lootably_postbacks_state_check;
alter table lootably_postbacks add constraint lootably_postbacks_state_check
  check (state in ('pending','approved','rejected'));

create index if not exists lootably_postbacks_state_idx
  on lootably_postbacks (state, created_at desc);

-- ---------------------------------------------------------------------------
-- Record a webhook and, on approval, pay the worker exactly once.
-- ---------------------------------------------------------------------------
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
  already numeric; row_id uuid;
  worker_share constant numeric := 0.80;   -- matches complete_task
begin
  if p_transaction_id is null or btrim(p_transaction_id) = '' then
    raise exception 'Missing Lootably transactionID';
  end if;
  if p_event not in ('pending','approved','rejected') then
    raise exception 'Unknown Lootably webhook event %', p_event;
  end if;

  gross := round(coalesce(p_revenue, 0), 6);
  net   := round(gross * worker_share, 6);
  label := coalesce(
    nullif(btrim(p_goal_name), ''),
    nullif(btrim(p_offer_name), ''),
    'Offer completed'
  );

  -- Upsert first so every event is durable even if crediting is skipped. The
  -- returning clause gives us the pre-existing credited_amount under the row
  -- lock the update takes, which is what makes the pay-once check safe against
  -- two deliveries racing.
  insert into lootably_postbacks (
    transaction_id, state, status, player_id, offer_id, offer_name, goal_id, goal_name,
    percent_complete, revenue, currency_reward, credited_amount,
    ip_address, country_code, webhook_id, raw_payload, updated_at
  ) values (
    btrim(p_transaction_id), p_event, case when p_event = 'rejected' then 0 else 1 end,
    p_player, nullif(btrim(p_offer_id), ''), nullif(btrim(p_offer_name), ''),
    nullif(btrim(p_goal_id), ''), nullif(btrim(p_goal_name), ''),
    p_percent, gross, round(coalesce(p_currency_reward, 0), 6), 0,
    nullif(btrim(p_ip), ''), nullif(btrim(p_country), ''), nullif(btrim(p_webhook_id), ''),
    coalesce(p_raw, '{}'::jsonb), now()
  )
  on conflict (transaction_id) do update set
    state         = excluded.state,
    status        = excluded.status,
    -- Never overwrite a known player with a null from a later delivery.
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

  -- `already` is the value after the upsert, which for a fresh insert is 0 and
  -- for an existing row is whatever a previous approval paid.
  if p_event <> 'approved' then
    return json_build_object('credited', false, 'state', p_event);
  end if;
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

  update wallets
     set earner_balance  = earner_balance + net,
         lifetime_earned = lifetime_earned + net
   where profile_id = p_player
   returning earner_balance into new_balance;

  if new_balance is null then
    -- Transient: raising rolls the upsert back so a retry can succeed once the
    -- wallet exists, rather than leaving an approved row that never paid.
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
