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
