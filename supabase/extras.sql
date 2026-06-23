-- ============================================================================
-- PicoWorker — extra functions (run AFTER schema.sql). Idempotent.
-- ============================================================================

-- Real leaderboard: top earners by lifetime earnings. SECURITY DEFINER so it
-- can read aggregate earnings without exposing each user's private wallet.
create or replace function leaderboard(p_limit int default 20)
returns table (display_name text, lifetime numeric, is_me boolean)
language sql security definer stable as $$
  select p.display_name, w.lifetime_earned, (p.id = auth.uid())
  from profiles p
  join wallets w on w.profile_id = p.id
  where p.mode = 'earner'
  order by w.lifetime_earned desc, p.created_at asc
  limit p_limit;
$$;
