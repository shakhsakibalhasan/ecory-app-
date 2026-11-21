BEGIN;
-- Bearer claim token + award ID + matching phone allow login-free redemption.
-- Account owners may still redeem without a token; unrelated signed-in accounts are rejected.
CREATE OR REPLACE FUNCTION public.quote_saved_spin_coupon(_award_id uuid,_code text,_token text,_phone text,_subtotal integer,_delivery integer,_offer_id uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.guest_spin_awards%ROWTYPE; d integer:=0; oid uuid;
BEGIN
 SELECT * INTO a FROM public.guest_spin_awards WHERE id=_award_id AND (user_id=auth.uid() OR ((auth.uid() IS NULL OR user_id IS NULL) AND length(coalesce(_token,''))>=32 AND token_hash=encode(sha256(convert_to(_token,'UTF8')),'hex'))) AND prize->>'coupon'=upper(trim(_code)) ORDER BY created_at DESC LIMIT 1;
 IF NOT FOUND OR a.order_code IS NOT NULL OR a.expires_at<=now() THEN RAISE EXCEPTION 'SPIN_COUPON_INVALID'; END IF;
 IF a.phone<>public.spin_normalize_phone(_phone) THEN RAISE EXCEPTION 'SPIN_PHONE_MISMATCH'; END IF;
 IF _subtotal<=0 OR _subtotal<coalesce((a.prize->>'minimum')::integer,0) THEN RAISE EXCEPTION 'SPIN_MINIMUM'; END IF;
 IF a.prize->>'kind' IN('offer','gift') THEN
  oid:=substring(a.prize->>'link' from 'offer=([0-9a-fA-F-]{36})')::uuid;
  IF oid IS NULL OR oid IS DISTINCT FROM _offer_id THEN RAISE EXCEPTION 'SPIN_OFFER_MISMATCH'; END IF;
 END IF;
 d:=CASE a.prize->>'kind' WHEN 'fixed' THEN least(_subtotal,(a.prize->>'value')::integer) WHEN 'percent' THEN least(_subtotal,floor(_subtotal::numeric*(a.prize->>'value')::integer/100)::integer) WHEN 'delivery' THEN greatest(_delivery,0) ELSE 0 END;
 RETURN jsonb_build_object('id',a.id,'code',a.prize->>'coupon','discount',greatest(d,0),'prize',a.prize-'eligible'-'weight');
END $$;
REVOKE ALL ON FUNCTION public.quote_saved_spin_coupon(uuid,text,text,text,integer,integer,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.quote_saved_spin_coupon(uuid,text,text,text,integer,integer,uuid) TO anon,authenticated;
CREATE OR REPLACE FUNCTION public.place_saved_spin_order(_award_id uuid,_code text,_token text,_expected_discount integer,_name text,_phone text,_address text,_area text,_payment text,_note text,_items jsonb,_offer_id uuid DEFAULT NULL,_qty integer DEFAULT 1) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.guest_spin_awards%ROWTYPE; c text; o public.orders%ROWTYPE; d integer;
BEGIN
 SELECT * INTO a FROM public.guest_spin_awards WHERE id=_award_id AND (user_id=auth.uid() OR ((auth.uid() IS NULL OR user_id IS NULL) AND length(coalesce(_token,''))>=32 AND token_hash=encode(sha256(convert_to(_token,'UTF8')),'hex'))) AND prize->>'coupon'=upper(trim(_code)) ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
 IF NOT FOUND OR a.phone<>public.spin_normalize_phone(_phone) THEN RAISE EXCEPTION 'SPIN_COUPON_INVALID'; END IF;
 IF a.order_code IS NOT NULL THEN
  RETURN a.order_code;
 END IF;
 IF _offer_id IS NOT NULL THEN c:=public.place_offer_order(_offer_id,_qty,_name,_phone,_address,_area,_payment,_note); ELSE c:=public.place_order(_name,_phone,_address,_area,_payment,'',_items,_note); END IF;
 SELECT * INTO o FROM public.orders WHERE code=c;
 d:=(public.quote_saved_spin_coupon(_award_id,_code,_token,_phone,o.subtotal,o.delivery_fee,_offer_id)->>'discount')::integer;
 IF d IS DISTINCT FROM _expected_discount THEN RAISE EXCEPTION 'SPIN_CHANGED'; END IF;
 UPDATE public.orders SET discount_amount=d,promo_code=a.prize->>'coupon',total=subtotal+delivery_fee-d WHERE code=c;
 UPDATE public.guest_spin_awards SET order_code=c,user_id=coalesce(user_id,auth.uid()) WHERE id=a.id;
 RETURN c;
END $$;
REVOKE ALL ON FUNCTION public.place_saved_spin_order(uuid,text,text,integer,text,text,text,text,text,text,jsonb,uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.place_saved_spin_order(uuid,text,text,integer,text,text,text,text,text,text,jsonb,uuid,integer) TO anon,authenticated;

COMMIT;
NOTIFY pgrst,'reload schema';
