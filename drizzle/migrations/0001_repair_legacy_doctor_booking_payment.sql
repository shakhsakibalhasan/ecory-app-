CREATE OR REPLACE FUNCTION public.admin_legacy_doctor_bookings(_ids uuid[])
RETURNS TABLE(id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT b.id FROM public.doctor_bookings b
 WHERE public.has_role(auth.uid(), 'admin') AND b.id = ANY(_ids)
 AND NOT EXISTS (SELECT 1 FROM public.doctor_booking_intents i WHERE i.booking_id = b.id OR i.id = b.id);
$$;
REVOKE ALL ON FUNCTION public.admin_legacy_doctor_bookings(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_legacy_doctor_bookings(uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_doctor_confirmation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF TG_OP = 'UPDATE' AND NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
   IF NOT (coalesce(public.has_role(auth.uid(), 'admin'), false)
    AND OLD.payment_status = 'unpaid' AND NEW.payment_status = 'paid'
    AND NEW.fee IS NOT DISTINCT FROM OLD.fee AND coalesce(OLD.fee, 0) > 0
    AND NOT EXISTS (SELECT 1 FROM public.doctor_booking_intents i WHERE i.booking_id = OLD.id OR i.id = OLD.id)) THEN
    RAISE EXCEPTION 'Only an admin can record receipt for a legacy unpaid booking; online payments require gateway verification';
   END IF;
  END IF;
 END IF;
 IF NEW.status IN ('confirmed', 'completed') THEN
  -- Already accepted legacy rows must remain editable without falsely declaring payment.
  IF TG_OP = 'UPDATE' THEN
   IF NEW.status IS NOT DISTINCT FROM OLD.status AND NEW.payment_status IS NOT DISTINCT FROM OLD.payment_status AND NEW.fee IS NOT DISTINCT FROM OLD.fee THEN
    RETURN NEW;
   END IF;
  END IF;
  IF NEW.preferred_date IS NULL OR NEW.preferred_time IS NULL THEN
   RAISE EXCEPTION 'Set appointment date and time before confirming';
  END IF;
  IF coalesce(NEW.fee, 0) > 0 AND NEW.payment_status IS DISTINCT FROM 'paid' THEN
   RAISE EXCEPTION 'Verify payment before confirming';
  END IF;
 END IF;
 RETURN NEW;
END;
$$;