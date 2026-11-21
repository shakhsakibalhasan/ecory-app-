BEGIN;
ALTER TABLE public.app_ui_settings ADD COLUMN IF NOT EXISTS admin_names jsonb NOT NULL DEFAULT '{}',ADD COLUMN IF NOT EXISTS entry_offer jsonb NOT NULL DEFAULT '{"enabled":false}';
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS certification text NOT NULL DEFAULT '',ADD COLUMN IF NOT EXISTS certification_en text NOT NULL DEFAULT '',ADD COLUMN IF NOT EXISTS certification_image text NOT NULL DEFAULT '',ADD COLUMN IF NOT EXISTS training_bn text NOT NULL DEFAULT '',ADD COLUMN IF NOT EXISTS training_en text NOT NULL DEFAULT '',ADD COLUMN IF NOT EXISTS services_bn text NOT NULL DEFAULT '',ADD COLUMN IF NOT EXISTS services_en text NOT NULL DEFAULT '',ADD COLUMN IF NOT EXISTS languages_bn text NOT NULL DEFAULT '',ADD COLUMN IF NOT EXISTS languages_en text NOT NULL DEFAULT '';
ALTER TABLE public.doctor_bookings ALTER COLUMN preferred_date DROP NOT NULL,ALTER COLUMN preferred_time DROP NOT NULL;
ALTER TABLE public.doctor_booking_events ALTER COLUMN appointment_date DROP NOT NULL,ALTER COLUMN appointment_time DROP NOT NULL;
ALTER TABLE public.doctor_bookings ADD COLUMN IF NOT EXISTS serial_number text NOT NULL DEFAULT '',ADD COLUMN IF NOT EXISTS sms_note text NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS public.doctor_booking_intents(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES auth.users(id),doctor_id uuid NOT NULL REFERENCES public.doctors(id),patient jsonb NOT NULL,consultation_mode text NOT NULL CHECK(consultation_mode IN('phone','in_person')),amount integer NOT NULL CHECK(amount>=0),booking_id uuid UNIQUE REFERENCES public.doctor_bookings(id),created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.doctor_booking_intents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.doctor_booking_intents FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.doctor_booking_intents TO service_role;
DROP POLICY IF EXISTS "own booking intent read" ON public.doctor_booking_intents;
CREATE POLICY "own booking intent read" ON public.doctor_booking_intents FOR SELECT TO authenticated USING(user_id=auth.uid());
GRANT SELECT ON public.doctor_booking_intents TO authenticated;
CREATE TABLE IF NOT EXISTS public.doctor_payment_sessions(id uuid PRIMARY KEY,intent_id uuid NOT NULL UNIQUE REFERENCES public.doctor_booking_intents(id),transaction_id text NOT NULL UNIQUE,method text NOT NULL CHECK(method IN('bkash','online','nagad')),amount integer NOT NULL CHECK(amount>0),status text NOT NULL DEFAULT 'creating',gateway_url text,provider_session text,paid_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.doctor_payment_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.doctor_payment_sessions FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.doctor_payment_sessions TO service_role;
CREATE OR REPLACE FUNCTION public.prepare_doctor_checkout(p_id uuid,p_doctor uuid,p_mode text,p_patient jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d public.doctors;i public.doctor_booking_intents;f integer;b uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first';END IF;
 SELECT * INTO i FROM public.doctor_booking_intents WHERE id=p_id;
 IF FOUND THEN IF i.user_id<>auth.uid() THEN RAISE EXCEPTION 'Access denied';END IF;RETURN jsonb_build_object('intent_id',i.id,'booking_id',i.booking_id,'amount',i.amount);END IF;
 IF p_mode IS NULL OR p_mode NOT IN('phone','in_person') THEN RAISE EXCEPTION 'Invalid mode';END IF;
 SELECT * INTO d FROM public.doctors WHERE id=p_doctor;IF NOT FOUND THEN RAISE EXCEPTION 'Doctor unavailable';END IF;
 f:=CASE WHEN p_mode='phone' THEN CASE WHEN d.consultation_free THEN 0 ELSE d.consultation_fee END ELSE CASE WHEN d.in_person_free THEN 0 ELSE d.in_person_fee END END;
 IF f IS NULL THEN RAISE EXCEPTION 'Fee not configured';END IF;
 IF length(trim(coalesce(p_patient->>'name',''))) NOT BETWEEN 2 AND 100 OR coalesce(p_patient->>'phone','') !~ '^01[0-9]{9}$' OR length(trim(coalesce(p_patient->>'address',''))) NOT BETWEEN 5 AND 1000 OR length(coalesce(p_patient->>'concern',''))>2000 THEN RAISE EXCEPTION 'Check patient details';END IF;
 IF nullif(p_patient->>'age','') IS NOT NULL AND (p_patient->>'age')::integer NOT BETWEEN 0 AND 120 THEN RAISE EXCEPTION 'Check age';END IF;
 INSERT INTO public.doctor_booking_intents(id,user_id,doctor_id,patient,consultation_mode,amount) VALUES(p_id,auth.uid(),d.id,p_patient,p_mode,f);
 IF f=0 THEN
 INSERT INTO public.doctor_bookings(id,user_id,doctor_id,patient_name,phone,patient_age,concern,preferred_date,preferred_time,fee,payment_status,address,consultation_mode)
 VALUES(p_id,auth.uid(),d.id,trim(p_patient->>'name'),p_patient->>'phone',nullif(p_patient->>'age','')::integer,coalesce(p_patient->>'concern',''),NULL,NULL,0,'free',trim(p_patient->>'address'),p_mode) RETURNING id INTO b;
 UPDATE public.doctor_booking_intents SET booking_id=b WHERE id=p_id;
 END IF;
 RETURN jsonb_build_object('intent_id',p_id,'booking_id',b,'amount',f);
END $$;
REVOKE ALL ON FUNCTION public.prepare_doctor_checkout(uuid,uuid,text,jsonb) FROM PUBLIC,anon;GRANT EXECUTE ON FUNCTION public.prepare_doctor_checkout(uuid,uuid,text,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.complete_doctor_gateway_payment(_session_id uuid,_transaction_id text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.doctor_payment_sessions;i public.doctor_booking_intents;b uuid;
BEGIN
 SELECT * INTO s FROM public.doctor_payment_sessions WHERE id=_session_id FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'Unknown payment';END IF;
 SELECT * INTO i FROM public.doctor_booking_intents WHERE id=s.intent_id FOR UPDATE;
 IF s.status='paid' THEN RETURN i.booking_id;END IF;
 IF s.amount<>i.amount OR i.booking_id IS NOT NULL THEN RAISE EXCEPTION 'Payment requires review';END IF;
 INSERT INTO public.doctor_bookings(id,user_id,doctor_id,patient_name,phone,patient_age,concern,preferred_date,preferred_time,fee,payment_status,address,consultation_mode)
 VALUES(i.id,i.user_id,i.doctor_id,trim(i.patient->>'name'),i.patient->>'phone',nullif(i.patient->>'age','')::integer,coalesce(i.patient->>'concern',''),NULL,NULL,i.amount,'paid',trim(i.patient->>'address'),i.consultation_mode) RETURNING id INTO b;
 UPDATE public.doctor_booking_intents SET booking_id=b WHERE id=i.id;
 UPDATE public.doctor_payment_sessions SET status='paid',paid_at=now() WHERE id=s.id;
 RETURN b;
END $$;
REVOKE ALL ON FUNCTION public.complete_doctor_gateway_payment(uuid,text) FROM PUBLIC,anon,authenticated;GRANT EXECUTE ON FUNCTION public.complete_doctor_gateway_payment(uuid,text) TO service_role;
-- Disable old customer booking entry points: paid booking creation must follow verified checkout.
REVOKE EXECUTE ON FUNCTION public.request_doctor_booking_mode(uuid,text,text,integer,text,date,time,text,text) FROM authenticated,anon,PUBLIC;
REVOKE EXECUTE ON FUNCTION public.request_doctor_booking(uuid,text,text,integer,text,date,time,text) FROM authenticated,anon,PUBLIC;
REVOKE EXECUTE ON FUNCTION public.request_doctor_booking(uuid,text,text,integer,text,date,time) FROM authenticated,anon,PUBLIC;
CREATE OR REPLACE FUNCTION public.doctor_call_access(_doctor uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE phone text;BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in and book';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.doctor_bookings b WHERE b.user_id=auth.uid() AND b.doctor_id=_doctor AND b.consultation_mode='phone' AND b.status IN('requested','confirmed') AND b.payment_status IN('paid','free')) THEN RAISE EXCEPTION 'Book and pay before calling';END IF;
 SELECT d.phone INTO phone FROM public.doctors d WHERE d.id=_doctor;RETURN phone;
END $$;
REVOKE ALL ON FUNCTION public.doctor_call_access(uuid) FROM PUBLIC,anon;GRANT EXECUTE ON FUNCTION public.doctor_call_access(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.guard_doctor_confirmation() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NEW.status IN('confirmed','completed') AND (NEW.preferred_date IS NULL OR NEW.preferred_time IS NULL) THEN RAISE EXCEPTION 'Set appointment date and time before confirming';END IF;
 IF NEW.status IN('confirmed','completed') AND coalesce(NEW.fee,0)>0 AND NEW.payment_status<>'paid' THEN RAISE EXCEPTION 'Verify payment before confirming';END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS ecory_guard_doctor_confirmation ON public.doctor_bookings;
CREATE TRIGGER ecory_guard_doctor_confirmation BEFORE INSERT OR UPDATE ON public.doctor_bookings FOR EACH ROW EXECUTE FUNCTION public.guard_doctor_confirmation();
CREATE OR REPLACE FUNCTION public.cancel_doctor_booking(p_booking uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first';END IF;
 UPDATE public.doctor_bookings SET status='cancelled' WHERE id=p_booking AND user_id=auth.uid() AND status IN('requested','confirmed') AND (preferred_date IS NULL OR preferred_time IS NULL OR preferred_date+preferred_time>now() AT TIME ZONE 'Asia/Dhaka');
 IF NOT FOUND THEN RAISE EXCEPTION 'Cannot cancel this booking';END IF;RETURN true;
END $$;
CREATE OR REPLACE FUNCTION public.record_doctor_serial_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.serial_number IS DISTINCT FROM OLD.serial_number AND NEW.status IS NOT DISTINCT FROM OLD.status AND NEW.preferred_date IS NOT DISTINCT FROM OLD.preferred_date AND NEW.preferred_time IS NOT DISTINCT FROM OLD.preferred_time AND NEW.admin_note IS NOT DISTINCT FROM OLD.admin_note THEN
 INSERT INTO public.doctor_booking_events(booking_id,kind,status,payment_status,note,appointment_date,appointment_time) VALUES(NEW.id,'note',NEW.status,NEW.payment_status,'Serial: '||NEW.serial_number,NEW.preferred_date,NEW.preferred_time);
 END IF;RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS ecory_doctor_serial_change ON public.doctor_bookings;
CREATE TRIGGER ecory_doctor_serial_change AFTER UPDATE ON public.doctor_bookings FOR EACH ROW EXECUTE FUNCTION public.record_doctor_serial_change();
-- Communication settings and private queue. No API secrets or tracking tokens are exposed in admin logs.
CREATE TABLE IF NOT EXISTS public.customer_communication_settings(id integer PRIMARY KEY CHECK(id=1),sms_enabled boolean NOT NULL DEFAULT false,app_origin text NOT NULL DEFAULT 'https://ecory.app' CHECK(app_origin='https://ecory.app'));
INSERT INTO public.customer_communication_settings(id) VALUES(1) ON CONFLICT DO NOTHING;
ALTER TABLE public.customer_communication_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin communication settings" ON public.customer_communication_settings;
CREATE POLICY "admin communication settings" ON public.customer_communication_settings FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
GRANT SELECT,UPDATE ON public.customer_communication_settings TO authenticated;GRANT ALL ON public.customer_communication_settings TO service_role;
CREATE TABLE IF NOT EXISTS public.customer_sms_queue(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),dedupe_key text NOT NULL UNIQUE,order_id uuid REFERENCES public.orders(id),booking_id uuid REFERENCES public.doctor_bookings(id),phone text NOT NULL,body text NOT NULL,status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','sending','accepted','failed','unknown')),error text NOT NULL DEFAULT '',created_at timestamptz NOT NULL DEFAULT now(),sent_at timestamptz,attempted_at timestamptz);
ALTER TABLE public.customer_sms_queue ADD COLUMN IF NOT EXISTS attempted_at timestamptz;
ALTER TABLE public.customer_sms_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.customer_sms_queue FROM PUBLIC,anon,authenticated;GRANT ALL ON public.customer_sms_queue TO service_role;
CREATE OR REPLACE VIEW public.customer_sms_admin_log WITH(security_invoker=true) AS SELECT id,dedupe_key,status,error,created_at,sent_at FROM public.customer_sms_queue;
DROP POLICY IF EXISTS "admin sms logs" ON public.customer_sms_queue;
CREATE POLICY "admin sms logs" ON public.customer_sms_queue FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
GRANT SELECT(id,dedupe_key,status,error,created_at,sent_at) ON public.customer_sms_queue TO authenticated;GRANT SELECT ON public.customer_sms_admin_log TO authenticated;
CREATE TABLE IF NOT EXISTS public.order_tracking_tokens(order_id uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,token_hash text NOT NULL UNIQUE,expires_at timestamptz NOT NULL DEFAULT now()+interval '120 days');
ALTER TABLE public.order_tracking_tokens ENABLE ROW LEVEL SECURITY;REVOKE ALL ON public.order_tracking_tokens FROM PUBLIC,anon,authenticated;GRANT ALL ON public.order_tracking_tokens TO service_role;
CREATE OR REPLACE FUNCTION public.track_order_token(_code text,_token text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.orders;BEGIN
 IF length(coalesce(_token,''))<>64 THEN RETURN NULL;END IF;
 SELECT x.* INTO o FROM public.orders x JOIN public.order_tracking_tokens t ON t.order_id=x.id WHERE x.code=upper(trim(_code)) AND t.token_hash=encode(sha256(convert_to(_token,'UTF8')),'hex') AND t.expires_at>now();
 IF NOT FOUND THEN RETURN NULL;END IF;
 RETURN public.track_order_details(o.code,o.phone);
END $$;
REVOKE ALL ON FUNCTION public.track_order_token(text,text) FROM PUBLIC;GRANT EXECUTE ON FUNCTION public.track_order_token(text,text) TO anon,authenticated;
CREATE OR REPLACE FUNCTION public.queue_order_customer_sms() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.orders;raw text;items text;origin text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.customer_communication_settings WHERE id=1 AND sms_enabled) THEN RETURN NULL;END IF;
 SELECT * INTO o FROM public.orders WHERE id=NEW.id;IF NOT FOUND THEN RETURN NULL;END IF;
 raw:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
 INSERT INTO public.order_tracking_tokens(order_id,token_hash) VALUES(o.id,encode(sha256(convert_to(raw,'UTF8')),'hex')) ON CONFLICT DO NOTHING;
 SELECT string_agg(coalesce(nullif(p.name_en,''),'Ecory product')||' x'||coalesce(j->>'qty','1')||' @ BDT '||coalesce(j->>'price','0'),'; ') INTO items FROM jsonb_array_elements(o.items) j LEFT JOIN public.products p ON p.id::text=j->>'id';
 SELECT app_origin INTO origin FROM public.customer_communication_settings WHERE id=1;
 INSERT INTO public.customer_sms_queue(dedupe_key,order_id,phone,body) VALUES('order:'||o.id,o.id,o.phone,'Ecory order '||o.code||' received. Items: '||coalesce(items,'Ecory offer')||'. Total BDT '||o.total||' (delivery '||o.delivery_fee||'). Payment: '||o.payment_method||'. Track: '||origin||'/track?code='||o.code||'&token='||raw) ON CONFLICT DO NOTHING;
 RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS ecory_order_customer_sms ON public.orders;
CREATE CONSTRAINT TRIGGER ecory_order_customer_sms AFTER INSERT ON public.orders DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.queue_order_customer_sms();
CREATE OR REPLACE FUNCTION public.queue_booking_customer_sms() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE name text;msg text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.customer_communication_settings WHERE id=1 AND sms_enabled) THEN RETURN NEW;END IF;
 IF NEW.status IS NOT DISTINCT FROM OLD.status AND NEW.preferred_date IS NOT DISTINCT FROM OLD.preferred_date AND NEW.preferred_time IS NOT DISTINCT FROM OLD.preferred_time AND NEW.serial_number IS NOT DISTINCT FROM OLD.serial_number AND NEW.admin_note IS NOT DISTINCT FROM OLD.admin_note AND NEW.sms_note IS NOT DISTINCT FROM OLD.sms_note THEN RETURN NEW;END IF;
 SELECT coalesce(nullif(d.name_en,''),'Ecory doctor') INTO name FROM public.doctors d WHERE d.id=NEW.doctor_id;
 msg:='Ecory appointment '||NEW.status||'. Doctor: '||name||'. Serial: '||coalesce(nullif(NEW.serial_number,''),'To be assigned')||'. Date: '||coalesce(NEW.preferred_date::text,'Pending')||'. Time: '||coalesce(to_char(NEW.preferred_time,'HH12:MI AM'),'Pending')||'. '||coalesce(NEW.sms_note,'')||' Details: https://ecory.app/doctor-booking/'||NEW.id;
 INSERT INTO public.customer_sms_queue(dedupe_key,booking_id,phone,body) VALUES('booking:'||NEW.id||':'||gen_random_uuid(),NEW.id,NEW.phone,msg);
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS ecory_booking_customer_sms ON public.doctor_bookings;
CREATE TRIGGER ecory_booking_customer_sms AFTER UPDATE ON public.doctor_bookings FOR EACH ROW EXECUTE FUNCTION public.queue_booking_customer_sms();
CREATE OR REPLACE FUNCTION public.claim_customer_sms(_order uuid DEFAULT NULL) RETURNS SETOF public.customer_sms_queue LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 WITH interrupted AS(UPDATE public.customer_sms_queue SET status='unknown',error='Worker interrupted; verify provider before retrying' WHERE status='sending' AND coalesce(attempted_at,created_at)<now()-interval '15 minutes' RETURNING id), c AS(SELECT q.id FROM public.customer_sms_queue q WHERE q.status='pending' AND q.created_at>now()-interval '1 day' AND (_order IS NULL OR q.order_id=_order) ORDER BY q.created_at LIMIT 4 FOR UPDATE SKIP LOCKED)
 UPDATE public.customer_sms_queue q SET status='sending',attempted_at=now() FROM c WHERE q.id=c.id RETURNING q.*;
$$;
REVOKE ALL ON FUNCTION public.claim_customer_sms(uuid) FROM PUBLIC,anon,authenticated;GRANT EXECUTE ON FUNCTION public.claim_customer_sms(uuid) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
