create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare m text := coalesce(new.raw_user_meta_data->>'mode', 'earner');
        rc text := upper(coalesce(new.raw_user_meta_data->>'ref_code', ''));
        dn text := coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1));
        ref_id uuid;
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
    end if;
  end if;
  insert into email_outbox(to_email, template, data)
  values (new.email, 'welcome', jsonb_build_object('name', dn, 'mode', m));
  return new;
end; $$;
