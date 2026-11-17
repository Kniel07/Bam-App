-- notifications.cron.example.sql — TEMPLATE (CR-04). Run once per environment in
-- the Supabase SQL editor AFTER migration 0010 and after deploying the `notify`
-- Edge Function with "Verify JWT" turned OFF (the function is safe to call:
-- it only delivers events that are due, exactly once).
-- Replace <PROJECT_REF>. Do not save the filled-in copy in this repository.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Every minute: ask the Edge Function to deliver anything that became due.
select cron.schedule(
  'notify-every-minute',
  '* * * * *',
  $$
    select net.http_post(
      url := 'https://<PROJECT_REF>.supabase.co/functions/v1/notify',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    );
  $$
);

-- Check it is scheduled (expect one row):
select jobname, schedule, active from cron.job;

-- Later, to stop it:  select cron.unschedule('notify-every-minute');
