-- An unconfirmed account is not a usable account. Offering to sign into one is
-- a dead end: the person cannot receive its email, which is usually why they
-- are signing up again — they mistyped the address the first time. Counting it
-- left them permanently locked out, with the hint pointing at a mailbox that
-- does not exist. Only confirmed accounts are real enough to redirect someone to.
create or replace function public.device_account_hint(p_device_hash text)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare e text; local text;
begin
  if p_device_hash is null or length(p_device_hash) < 8 then return null; end if;
  select u.email into e
  from profiles p join auth.users u on u.id = p.id
  where p.device_hash = p_device_hash
    and u.email_confirmed_at is not null
  order by p.created_at asc
  limit 1;
  if e is null then return null; end if;
  local := split_part(e, '@', 1);
  return left(local, 1) || '•••' || right(local, 1) || '@' || split_part(e, '@', 2);
end; $function$;

notify pgrst, 'reload schema';
