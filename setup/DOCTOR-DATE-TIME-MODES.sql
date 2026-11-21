BEGIN;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS booking_schedule jsonb NOT NULL DEFAULT '{"date_enabled":false,"time_enabled":false,"dates":[],"times":[]}'::jsonb;
ALTER TABLE public.doctor_bookings ADD COLUMN IF NOT EXISTS requested_date date,ADD COLUMN IF NOT EXISTS requested_time time;
CREATE OR REPLACE FUNCTION public.validate_doctor_schedule_intent() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s jsonb;raw jsonb:=NEW.patient;date_on boolean;time_on boolean;rd date;rt time;today date:=(now() AT TIME ZONE 'Asia/Dhaka')::date;
BEGIN
 SELECT booking_schedule INTO s FROM public.doctors WHERE id=NEW.doctor_id;
 date_on:=coalesce(s->'date_enabled','false'::jsonb)='true'::jsonb;time_on:=coalesce(s->'time_enabled','false'::jsonb)='true'::jsonb;
 NEW.patient:=NEW.patient-'requested_date'-'requested_time';
 IF time_on AND NOT date_on THEN RAISE EXCEPTION 'SCHEDULE_CONFIGURATION_INVALID'; END IF;
 IF date_on THEN
  IF coalesce(raw->>'requested_date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN RAISE EXCEPTION 'SELECT_DATE'; END IF;
  rd:=(raw->>'requested_date')::date;
  IF rd<today OR NOT coalesce((s->'dates') ? (raw->>'requested_date'),false) THEN RAISE EXCEPTION 'DATE_UNAVAILABLE'; END IF;
  NEW.patient:=NEW.patient||jsonb_build_object('requested_date',rd::text);
  IF time_on THEN
   IF coalesce(raw->>'requested_time','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' OR NOT coalesce((s->'times') ? (raw->>'requested_time'),false) THEN RAISE EXCEPTION 'SELECT_TIME'; END IF;
   rt:=(raw->>'requested_time')::time;
   IF rd+rt<=now() AT TIME ZONE 'Asia/Dhaka' THEN RAISE EXCEPTION 'TIME_UNAVAILABLE'; END IF;
   NEW.patient:=NEW.patient||jsonb_build_object('requested_time',raw->>'requested_time');
  END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS ecory_validate_schedule_intent ON public.doctor_booking_intents;
CREATE TRIGGER ecory_validate_schedule_intent BEFORE INSERT ON public.doctor_booking_intents FOR EACH ROW EXECUTE FUNCTION public.validate_doctor_schedule_intent();
CREATE OR REPLACE FUNCTION public.copy_requested_doctor_schedule() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p jsonb;
BEGIN
 SELECT patient INTO p FROM public.doctor_booking_intents WHERE id=NEW.id AND user_id=NEW.user_id AND doctor_id=NEW.doctor_id;
 IF FOUND THEN NEW.requested_date:=nullif(p->>'requested_date','')::date;NEW.requested_time:=nullif(p->>'requested_time','')::time; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS ecory_copy_requested_schedule ON public.doctor_bookings;
CREATE TRIGGER ecory_copy_requested_schedule BEFORE INSERT ON public.doctor_bookings FOR EACH ROW EXECUTE FUNCTION public.copy_requested_doctor_schedule();
REVOKE ALL ON FUNCTION public.validate_doctor_schedule_intent(),public.copy_requested_doctor_schedule() FROM PUBLIC,anon,authenticated;
COMMIT;
