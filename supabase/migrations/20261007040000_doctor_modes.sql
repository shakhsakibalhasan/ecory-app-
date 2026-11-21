BEGIN;
ALTER TABLE public.doctors
 ADD COLUMN IF NOT EXISTS in_person_fee integer CHECK(in_person_fee>=0),
 ADD COLUMN IF NOT EXISTS in_person_free boolean NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS in_person_schedule text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS in_person_schedule_en text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS workplace text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS workplace_en text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS bmdc_number text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS bio_bn text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS bio_en text NOT NULL DEFAULT '';
ALTER TABLE public.doctor_bookings ADD COLUMN IF NOT EXISTS consultation_mode text NOT NULL DEFAULT 'phone' CHECK(consultation_mode IN ('phone','in_person'));
CREATE OR REPLACE FUNCTION public.request_doctor_booking_mode(p_doctor uuid,p_name text,p_phone text,p_age integer,p_concern text,p_date date,p_time time,p_address text,p_mode text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d public.doctors; result uuid; selected_fee integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in'; END IF;
 IF p_mode IS NULL OR p_mode NOT IN ('phone','in_person') THEN RAISE EXCEPTION 'Select consultation mode'; END IF;
 SELECT * INTO d FROM public.doctors WHERE id=p_doctor;
 IF NOT FOUND THEN RAISE EXCEPTION 'Doctor unavailable'; END IF;
 selected_fee:=CASE WHEN p_mode='phone' THEN CASE WHEN d.consultation_free THEN 0 ELSE d.consultation_fee END ELSE CASE WHEN d.in_person_free THEN 0 ELSE d.in_person_fee END END;
 IF selected_fee IS NULL THEN RAISE EXCEPTION 'Doctor fee is not configured'; END IF;
 IF p_name IS NULL OR length(trim(p_name)) NOT BETWEEN 2 AND 100 OR p_phone IS NULL OR p_phone !~ '^\+?[0-9]{8,15}$' OR length(coalesce(p_concern,''))>2000 THEN RAISE EXCEPTION 'Check patient details'; END IF;
 IF p_address IS NULL OR length(trim(p_address)) NOT BETWEEN 5 AND 1000 THEN RAISE EXCEPTION 'Provide the patient address'; END IF;
 IF p_age IS NOT NULL AND (p_age<0 OR p_age>120) THEN RAISE EXCEPTION 'Check patient age'; END IF;
 IF p_date IS NULL OR p_time IS NULL OR (p_date+p_time) < (now() AT TIME ZONE 'Asia/Dhaka') OR p_date > (now() AT TIME ZONE 'Asia/Dhaka')::date+90 THEN RAISE EXCEPTION 'Select a future time within 90 days'; END IF;
 INSERT INTO public.doctor_bookings(user_id,doctor_id,patient_name,phone,patient_age,concern,preferred_date,preferred_time,fee,payment_status,address,consultation_mode)
 VALUES(auth.uid(),d.id,trim(p_name),p_phone,p_age,trim(coalesce(p_concern,'')),p_date,p_time,selected_fee,CASE WHEN selected_fee=0 THEN 'free' ELSE 'unpaid' END,trim(p_address),p_mode) RETURNING id INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.request_doctor_booking_mode(uuid,text,text,integer,text,date,time,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_doctor_booking_mode(uuid,text,text,integer,text,date,time,text,text) TO authenticated;
ALTER TABLE public.app_ui_settings ADD COLUMN IF NOT EXISTS nav_items jsonb DEFAULT NULL;
ALTER TABLE public.app_ui_settings ADD COLUMN IF NOT EXISTS profile_items jsonb DEFAULT NULL;
NOTIFY pgrst,'reload schema';
COMMIT;
