BEGIN;
ALTER TABLE public.doctor_bookings ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS public.doctor_booking_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid NOT NULL REFERENCES public.doctor_bookings(id) ON DELETE CASCADE,
 kind text NOT NULL, status text NOT NULL, payment_status text NOT NULL, note text NOT NULL DEFAULT '',
 appointment_date date NOT NULL, appointment_time time NOT NULL,
 previous_date date, previous_time time, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.doctor_booking_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS doctor_booking_events_lookup ON public.doctor_booking_events(booking_id,created_at);
DROP POLICY IF EXISTS "Ecory booking event read" ON public.doctor_booking_events;
CREATE POLICY "Ecory booking event read" ON public.doctor_booking_events FOR SELECT TO authenticated USING(
 public.has_role(auth.uid(),'admin') OR EXISTS(SELECT 1 FROM public.doctor_bookings b WHERE b.id=booking_id AND b.user_id=auth.uid())
);
GRANT SELECT ON public.doctor_booking_events TO authenticated;
CREATE OR REPLACE FUNCTION public.record_doctor_booking_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  INSERT INTO public.doctor_booking_events(booking_id,kind,status,payment_status,note,appointment_date,appointment_time)
  VALUES(NEW.id,'requested',NEW.status,NEW.payment_status,'',NEW.preferred_date,NEW.preferred_time);
 ELSE
  IF NEW.status IS DISTINCT FROM OLD.status THEN
   INSERT INTO public.doctor_booking_events(booking_id,kind,status,payment_status,note,appointment_date,appointment_time)
   VALUES(NEW.id,'status',NEW.status,NEW.payment_status,NEW.admin_note,NEW.preferred_date,NEW.preferred_time);
  END IF;
  IF NEW.preferred_date IS DISTINCT FROM OLD.preferred_date OR NEW.preferred_time IS DISTINCT FROM OLD.preferred_time THEN
   INSERT INTO public.doctor_booking_events(booking_id,kind,status,payment_status,note,appointment_date,appointment_time,previous_date,previous_time)
   VALUES(NEW.id,'rescheduled',NEW.status,NEW.payment_status,NEW.admin_note,NEW.preferred_date,NEW.preferred_time,OLD.preferred_date,OLD.preferred_time);
  END IF;
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
   INSERT INTO public.doctor_booking_events(booking_id,kind,status,payment_status,note,appointment_date,appointment_time)
   VALUES(NEW.id,'payment',NEW.status,NEW.payment_status,NEW.admin_note,NEW.preferred_date,NEW.preferred_time);
  END IF;
  IF NEW.admin_note IS DISTINCT FROM OLD.admin_note AND NEW.status IS NOT DISTINCT FROM OLD.status AND NEW.payment_status IS NOT DISTINCT FROM OLD.payment_status AND NEW.preferred_date IS NOT DISTINCT FROM OLD.preferred_date AND NEW.preferred_time IS NOT DISTINCT FROM OLD.preferred_time THEN
   INSERT INTO public.doctor_booking_events(booking_id,kind,status,payment_status,note,appointment_date,appointment_time)
   VALUES(NEW.id,'note',NEW.status,NEW.payment_status,NEW.admin_note,NEW.preferred_date,NEW.preferred_time);
  END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.record_doctor_booking_event() FROM PUBLIC;
DROP TRIGGER IF EXISTS ecory_doctor_booking_events ON public.doctor_bookings;
CREATE TRIGGER ecory_doctor_booking_events AFTER INSERT OR UPDATE ON public.doctor_bookings FOR EACH ROW EXECUTE FUNCTION public.record_doctor_booking_event();
INSERT INTO public.doctor_booking_events(booking_id,kind,status,payment_status,note,appointment_date,appointment_time,created_at)
SELECT b.id,'imported',b.status,b.payment_status,'',b.preferred_date,b.preferred_time,now() FROM public.doctor_bookings b
WHERE NOT EXISTS(SELECT 1 FROM public.doctor_booking_events e WHERE e.booking_id=b.id);
CREATE OR REPLACE FUNCTION public.cancel_doctor_booking(p_booking uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in'; END IF;
 UPDATE public.doctor_bookings SET status='cancelled' WHERE id=p_booking AND user_id=auth.uid() AND status IN ('requested','confirmed') AND (preferred_date+preferred_time)>(now() AT TIME ZONE 'Asia/Dhaka');
 IF NOT FOUND THEN RAISE EXCEPTION 'This booking cannot be cancelled'; END IF;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.cancel_doctor_booking(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_doctor_booking(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.request_doctor_booking(p_doctor uuid,p_name text,p_phone text,p_age integer,p_concern text,p_date date,p_time time,p_address text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d public.doctors; result uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in'; END IF;
 SELECT * INTO d FROM public.doctors WHERE id=p_doctor;
 IF NOT FOUND THEN RAISE EXCEPTION 'Doctor unavailable'; END IF;
 IF NOT d.consultation_free AND d.consultation_fee IS NULL THEN RAISE EXCEPTION 'Doctor fee is not configured'; END IF;
 IF length(trim(p_name)) NOT BETWEEN 2 AND 100 OR p_phone !~ '^\+?[0-9]{8,15}$' OR length(p_concern)>2000 THEN RAISE EXCEPTION 'Check patient details'; END IF;
 IF p_address IS NULL OR length(trim(p_address)) NOT BETWEEN 5 AND 1000 THEN RAISE EXCEPTION 'Provide the patient address'; END IF;
 IF p_age IS NOT NULL AND (p_age<0 OR p_age>120) THEN RAISE EXCEPTION 'Check patient age'; END IF;
 IF p_date IS NULL OR p_time IS NULL OR (p_date+p_time) < (now() AT TIME ZONE 'Asia/Dhaka') OR p_date > (now() AT TIME ZONE 'Asia/Dhaka')::date+90 THEN RAISE EXCEPTION 'Select a future time within 90 days'; END IF;
 INSERT INTO public.doctor_bookings(user_id,doctor_id,patient_name,phone,patient_age,concern,preferred_date,preferred_time,fee,payment_status,address)
 VALUES(auth.uid(),d.id,trim(p_name),p_phone,p_age,trim(p_concern),p_date,p_time,CASE WHEN d.consultation_free THEN 0 ELSE d.consultation_fee END,CASE WHEN d.consultation_free OR d.consultation_fee=0 THEN 'free' ELSE 'unpaid' END,trim(p_address)) RETURNING id INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.request_doctor_booking(uuid,text,text,integer,text,date,time,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_doctor_booking(uuid,text,text,integer,text,date,time,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
