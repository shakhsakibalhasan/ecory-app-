BEGIN;
-- Run the earlier health-tip migration first. Existing messages remain one-time.
ALTER TABLE public.notification_messages
 ADD COLUMN IF NOT EXISTS schedule_mode text NOT NULL DEFAULT 'once' CHECK(schedule_mode IN ('once','daily')),
 ADD COLUMN IF NOT EXISTS daily_time time,
 ADD COLUMN IF NOT EXISTS last_daily_dispatch date;
CREATE TABLE IF NOT EXISTS public.notification_occurrence_claims (
 message_id uuid NOT NULL REFERENCES public.notification_messages(id) ON DELETE CASCADE,
 device_id uuid NOT NULL REFERENCES public.push_devices(id) ON DELETE CASCADE,
 occurrence_date date NOT NULL,
 claimed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(message_id,device_id,occurrence_date)
);
ALTER TABLE public.notification_occurrence_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_occurrence_claims FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.next_due_notification_push()
RETURNS TABLE(message_id uuid,occurrence_key text,scheduled_for timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 WITH daily_candidates AS (
  SELECT m.id,((now() AT TIME ZONE 'Asia/Dhaka')::date + m.daily_time) AT TIME ZONE 'Asia/Dhaka' AS due_at
  FROM public.notification_messages m
  WHERE m.schedule_mode='daily' AND m.daily_time IS NOT NULL AND m.published
   AND m.starts_at<=now() AND (m.expires_at IS NULL OR m.expires_at>now())
   AND m.last_daily_dispatch IS DISTINCT FROM (now() AT TIME ZONE 'Asia/Dhaka')::date
 ), candidates AS (
  SELECT d.id AS message_id,to_char(d.due_at AT TIME ZONE 'Asia/Dhaka','YYYY-MM-DD') AS occurrence_key,d.due_at AS scheduled_for
  FROM daily_candidates d JOIN public.notification_messages m ON m.id=d.id
  WHERE d.due_at<=now() AND d.due_at>=now()-interval '2 hours' AND d.due_at>=m.starts_at
  UNION ALL
  SELECT m.id,'once',m.starts_at FROM public.notification_messages m
  WHERE m.schedule_mode='once' AND m.published AND m.dispatched_at IS NULL
   AND m.starts_at<=now() AND m.starts_at>=now()-interval '2 hours'
   AND (m.expires_at IS NULL OR m.expires_at>now())
 ) SELECT c.message_id,c.occurrence_key,c.scheduled_for FROM candidates c ORDER BY c.scheduled_for,c.message_id LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.next_due_notification_push() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.next_due_notification_push() TO service_role;

CREATE OR REPLACE FUNCTION public.claim_notification_occurrence_devices(_message_id uuid,_occurrence_key text)
RETURNS TABLE(id uuid,token text) LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE mode text;
BEGIN
 SELECT m.schedule_mode INTO mode FROM public.notification_messages m
 WHERE m.id=_message_id AND m.published AND m.starts_at<=now()
 AND (m.expires_at IS NULL OR m.expires_at>now());
 IF mode IS NULL THEN RETURN; END IF;
 IF mode='once' THEN
  IF _occurrence_key<>'once' THEN RETURN; END IF;
  RETURN QUERY SELECT d.id,d.token FROM public.claim_message_push_devices(_message_id) d;
  RETURN;
 END IF;
 -- Only today's Bangladesh occurrence can be claimed; admin send-now also uses this key.
 IF _occurrence_key IS DISTINCT FROM to_char(now() AT TIME ZONE 'Asia/Dhaka','YYYY-MM-DD') THEN RETURN; END IF;
 RETURN QUERY
 WITH candidates AS (
  SELECT d.id,d.token FROM public.push_devices d
  WHERE d.enabled AND NOT EXISTS (
   SELECT 1 FROM public.notification_occurrence_claims c
   WHERE c.message_id=_message_id AND c.device_id=d.id AND c.occurrence_date=(now() AT TIME ZONE 'Asia/Dhaka')::date
  ) ORDER BY d.updated_at,d.id LIMIT 100 FOR UPDATE OF d SKIP LOCKED
 ),claimed AS (
  INSERT INTO public.notification_occurrence_claims(message_id,device_id,occurrence_date)
  SELECT _message_id,c.id,(now() AT TIME ZONE 'Asia/Dhaka')::date FROM candidates c
  ON CONFLICT DO NOTHING RETURNING device_id
 ) SELECT c.id,c.token FROM candidates c JOIN claimed r ON r.device_id=c.id;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_notification_occurrence_devices(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notification_occurrence_devices(uuid,text) TO service_role;
CREATE INDEX IF NOT EXISTS notification_daily_queue ON public.notification_messages(daily_time) WHERE published AND schedule_mode='daily';
NOTIFY pgrst,'reload schema';
COMMIT;
