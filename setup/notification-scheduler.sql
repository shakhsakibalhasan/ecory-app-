-- Run AFTER the migration and Edge Function deployment.
-- In Supabase Vault create secret ecory_notification_cron_secret using the SAME
-- value as the Edge Function's NOTIFICATION_CRON_SECRET. Never put it in GitHub.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM vault.decrypted_secrets WHERE name='ecory_notification_cron_secret' AND length(decrypted_secret)>=32) THEN
  RAISE EXCEPTION 'Create Vault ecory_notification_cron_secret first (same value as Edge Function NOTIFICATION_CRON_SECRET, at least 32 characters).';
 END IF;
END $$;
SELECT cron.schedule('ecory-notification-queue','* * * * *', $job$
 SELECT net.http_post(
  url:='https://jlpdhyoxjuzxrhtkuwuu.supabase.co/functions/v1/daily-notifications',
  headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',
   (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='ecory_notification_cron_secret')),
  body:='{}'::jsonb,timeout_milliseconds:=55000
 );
$job$);
-- Verify without revealing any secret:
SELECT jobname,schedule,active FROM cron.job WHERE jobname='ecory-notification-queue';
