-- ============================================================================
-- Stop paying people for existing.
--
-- Signup was fully open: no email confirmation, no captcha. Every new row in
-- auth.users was worth $0.05 to whoever created it, plus $0.01 to whoever's
-- referral code it carried. Against 146 accounts, 145 of which have never
-- completed a task, that produced $7.10 of welcome bonuses and $0.58 of
-- referral bonuses while all three offerwalls together earned $0.49.
--
-- WHAT CHANGES
--
-- The wallet now starts at zero and no welcome_bonus row is written. The
-- referral row is still created so the inviter sees the signup, but no money
-- moves until that person actually earns — at which point distribute_platform_cut
-- pays the referrer their 5% share as it always has.
--
-- Nothing is taken from anyone. Balances already credited stay exactly as they
-- are; this only stops future signups from minting money.
--
-- Email confirmation is switched on separately in the Auth settings. That stops
-- new fake accounts; this removes the reason to create them. Both are needed:
-- confirmation alone still lets someone with a supply of addresses farm bonuses,
-- and this alone still lets them create accounts, just worthless ones.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare m text := coalesce(new.raw_user_meta_data->>'mode', 'earner');
        rc text := upper(coalesce(new.raw_user_meta_data->>'ref_code', ''));
        dn text := coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1));
        ref_id uuid;
begin
  insert into profiles(id, display_name, mode, referral_code, member_since, device_hash, signup_ip)
  values (new.id, dn, m, upper(substr(md5(new.id::text),1,8)), to_char(now(),'Mon YYYY'),
          new.raw_user_meta_data->>'device_hash', new.raw_user_meta_data->>'signup_ip');

  -- Starts empty. Creating an account is no longer an earning event.
  insert into wallets(profile_id, earner_balance, lifetime_earned)
  values (new.id, 0, 0);

  if rc <> '' then
    select id into ref_id from profiles where referral_code = rc and id <> new.id limit 1;
    if ref_id is not null then
      update profiles set referred_by = ref_id where id = new.id;
      -- The referral is still recorded, so the inviter sees the signup and
      -- earns their 5% as soon as this person completes real work. What is
      -- gone is the flat payment for the signup itself, which was payable to
      -- anyone able to create an address — including with their own code.
      insert into referrals(referrer_id, referred_id, display_name, status)
      values (ref_id, new.id, dn, 'joined');
    end if;
  end if;

  insert into email_outbox(to_email, template, data)
  values (new.email, 'welcome', jsonb_build_object('name', dn, 'mode', m));
  return new;
end; $function$;

notify pgrst, 'reload schema';
