# PicoWorker

A two-sided micro-task marketplace — do tiny tasks (follow, watch, test, survey), get paid
in USDC. Mobile-first React app implementing all 17 screens of the PicoWorker design.

## Stack

- **Vite + React + TypeScript**
- **Tailwind CSS v4** + design tokens (`src/index.css`)
- **React Router** — every screen is a route
- **Supabase** (Postgres + Auth + Storage) as the production backend
- Simulated USDC balances with a swappable **payout seam** (`src/lib/payments.ts`) ready for
  real Solana/Polygon USDC later.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build
```

### Demo accounts (no signup needed)

On the login screen tap **Try a demo account → Earner** or **Business**, or sign in with:

| Role     | Email            | Password   |
|----------|------------------|------------|
| Earner   | arman@demo.xyz   | `password` |
| Business | acme@demo.xyz    | `password` |

You can also create a fresh account with email/password (earners get a $0.05 welcome bonus).

## How data is stored

Out of the box the app runs on a **local persistent store** (`src/lib/store.tsx`, backed by
`localStorage`) so the whole marketplace loop works with zero setup. Every method maps 1:1 to
a Supabase call.

### Switching to Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run `supabase/schema.sql` in the SQL editor (tables, RLS, the `complete_task` RPC, and a
   new-user trigger that creates the profile + wallet).
3. Create a public Storage bucket named `proofs` (for screenshot uploads).
4. Copy `.env.example` → `.env.local` and fill in `VITE_SUPABASE_URL` /
   `VITE_SUPABASE_ANON_KEY`. The app detects these automatically (`src/lib/supabase.ts`).

## The marketplace loop

1. **Business** adds funds → escrow balance rises.
2. **Business** creates a task and funds it → the budget is held in escrow and the task goes
   live in the earner feed.
3. **Earner** completes the task:
   - *Auto-verify* tasks pay instantly — escrow releases from the business, the earner's
     balance and the campaign's completion count both move (one atomic transaction;
     `complete_task` RPC in Supabase).
   - *Manual* tasks (e.g. Play Store review) go to **Submit proof** → uploaded to Storage →
     `pending_proof` until approved.
4. **Earner** cashes out via **Withdraw** → simulated USDC payout (`submitWithdrawal`).

## Project structure

```
src/
  lib/          types · format · supabase client · payments seam · store
  components/   PhoneFrame · StatusBar · TabBar · ui primitives · blocks · icons
  features/
    auth/       Login · Onboarding
    earner/     EarnFeed · TaskFlow · TaskComplete · ProofUpload · Wallet · CashOut · Refer · Rewards · Profile
    business/   SwitchAccount · Dashboard · CreateTask · FundLaunch · CampaignAnalytics · AddFunds
  data/         seed.ts (demo data)
supabase/
  schema.sql    Postgres schema + RLS + complete_task RPC + new-user trigger
```
