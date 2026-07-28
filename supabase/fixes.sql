-- ============================================================================
-- PicoWorker — fixes (run AFTER schema.sql). Idempotent.
-- ============================================================================

-- Daily streak bonus: enforce once per calendar day (server-side, abuse-proof).
alter table profiles add column if not exists last_bonus_date date;

-- claim_daily_bonus is owned by checkin.sql, which pays the Day 1..100 scaling
-- reward and keeps the once-per-day guard added above. The flat $0.05 version
-- that used to live here was removed: re-applying this file would have
-- silently reverted production to the flat bonus.
