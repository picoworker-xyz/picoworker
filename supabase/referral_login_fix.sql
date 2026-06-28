-- ============================================================================
-- Fix 1: resetting the password clears the login lockout.
-- Fix 2: link a referral for OAuth (Google) signups, where the ref code can't
--        ride through the redirect.
-- ============================================================================

-- Clear the 5-try lockout for the current user (called after a password reset).
create or replace function clear_login_lockout()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from login_attempts
  where lower(email) = lower((select email from auth.users where id = auth.uid()));
end; $$;

-- Link the inviter for a fresh signup (used by Google signups that carry a ref
-- code in the browser). Only applies if the account is new and not yet referred.
create or replace function apply_referral(p_ref_code text)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); rc text := upper(trim(coalesce(p_ref_code, ''))); ref_id uuid; mp profiles;
begin
  if rc = '' then return; end if;
  select * into mp from profiles where id = me;
  if mp.id is null or mp.referred_by is not null then return; end if;
  if mp.created_at < now() - interval '1 hour' then return; end if; -- only fresh signups
  select id into ref_id from profiles where referral_code = rc and id <> me limit 1;
  if ref_id is null then return; end if;
  update profiles set referred_by = ref_id where id = me;
  if not exists (select 1 from referrals where referrer_id = ref_id and referred_id = me) then
    insert into referrals(referrer_id, referred_id, display_name, status)
    values (ref_id, me, mp.display_name, 'joined');
  end if;
end; $$;
