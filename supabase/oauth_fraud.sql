-- ============================================================================
-- PicoWorker — capture device/IP/VPN for OAuth (Google) users after login, so
-- they go through the same duplicate-account flagging as email signups.
-- ============================================================================
alter table profiles add column if not exists signup_vpn boolean not null default false;

create or replace function attach_fraud_signals(p_device text, p_ip text, p_vpn boolean default false)
returns void language plpgsql security definer set search_path = public as $$
begin
  -- Only fill on first capture (don't overwrite values set at email signup).
  update profiles set
    signup_vpn  = case when device_hash is null then p_vpn else signup_vpn end,
    device_hash = coalesce(device_hash, nullif(p_device, '')),
    signup_ip   = coalesce(signup_ip, nullif(p_ip, ''))
  where id = auth.uid();
end; $$;
