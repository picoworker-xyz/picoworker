-- ============================================================================
-- Signup bonuses.
--
-- Welcome bonus stays at $0.05 (unchanged, restated here so this file is the
-- single place the signup amounts are set).
--
-- Referral join bonus of $0.01 is NEW. Until now handle_new_user linked the
-- referrer and inserted a 'joined' referrals row but credited them nothing,
-- while Notifications.tsx advertised "+$0.50" for a payment that never
-- happened. The referrer is now actually paid.
--
-- Based on the production definition (oauth.sql's version, which adds the
-- display_name fallbacks). Keep those fallbacks when editing.
-- ============================================================================

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare m text := coalesce(new.raw_user_meta_data->>'mode', 'earner');
        rc text := upper(coalesce(new.raw_user_meta_data->>'ref_code', ''));
        dn text := coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1));
        ref_id uuid;
        join_bonus numeric := 0.01;
        paid numeric;
begin
  insert into profiles(id, display_name, mode, referral_code, member_since, device_hash, signup_ip)
  values (new.id, dn, m, upper(substr(md5(new.id::text),1,8)), to_char(now(),'Mon YYYY'),
          new.raw_user_meta_data->>'device_hash', new.raw_user_meta_data->>'signup_ip');
  insert into wallets(profile_id, earner_balance, lifetime_earned)
  values (new.id, case when m='earner' then 0.05 else 0 end, case when m='earner' then 0.05 else 0 end);
  if m = 'earner' then
    insert into ledger_entries(profile_id, amount, type, title, balance_after)
    values (new.id, 0.05, 'welcome_bonus', 'Welcome bonus', 0.05);
  end if;

  if rc <> '' then
    select id into ref_id from profiles where referral_code = rc and id <> new.id limit 1;
    if ref_id is not null then
      update profiles set referred_by = ref_id where id = new.id;
      insert into referrals(referrer_id, referred_id, display_name, status)
      values (ref_id, new.id, dn, 'joined');

      -- Pay the inviter for the signup itself. This is separate from the 5%
      -- of ongoing earnings that distribute_platform_cut handles later.
      paid := credit_share(ref_id, join_bonus, 'referral_bonus',
                           'Referral joined · ' || dn, new.id::text);
      if paid > 0 then
        update referrals set earnings = earnings + paid
         where referrer_id = ref_id and referred_id = new.id;
      end if;
    end if;
  end if;

  insert into email_outbox(to_email, template, data)
  values (new.email, 'welcome', jsonb_build_object('name', dn, 'mode', m));
  return new;
end; $$;
