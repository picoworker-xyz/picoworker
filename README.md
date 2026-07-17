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

## AdGem postbacks

AdGem rewarded conversions are received by the public `adgem-postback` Edge Function. The
function verifies AdGem's v2 HMAC, validates the player/reward, and calls a service-role-only
database function that atomically records the conversion and credits the earner wallet.

1. Run `supabase/adgem.sql` in the Supabase SQL editor.
2. Copy the one-time **Postback Key** from AdGem, then configure the function secrets:

   ```bash
   supabase secrets set ADGEM_POSTBACK_KEY='your-postback-key' \
     ADGEM_PUBLIC_URL='https://picoworker.xyz/api/adgem/postback' \
     ADGEM_MAX_REWARD='1000'
   ```

3. Deploy without Supabase JWT verification (AdGem authenticates with its HMAC instead):

   ```bash
   supabase functions deploy adgem-postback --no-verify-jwt
   ```

4. Enable AdGem v2 Server Postback hashing and enter this alphabetized GET URL:

   ```text
   https://picoworker.xyz/api/adgem/postback?amount={amount}&campaign_id={campaign_id}&goal_id={goal_id}&goal_name={goal_name}&offer_name={offer_name}&payout={payout}&player_id={player_id}&transaction_id={transaction_id}
   ```

The `player_id` sent when opening AdGem must be the signed-in user's Supabase Auth UUID. AdGem
v2 appends `request_id` and `verifier`; both are required by the receiver. Keep
`ADGEM_MAX_REWARD` at or just above the largest reward configured in the AdGem dashboard.

## Paymentwall Offerwall

The authenticated `/offers/paymentwall` page requests a per-user, signature-v3 Offerwall URL
from `paymentwall-widget`. Paymentwall completions call the public `paymentwall-pingback`
function, which verifies the signature and atomically credits or reverses the wallet through
`supabase/paymentwall.sql`. Repeated references are idempotent. Sandbox events are recorded but
never create withdrawable balance.

1. Run `supabase/paymentwall.sql` in the Supabase SQL editor.
2. Configure the Project Key, Secret Key, Offerwall widget code, and the USD value of one
   Paymentwall virtual-currency unit:

   ```bash
   supabase secrets set \
     PAYMENTWALL_PROJECT_KEY='your-project-key' \
     PAYMENTWALL_SECRET_KEY='your-secret-key' \
     PAYMENTWALL_WIDGET_CODE='mw1_or_dashboard_widget_code' \
     PAYMENTWALL_USD_PER_CREDIT='0.01' \
     PAYMENTWALL_MAX_REWARD='1000' \
     PAYMENTWALL_EVALUATION='true'
   ```

   `PAYMENTWALL_USD_PER_CREDIT` is an accounting decision, not a default. It must match the
   virtual-currency conversion configured in Paymentwall. Set `PAYMENTWALL_EVALUATION=false`
   when the project becomes live.

3. Deploy the authenticated widget generator and public pingback receiver:

   ```bash
   supabase functions deploy paymentwall-widget
   supabase functions deploy paymentwall-pingback --no-verify-jwt
   ```

4. In Paymentwall Project Settings, select **Virtual Currency API**, set Pingback Signature
   Version to **3**, and use:

   ```text
   https://picoworker.xyz/api/paymentwall/pingback
   ```

5. For Paymentwall's technical-review checklist, use:

   ```text
   https://picoworker.xyz/offers/paymentwall
   ```

   Supply a dedicated earner test account. The site deployment must include the
   `/api/paymentwall/pingback` Netlify proxy before running Paymentwall's test pingbacks.

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
