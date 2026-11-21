BEGIN;
ALTER TABLE public.notification_messages ADD COLUMN IF NOT EXISTS tip_slot text CHECK(tip_slot IS NULL OR tip_slot IN ('morning','noon','afternoon','evening','night'));
UPDATE public.notification_messages SET tip_slot='morning' WHERE kind='tip' AND tip_slot IS NULL;
-- Historical inbox content is suppressed only on first installation.
DO $migration$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notification_messages' AND column_name='dispatched_at') THEN
  ALTER TABLE public.notification_messages ADD COLUMN dispatched_at timestamptz;
  UPDATE public.notification_messages SET dispatched_at=now() WHERE starts_at<now();
 END IF;
END $migration$;
CREATE TABLE IF NOT EXISTS public.notification_push_claims(
 message_id uuid NOT NULL REFERENCES public.notification_messages(id) ON DELETE CASCADE,
 device_id uuid NOT NULL REFERENCES public.push_devices(id) ON DELETE CASCADE,
 claimed_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(message_id,device_id)
);
ALTER TABLE public.notification_push_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_push_claims FROM anon,authenticated;
CREATE OR REPLACE FUNCTION public.claim_message_push_devices(_message_id uuid)
RETURNS TABLE(id uuid,token text) LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 WITH candidates AS (
 SELECT d.id,d.token FROM public.push_devices d
 WHERE d.enabled AND NOT EXISTS(SELECT 1 FROM public.notification_push_claims c WHERE c.device_id=d.id AND c.message_id=_message_id)
 AND EXISTS(SELECT 1 FROM public.notification_messages m WHERE m.id=_message_id AND m.published AND m.starts_at<=now() AND (m.expires_at IS NULL OR m.expires_at>now()))
 ORDER BY d.updated_at LIMIT 100 FOR UPDATE OF d SKIP LOCKED
 ),claimed AS (
 INSERT INTO public.notification_push_claims(message_id,device_id) SELECT _message_id,c.id FROM candidates c
 ON CONFLICT DO NOTHING RETURNING device_id
 ) SELECT c.id,c.token FROM candidates c JOIN claimed r ON r.device_id=c.id;
$$;
REVOKE ALL ON FUNCTION public.claim_message_push_devices(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_message_push_devices(uuid) TO service_role;
CREATE INDEX IF NOT EXISTS notification_dispatch_queue ON public.notification_messages(starts_at) WHERE published AND dispatched_at IS NULL;
COMMIT;
