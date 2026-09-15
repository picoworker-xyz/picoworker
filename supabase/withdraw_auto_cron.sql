-- Run by hand after replacing <SWEEP_SECRET> with the value of the SWEEP_SECRET
-- edge function secret. Schedules the hourly auto payout of held withdrawals.
-- Hourly: pay whatever is due. The secret is read by the edge function from
-- SWEEP_SECRET (same internal-cron secret solana-sweep uses). Replace
-- <SWEEP_SECRET> before running.
select cron.unschedule('withdraw-auto-pay')
 where exists (select 1 from cron.job where jobname = 'withdraw-auto-pay');
select cron.schedule('withdraw-auto-pay', '17 * * * *', $$
  select net.http_post(
    url := 'https://cgkccigqhecuxgklnqel.supabase.co/functions/v1/withdraw-auto-pay',
    headers := '{"Content-Type": "application/json", "x-sweep-secret": "<SWEEP_SECRET>"}'::jsonb,
    body := '{}'::jsonb
  );
$$);

