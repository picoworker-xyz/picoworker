-- ============================================================================
-- PicoWorker — full detail for one user (admin only). One call returns the
-- profile, login info, wallet, device/IP + fraud signals, activity counts,
-- and recent completions / deposits / withdrawals / referrals.
-- ============================================================================
create or replace function admin_user_detail(p_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare result json;
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  select json_build_object(
    'profile', (select row_to_json(x) from (
        select p.id, u.email, u.last_sign_in_at, u.email_confirmed_at, u.created_at as signed_up,
               p.display_name, p.business_name, p.mode, p.level, p.member_since,
               p.identity_verified, p.kyc_status, p.is_admin, p.referral_code, p.referred_by,
               p.streak_days, p.last_bonus_date, p.tasks_done, p.device_hash, p.signup_ip, p.last_active
        from profiles p left join auth.users u on u.id = p.id where p.id = p_id) x),
    'referred_by_name', (select display_name from profiles where id = (select referred_by from profiles where id = p_id)),
    'wallet', (select row_to_json(w) from (
        select earner_balance, business_escrow, lifetime_earned from wallets where profile_id = p_id) w),
    'deposit_address', (select address from deposit_wallets where profile_id = p_id),
    'shared_device', greatest(0, (select count(*) - 1 from profiles where device_hash is not null
        and device_hash = (select device_hash from profiles where id = p_id))),
    'shared_ip', greatest(0, (select count(*) - 1 from profiles where signup_ip is not null
        and signup_ip = (select signup_ip from profiles where id = p_id))),
    'counts', json_build_object(
        'completions', (select count(*) from task_completions where earner_id = p_id),
        'approved',    (select count(*) from task_completions where earner_id = p_id and status in ('approved','verified')),
        'pending',     (select count(*) from task_completions where earner_id = p_id and status = 'pending_proof'),
        'deposits',    (select count(*) from deposits where profile_id = p_id),
        'withdrawals', (select count(*) from withdrawals where profile_id = p_id),
        'referred',    (select count(*) from referrals where referrer_id = p_id),
        'ref_earnings',(select coalesce(sum(earnings), 0) from referrals where referrer_id = p_id)),
    'recent_completions', (select coalesce(json_agg(c), '[]'::json) from (
        select t.title, tc.status, tc.reward, tc.created_at
        from task_completions tc left join tasks t on t.id = tc.task_id
        where tc.earner_id = p_id order by tc.created_at desc limit 15) c),
    'deposits', (select coalesce(json_agg(d), '[]'::json) from (
        select amount, signature, status, created_at from deposits where profile_id = p_id
        order by created_at desc limit 15) d),
    'withdrawals', (select coalesce(json_agg(wd), '[]'::json) from (
        select amount, address, status, signature, created_at from withdrawals where profile_id = p_id
        order by created_at desc limit 15) wd),
    'referrals', (select coalesce(json_agg(r), '[]'::json) from (
        select rp.display_name, rf.status, rf.earnings, rf.tasks
        from referrals rf left join profiles rp on rp.id = rf.referred_id
        where rf.referrer_id = p_id) r)
  ) into result;
  return result;
end; $$;
