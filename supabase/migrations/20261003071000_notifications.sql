BEGIN;
CREATE TABLE public.notification_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title_bn text NOT NULL, title_en text NOT NULL DEFAULT '',
 body_bn text NOT NULL, body_en text NOT NULL DEFAULT '', kind text NOT NULL CHECK(kind IN ('offer','tip','message')),
 link text NOT NULL DEFAULT '' CHECK(link='' OR (link LIKE '/%' AND link NOT LIKE '//%')),
 starts_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz, published boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(expires_at IS NULL OR expires_at>starts_at)
);
ALTER TABLE public.notification_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "published notifications" ON public.notification_messages FOR SELECT TO anon,authenticated USING(published AND starts_at<=now() AND (expires_at IS NULL OR expires_at>now()));
CREATE POLICY "admin notifications" ON public.notification_messages FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
GRANT SELECT ON public.notification_messages TO anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.notification_messages TO authenticated;
CREATE TABLE public.notification_settings(id int PRIMARY KEY CHECK(id=1),daily_enabled boolean NOT NULL DEFAULT false);
INSERT INTO public.notification_settings VALUES(1,false);
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin notification settings" ON public.notification_settings FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
GRANT SELECT,UPDATE ON public.notification_settings TO authenticated;
CREATE TABLE public.push_devices(id uuid PRIMARY KEY,secret_hash text NOT NULL,token text NOT NULL UNIQUE,enabled boolean NOT NULL DEFAULT true,last_attempt_date date,updated_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.push_devices ENABLE ROW LEVEL SECURITY;
-- No client may read registration tokens or write devices directly.
REVOKE ALL ON public.push_devices FROM anon,authenticated;
CREATE OR REPLACE FUNCTION public.register_push_device(_id uuid,_secret text,_token text,_enabled boolean DEFAULT true) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE h text;
BEGIN
 IF length(_secret)<64 OR length(_secret)>200 OR length(_token)<30 OR length(_token)>4096 THEN RAISE EXCEPTION 'Invalid registration'; END IF;
 h=encode(sha256(convert_to(_secret,'UTF8')),'hex');
 INSERT INTO public.push_devices(id,secret_hash,token,enabled) VALUES(_id,h,_token,_enabled)
 ON CONFLICT(id) DO UPDATE SET token=excluded.token,enabled=excluded.enabled,updated_at=now() WHERE public.push_devices.secret_hash=h;
 IF NOT FOUND THEN RAISE EXCEPTION 'Device ownership mismatch'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.register_push_device(uuid,text,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_push_device(uuid,text,text,boolean) TO anon,authenticated;
CREATE OR REPLACE FUNCTION public.claim_daily_push_devices() RETURNS TABLE(id uuid,token text) LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 WITH candidates AS (SELECT d.id FROM public.push_devices d
 WHERE d.enabled AND (d.last_attempt_date IS NULL OR d.last_attempt_date<(now() AT TIME ZONE 'Asia/Dhaka')::date)
 ORDER BY d.updated_at LIMIT 100 FOR UPDATE SKIP LOCKED)
 UPDATE public.push_devices d SET last_attempt_date=(now() AT TIME ZONE 'Asia/Dhaka')::date
 FROM candidates c WHERE d.id=c.id RETURNING d.id,d.token;
$$;
REVOKE ALL ON FUNCTION public.claim_daily_push_devices() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_daily_push_devices() TO service_role;
CREATE TABLE public.notification_delivery_log(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),device_id uuid REFERENCES public.push_devices(id) ON DELETE SET NULL,message_id uuid REFERENCES public.notification_messages(id) ON DELETE SET NULL,sent_at timestamptz NOT NULL DEFAULT now(),status text NOT NULL,error text NOT NULL DEFAULT '');
ALTER TABLE public.notification_delivery_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin notification logs" ON public.notification_delivery_log FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
GRANT SELECT ON public.notification_delivery_log TO authenticated;
COMMIT;
