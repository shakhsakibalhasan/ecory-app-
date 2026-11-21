BEGIN;
DROP POLICY IF EXISTS "Ecory published offers" ON public.offers;
CREATE POLICY "Ecory published offers" ON public.offers FOR SELECT TO anon,authenticated USING(visible=true);
CREATE OR REPLACE FUNCTION public.place_offer_order(
 _offer_id uuid, _qty integer, _name text, _phone text, _address text,
 _area text, _payment text, _note text
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.offers%ROWTYPE; p public.products%ROWTYPE; s public.site_settings%ROWTYPE;
 q integer; sub integer; fee integer; c text; lines jsonb;
BEGIN
 IF coalesce(trim(_name),'')='' OR coalesce(trim(_phone),'') !~ '^01[0-9]{9}$'
 OR length(trim(coalesce(_address,'')))<5 THEN RAISE EXCEPTION 'missing or invalid delivery fields'; END IF;
 IF _area IS NULL OR _area NOT IN ('dhaka','outside') THEN RAISE EXCEPTION 'invalid area'; END IF;
 IF _payment IS NULL OR _payment NOT IN ('cod','bkash','online','nagad') THEN RAISE EXCEPTION 'invalid payment method'; END IF;
 IF _qty IS NULL OR _qty<1 OR _qty>99 THEN RAISE EXCEPTION 'invalid quantity'; END IF;
 SELECT * INTO o FROM public.offers WHERE id=_offer_id AND visible=true FOR SHARE;
 IF NOT FOUND OR o.price IS NULL OR o.price<=0 THEN RAISE EXCEPTION 'offer unavailable'; END IF;
 IF o.product_id IS NOT NULL THEN
  SELECT * INTO p FROM public.products WHERE id=o.product_id AND active AND status='published' AND in_stock FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'linked product unavailable'; END IF;
 END IF;
 SELECT * INTO s FROM public.site_settings WHERE id=1;
 IF s.payments IS NOT NULL AND coalesce((s.payments->>_payment)::boolean,false)=false THEN RAISE EXCEPTION 'payment method unavailable'; END IF;
 q:=_qty; sub:=o.price*q;
 fee:=CASE WHEN _area='dhaka' THEN coalesce(s.fee_dhaka,80) ELSE coalesce(s.fee_outside,120) END;
 IF s.free_delivery_min IS NOT NULL AND sub>=s.free_delivery_min THEN fee:=0; END IF;
 lines:=jsonb_build_array(jsonb_build_object('id',coalesce(o.product_id,o.id),'offerId',o.id,'name',o.title_bn,'name_en',o.title_en,'price',o.price,'qty',q,'image',o.image,'variant',''));
 c:='EC'||to_char(now(),'YYMMDD')||substr(replace(gen_random_uuid()::text,'-',''),1,12);
 INSERT INTO public.orders(code,customer_name,phone,address,area,payment_method,trx_id,items,subtotal,delivery_fee,total,note,user_id)
 VALUES(c,left(trim(_name),100),trim(_phone),left(trim(_address),500),_area,_payment,NULL,lines,sub,fee,sub+fee,left(_note,500),auth.uid());
 RETURN c;
END $$;
REVOKE ALL ON FUNCTION public.place_offer_order(uuid,integer,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_offer_order(uuid,integer,text,text,text,text,text,text) TO anon,authenticated;
COMMIT;


BEGIN;
CREATE TABLE IF NOT EXISTS public.promo_codes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 code text NOT NULL UNIQUE CHECK(code=upper(trim(code)) AND code ~ '^[A-Z0-9_-]{3,32}$'),
 discount_type text NOT NULL CHECK(discount_type IN ('fixed','percent')),
 value integer NOT NULL CHECK(value>0),
 min_subtotal integer NOT NULL DEFAULT 0 CHECK(min_subtotal>=0),
 max_discount integer CHECK(max_discount>0),
 enabled boolean NOT NULL DEFAULT true,
 expires_at timestamptz,
 max_uses integer CHECK(max_uses>0),
 used_count integer NOT NULL DEFAULT 0 CHECK(used_count>=0),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(discount_type<>'percent' OR value<=100)
);
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ecory admin promos" ON public.promo_codes;
CREATE POLICY "Ecory admin promos" ON public.promo_codes FOR ALL TO authenticated
 USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.promo_codes TO authenticated;
REVOKE ALL ON public.promo_codes FROM anon;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS promo_code text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount integer NOT NULL DEFAULT 0 CHECK(discount_amount>=0);
CREATE OR REPLACE FUNCTION public.ecory_promo_discount(_code text,_subtotal integer)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.promo_codes%ROWTYPE; d integer;
BEGIN
 SELECT * INTO p FROM public.promo_codes WHERE code=upper(trim(_code)) AND enabled;
 IF NOT FOUND OR (p.expires_at IS NOT NULL AND p.expires_at<=now()) OR (p.max_uses IS NOT NULL AND p.used_count>=p.max_uses) THEN RAISE EXCEPTION 'PROMO_INVALID'; END IF;
 IF _subtotal IS NULL OR _subtotal<=0 OR _subtotal<p.min_subtotal THEN RAISE EXCEPTION 'PROMO_MINIMUM'; END IF;
 d:=CASE WHEN p.discount_type='percent' THEN floor(_subtotal::numeric*p.value/100)::integer ELSE p.value END;
 IF p.max_discount IS NOT NULL THEN d:=least(d,p.max_discount); END IF;
 RETURN least(d,_subtotal);
END $$;
REVOKE ALL ON FUNCTION public.ecory_promo_discount(text,integer) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.quote_promo(_code text,_subtotal integer)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 RETURN jsonb_build_object('code',upper(trim(_code)),'discount',public.ecory_promo_discount(_code,_subtotal));
END $$;
REVOKE ALL ON FUNCTION public.quote_promo(text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.quote_promo(text,integer) TO anon,authenticated;
CREATE OR REPLACE FUNCTION public.place_order_with_promo(
 _name text,_phone text,_address text,_area text,_payment text,_note text,
 _items jsonb,_promo text,_expected_discount integer,_offer_id uuid DEFAULT NULL,_qty integer DEFAULT 1
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c text; sub integer; d integer; normalised text;
BEGIN
 normalised:=upper(trim(coalesce(_promo,'')));
 IF normalised='' THEN RAISE EXCEPTION 'PROMO_INVALID'; END IF;
 -- Serialize use-limit claims; clients never choose discount or final order price.
 PERFORM 1 FROM public.promo_codes WHERE code=normalised FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'PROMO_INVALID'; END IF;
 IF _offer_id IS NOT NULL THEN
  c:=public.place_offer_order(_offer_id,_qty,_name,_phone,_address,_area,_payment,_note);
 ELSE
  c:=public.place_order(_name,_phone,_address,_area,_payment,'',_items,_note);
 END IF;
 SELECT subtotal INTO sub FROM public.orders WHERE code=c;
 d:=public.ecory_promo_discount(normalised,sub);
 IF _expected_discount IS NULL OR d<>_expected_discount THEN RAISE EXCEPTION 'PROMO_CHANGED'; END IF;
 UPDATE public.orders SET promo_code=normalised,discount_amount=d,total=subtotal+delivery_fee-d WHERE code=c;
 UPDATE public.promo_codes SET used_count=used_count+1 WHERE code=normalised;
 RETURN c;
END $$;
REVOKE ALL ON FUNCTION public.place_order_with_promo(text,text,text,text,text,text,jsonb,text,integer,uuid,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_order_with_promo(text,text,text,text,text,text,jsonb,text,integer,uuid,integer) TO anon,authenticated;
COMMIT;


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


BEGIN;
ALTER TABLE public.doctors
 ADD COLUMN IF NOT EXISTS availability text NOT NULL DEFAULT 'unknown' CHECK(availability IN ('unknown','online','offline')),
 ADD COLUMN IF NOT EXISTS followup_fee integer CHECK(followup_fee>=0),
 ADD COLUMN IF NOT EXISTS followup_days integer CHECK(followup_days>0),
 ADD COLUMN IF NOT EXISTS patients_seen integer CHECK(patients_seen>=0),
 ADD COLUMN IF NOT EXISTS joined_on date,
 ADD COLUMN IF NOT EXISTS doctor_code text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS consultation_minutes integer CHECK(consultation_minutes>0),
 ADD COLUMN IF NOT EXISTS profile_reviews jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(profile_reviews)='array'),
 ADD COLUMN IF NOT EXISTS profile_clips jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(profile_clips)='array');
NOTIFY pgrst,'reload schema';
COMMIT;
