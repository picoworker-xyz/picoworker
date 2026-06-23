-- ============================================================================
-- PicoWorker — Solana custodial USDC deposits (run AFTER schema.sql)
--
-- Each user gets a unique Solana deposit address, DERIVED from one master seed
-- (HD wallet) held only as an Edge Function secret. No private keys are stored
-- here — only the derivation index + public address.
-- ============================================================================

-- Per-user deposit address (derivation index → address)
create table if not exists deposit_wallets (
  profile_id       uuid primary key references profiles(id) on delete cascade,
  derivation_index int  not null unique,
  address          text not null unique,
  created_at       timestamptz not null default now()
);

-- On-chain deposits we've detected + credited (signature = idempotency key)
create table if not exists deposits (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  signature   text not null unique,
  amount      numeric(18,6) not null,
  status      text not null default 'confirmed' check (status in ('confirmed','failed')),
  created_at  timestamptz not null default now()
);

alter table deposit_wallets enable row level security;
alter table deposits        enable row level security;

-- Users may read their own address + deposit history; only the service role
-- (Edge Functions) can insert. No private keys are ever exposed.
create policy "deposit_wallets self" on deposit_wallets for select using (profile_id = auth.uid());
create policy "deposits self"        on deposits        for select using (profile_id = auth.uid());

-- Atomic, idempotent credit: skips if the signature was already processed.
create or replace function credit_deposit(p_profile uuid, p_amount numeric, p_sig text)
returns numeric language plpgsql security definer as $$
declare bal numeric;
begin
  if exists (select 1 from deposits where signature = p_sig) then
    return (select business_escrow from wallets where profile_id = p_profile);
  end if;
  insert into deposits(profile_id, signature, amount, status) values (p_profile, p_sig, p_amount, 'confirmed');
  update wallets set business_escrow = business_escrow + p_amount
   where profile_id = p_profile returning business_escrow into bal;
  insert into ledger_entries(profile_id, amount, type, title, ref_id, balance_after)
  values (p_profile, p_amount, 'deposit', 'USDC deposit · Solana', p_sig, bal);
  return bal;
end; $$;
