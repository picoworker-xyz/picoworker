-- ============================================================================
-- PicoWorker — account recovery on signup (run AFTER schema.sql). Idempotent.
--
-- When a device already has an account, instead of a dead-end block we show the
-- masked email of that account so the person can recognise + sign into it.
-- Safe: the device fingerprint can only be produced by that physical device,
-- and the email is masked (h•••o@domain).
-- ============================================================================

create or replace function device_account_hint(p_device_hash text)
returns text language plpgsql security definer set search_path = public as $$
declare e text; local text;
begin
  if p_device_hash is null or length(p_device_hash) < 8 then return null; end if;
  select u.email into e
  from profiles p join auth.users u on u.id = p.id
  where p.device_hash = p_device_hash
  order by p.created_at asc
  limit 1;
  if e is null then return null; end if;
  local := split_part(e, '@', 1);
  -- mask: first char + ••• + last char of the local part, full domain
  return left(local, 1) || '•••' || right(local, 1) || '@' || split_part(e, '@', 2);
end; $$;
