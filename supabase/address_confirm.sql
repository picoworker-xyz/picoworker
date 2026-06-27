-- ============================================================================
-- PicoWorker — confirm a payout (withdrawal) address by email code. Adding or
-- changing the saved address emails a 6-digit code that must be entered to save.
-- ============================================================================
-- Allow the address_code email template in the outbox.
alter table email_outbox drop constraint if exists email_outbox_template_check;
alter table email_outbox add constraint email_outbox_template_check
  check (template = any (array['welcome','earning','task_rejected','withdrawal','deposit','address_code']));

create table if not exists payout_address_requests (
  profile_id uuid primary key references profiles(id) on delete cascade,
  address text not null,
  code text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table payout_address_requests enable row level security; -- definer-only access

-- Request a code for a new/changed payout address.
create or replace function request_payout_address(p_address text)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); code text;
begin
  if coalesce(trim(p_address), '') = '' then raise exception 'Enter a Solana address'; end if;
  code := lpad((floor(random() * 1000000))::int::text, 6, '0');
  insert into payout_address_requests(profile_id, address, code, expires_at)
  values (me, trim(p_address), code, now() + interval '15 minutes')
  on conflict (profile_id) do update
    set address = excluded.address, code = excluded.code, expires_at = excluded.expires_at, created_at = now();
  insert into email_outbox(to_email, template, data, status)
  select u.email, 'address_code', jsonb_build_object('code', code), 'queued'
  from auth.users u where u.id = me;
end; $$;

-- Confirm the code and save the address.
create or replace function confirm_payout_address(p_code text)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r payout_address_requests;
begin
  select * into r from payout_address_requests where profile_id = me;
  if r.profile_id is null then raise exception 'No address change pending'; end if;
  if r.expires_at < now() then raise exception 'Code expired, request a new one'; end if;
  if r.code <> trim(p_code) then raise exception 'Wrong code'; end if;
  update profiles set payout_wallet = r.address where id = me;
  delete from payout_address_requests where profile_id = me;
end; $$;
