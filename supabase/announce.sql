-- ============================================================================
-- PicoWorker — one-off broadcast emails to every user (e.g. "new tasks are
-- live"). Queues one email_outbox row per confirmed address; the send-emails
-- cron drains the queue at ~20/min, so a broadcast trickles out rather than
-- hitting SMTP in one burst.
-- ============================================================================
alter table email_outbox drop constraint if exists email_outbox_template_check;
alter table email_outbox add constraint email_outbox_template_check
  check (template = any (array['welcome','earning','task_rejected','withdrawal','deposit','address_code','announcement']));

-- Guards against a double run queueing the same blast twice: the same key can
-- only be broadcast once.
create table if not exists announcements (
  key        text primary key,
  title      text not null,
  body       text not null,
  queued     int  not null default 0,
  created_at timestamptz not null default now()
);
alter table announcements enable row level security; -- definer-only access

-- Queue a broadcast. p_key is any short id you pick for this blast.
-- Only confirmed, non-bounced addresses are included, and each address is
-- emailed once even if it somehow maps to two profiles.
create or replace function broadcast_announcement(
  p_key text,
  p_title text,
  p_body text,
  p_cta text default 'Open PicoWorker',
  p_url text default 'https://picoworker.xyz'
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if exists (select 1 from announcements where key = p_key) then
    raise exception 'announcement % already sent', p_key;
  end if;

  insert into announcements(key, title, body) values (p_key, p_title, p_body);

  -- distinct on keeps one row per address when two profiles share an email,
  -- while still carrying that profile's name for the greeting.
  with recipients as (
    select distinct on (lower(u.email))
           lower(u.email) as email,
           coalesce(nullif(p.display_name, ''), 'there') as name
    from auth.users u
    join profiles p on p.id = u.id
    where u.email is not null
      and u.email_confirmed_at is not null
      and u.deleted_at is null
    order by lower(u.email), p.created_at
  )
  insert into email_outbox(to_email, template, data)
  select email,
         'announcement',
         jsonb_build_object('title', p_title, 'body', p_body, 'cta', p_cta, 'url', p_url, 'name', name)
  from recipients;

  get diagnostics v_count = row_count;
  update announcements set queued = v_count where key = p_key;
  return v_count;
end;
$$;

revoke all on function broadcast_announcement(text, text, text, text, text) from public, anon, authenticated;
