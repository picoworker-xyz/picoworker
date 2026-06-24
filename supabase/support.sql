-- ============================================================================
-- PicoWorker — support tickets + KYC review (run AFTER schema.sql + admin.sql).
-- Idempotent.
-- ============================================================================

-- ---- Support tickets ----
create table if not exists support_tickets (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  status     text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists support_messages (
  id         uuid primary key default gen_random_uuid(),
  ticket_id  uuid not null references support_tickets(id) on delete cascade,
  from_admin boolean not null default false,
  body       text not null,
  created_at timestamptz not null default now()
);
alter table support_tickets  enable row level security;
alter table support_messages enable row level security;

create policy "tickets self or admin" on support_tickets for select
  using (profile_id = auth.uid() or is_admin());
create policy "messages self or admin" on support_messages for select
  using (exists (select 1 from support_tickets t where t.id = ticket_id and (t.profile_id = auth.uid() or is_admin())));

-- User posts a message (opens a ticket if they have no open one).
create or replace function post_support_message(p_body text)
returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); tid uuid;
begin
  if coalesce(trim(p_body), '') = '' then raise exception 'Empty message'; end if;
  select id into tid from support_tickets where profile_id = me and status = 'open' order by created_at desc limit 1;
  if tid is null then
    insert into support_tickets(profile_id) values (me) returning id into tid;
  end if;
  insert into support_messages(ticket_id, from_admin, body) values (tid, false, p_body);
  update support_tickets set updated_at = now(), status = 'open' where id = tid;
  return tid;
end; $$;

-- Admin: list tickets with the latest message and the user's email.
create or replace function admin_tickets()
returns table (id uuid, email text, name text, status text, last_message text, messages bigint, updated_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  return query
    select t.id, u.email, p.display_name, t.status,
           (select m.body from support_messages m where m.ticket_id = t.id order by m.created_at desc limit 1),
           (select count(*) from support_messages m where m.ticket_id = t.id),
           t.updated_at
    from support_tickets t
    left join profiles p on p.id = t.profile_id
    left join auth.users u on u.id = t.profile_id
    order by t.updated_at desc;
end; $$;

create or replace function admin_ticket_messages(p_ticket uuid)
returns table (from_admin boolean, body text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  return query select m.from_admin, m.body, m.created_at from support_messages m where m.ticket_id = p_ticket order by m.created_at asc;
end; $$;

create or replace function admin_reply(p_ticket uuid, p_body text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  if coalesce(trim(p_body), '') = '' then raise exception 'Empty message'; end if;
  insert into support_messages(ticket_id, from_admin, body) values (p_ticket, true, p_body);
  update support_tickets set updated_at = now() where id = p_ticket;
end; $$;

create or replace function admin_close_ticket(p_ticket uuid, p_closed boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  update support_tickets set status = case when p_closed then 'closed' else 'open' end, updated_at = now() where id = p_ticket;
end; $$;

-- ---- KYC: submit for review, admin approves (no more instant auto-verify) ----
alter table profiles add column if not exists kyc_status text not null default 'none'
  check (kyc_status in ('none','pending','approved','rejected'));
alter table profiles add column if not exists kyc_doc_type text;

create or replace function submit_kyc(p_doc text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update profiles set kyc_status = 'pending', kyc_doc_type = p_doc where id = auth.uid();
end; $$;

create or replace function admin_kyc()
returns table (id uuid, email text, name text, kyc_status text, kyc_doc_type text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  return query select p.id, u.email, p.display_name, p.kyc_status, p.kyc_doc_type, p.created_at
  from profiles p left join auth.users u on u.id = p.id
  where p.kyc_status <> 'none'
  order by (p.kyc_status = 'pending') desc, p.created_at desc;
end; $$;

create or replace function admin_kyc_decision(p_profile uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  update profiles set kyc_status = case when p_approve then 'approved' else 'rejected' end,
                      identity_verified = p_approve
   where id = p_profile;
end; $$;
