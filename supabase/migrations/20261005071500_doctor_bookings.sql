BEGIN;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS consultation_payment_url text NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS public.doctor_bookings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 doctor_id uuid NOT NULL REFERENCES public.doctors(id), patient_name text NOT NULL, phone text NOT NULL,
 patient_age integer CHECK(patient_age BETWEEN 0 AND 120), concern text NOT NULL DEFAULT '',
 preferred_date date NOT NULL, preferred_time time NOT NULL, fee integer CHECK(fee >= 0),
 status text NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','confirmed','completed','cancelled')),
 payment_status text NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid','paid','free')),
 admin_note text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.doctor_bookings ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS doctor_bookings_user_created ON public.doctor_bookings(user_id,created_at DESC);
DROP POLICY IF EXISTS "Doctor booking own read" ON public.doctor_bookings;
CREATE POLICY "Doctor booking own read" ON public.doctor_bookings FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Doctor booking admin update" ON public.doctor_bookings;
CREATE POLICY "Doctor booking admin update" ON public.doctor_bookings FOR UPDATE TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
GRANT SELECT, UPDATE ON public.doctor_bookings TO authenticated;
CREATE OR REPLACE FUNCTION public.request_doctor_booking(p_doctor uuid,p_name text,p_phone text,p_age integer,p_concern text,p_date date,p_time time)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d public.doctors; result uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in'; END IF;
 SELECT * INTO d FROM public.doctors WHERE id=p_doctor;
 IF NOT FOUND THEN RAISE EXCEPTION 'Doctor unavailable'; END IF;
 IF length(trim(p_name)) NOT BETWEEN 2 AND 100 OR p_phone !~ '^\+?[0-9]{8,15}$' OR length(p_concern)>2000 THEN RAISE EXCEPTION 'Check patient details'; END IF;
 IF p_age IS NOT NULL AND (p_age<0 OR p_age>120) THEN RAISE EXCEPTION 'Check patient age'; END IF;
 IF p_date IS NULL OR p_time IS NULL OR (p_date+p_time) < (now() AT TIME ZONE 'Asia/Dhaka') OR p_date > (now() AT TIME ZONE 'Asia/Dhaka')::date+90 THEN RAISE EXCEPTION 'Select a future time within 90 days'; END IF;
 INSERT INTO public.doctor_bookings(user_id,doctor_id,patient_name,phone,patient_age,concern,preferred_date,preferred_time,fee,payment_status)
 VALUES(auth.uid(),d.id,trim(p_name),p_phone,p_age,trim(p_concern),p_date,p_time,CASE WHEN d.consultation_free THEN 0 ELSE d.consultation_fee END,CASE WHEN d.consultation_free OR d.consultation_fee=0 THEN 'free' ELSE 'unpaid' END) RETURNING id INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.request_doctor_booking(uuid,text,text,integer,text,date,time) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_doctor_booking(uuid,text,text,integer,text,date,time) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
