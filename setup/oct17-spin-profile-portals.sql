BEGIN;
CREATE OR REPLACE FUNCTION public.attach_guest_spin(_token text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.guest_spin_awards%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;
 SELECT * INTO a FROM public.guest_spin_awards WHERE token_hash=encode(sha256(convert_to(coalesce(_token,''),'UTF8')),'hex') FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 IF a.user_id IS NOT NULL AND a.user_id<>auth.uid() THEN RAISE EXCEPTION 'SPIN_LINKED_TO_ANOTHER_ACCOUNT'; END IF;
 UPDATE public.guest_spin_awards SET user_id=auth.uid() WHERE id=a.id;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.attach_guest_spin(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.attach_guest_spin(text) TO authenticated;
CREATE OR REPLACE FUNCTION public.my_spin_wins() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'campaign',campaign,'customer_name',customer_name,'phone',phone,'prize',prize-'eligible'-'weight','created_at',created_at,'expires_at',expires_at,'order_code',order_code) ORDER BY created_at DESC),'[]'::jsonb) INTO result FROM public.guest_spin_awards WHERE user_id=auth.uid();
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.my_spin_wins() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.my_spin_wins() TO authenticated;
CREATE OR REPLACE FUNCTION public.admin_spin_participants(_page integer DEFAULT 0,_search text DEFAULT '',_state text DEFAULT 'all') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.has_role(auth.uid(),'admin'),false) THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 IF _page IS NULL OR _page<0 OR _page>100000 OR _state NOT IN('all','available','used','expired') THEN RAISE EXCEPTION 'INVALID_FILTER'; END IF;
 WITH filtered AS(SELECT *,CASE WHEN order_code IS NOT NULL THEN 'used' WHEN expires_at<=now() THEN 'expired' ELSE 'available' END AS state FROM public.guest_spin_awards WHERE length(coalesce(_search,''))<=100 AND (coalesce(_search,'')='' OR customer_name ILIKE '%'||_search||'%' OR phone ILIKE '%'||_search||'%' OR campaign ILIKE '%'||_search||'%')), selected AS(SELECT * FROM filtered WHERE _state='all' OR state=_state),paged AS(SELECT * FROM selected ORDER BY created_at DESC,id LIMIT 25 OFFSET _page*25)
 SELECT jsonb_build_object('total',(SELECT count(*) FROM selected),'rows',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'campaign',campaign,'name',customer_name,'phone',phone,'prize',prize->>'name_bn','coupon',prize->>'coupon','state',state,'created_at',created_at,'expires_at',expires_at,'order_code',order_code,'linked',user_id IS NOT NULL) ORDER BY created_at DESC,id) FROM paged),'[]'::jsonb)) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_spin_participants(integer,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_spin_participants(integer,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.quote_guest_spin_coupon(_code text,_token text,_phone text,_subtotal integer,_delivery integer,_offer_id uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.guest_spin_awards%ROWTYPE; d integer:=0; oid uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;
 SELECT * INTO a FROM public.guest_spin_awards WHERE (user_id=auth.uid() OR (user_id IS NULL AND coalesce(_token,'')<>'' AND token_hash=encode(sha256(convert_to(_token,'UTF8')),'hex'))) AND prize->>'coupon'=upper(trim(_code)) ORDER BY created_at DESC LIMIT 1;
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
REVOKE ALL ON FUNCTION public.quote_guest_spin_coupon(text,text,text,integer,integer,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.quote_guest_spin_coupon(text,text,text,integer,integer,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.place_guest_spin_order(_code text,_token text,_expected_discount integer,_name text,_phone text,_address text,_area text,_payment text,_note text,_items jsonb,_offer_id uuid DEFAULT NULL,_qty integer DEFAULT 1) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.guest_spin_awards%ROWTYPE; c text; o public.orders%ROWTYPE; d integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;
 SELECT * INTO a FROM public.guest_spin_awards WHERE (user_id=auth.uid() OR (user_id IS NULL AND coalesce(_token,'')<>'' AND token_hash=encode(sha256(convert_to(_token,'UTF8')),'hex'))) AND prize->>'coupon'=upper(trim(_code)) ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
 IF NOT FOUND OR a.phone<>public.spin_normalize_phone(_phone) THEN RAISE EXCEPTION 'SPIN_COUPON_INVALID'; END IF;
 IF a.order_code IS NOT NULL THEN
  IF a.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'SPIN_COUPON_USED'; END IF;
  RETURN a.order_code;
 END IF;
 IF _offer_id IS NOT NULL THEN c:=public.place_offer_order(_offer_id,_qty,_name,_phone,_address,_area,_payment,_note); ELSE c:=public.place_order(_name,_phone,_address,_area,_payment,'',_items,_note); END IF;
 SELECT * INTO o FROM public.orders WHERE code=c;
 d:=(public.quote_guest_spin_coupon(_code,_token,_phone,o.subtotal,o.delivery_fee,_offer_id)->>'discount')::integer;
 IF d IS DISTINCT FROM _expected_discount THEN RAISE EXCEPTION 'SPIN_CHANGED'; END IF;
 UPDATE public.orders SET discount_amount=d,promo_code=a.prize->>'coupon',total=subtotal+delivery_fee-d WHERE code=c;
 UPDATE public.guest_spin_awards SET order_code=c,user_id=auth.uid() WHERE id=a.id;
 RETURN c;
END $$;
REVOKE ALL ON FUNCTION public.place_guest_spin_order(text,text,integer,text,text,text,text,text,text,jsonb,uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.place_guest_spin_order(text,text,integer,text,text,text,text,text,text,jsonb,uuid,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.quote_saved_spin_coupon(_award_id uuid,_code text,_token text,_phone text,_subtotal integer,_delivery integer,_offer_id uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.guest_spin_awards%ROWTYPE; d integer:=0; oid uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;
 SELECT * INTO a FROM public.guest_spin_awards WHERE id=_award_id AND (user_id=auth.uid() OR (user_id IS NULL AND coalesce(_token,'')<>'' AND token_hash=encode(sha256(convert_to(_token,'UTF8')),'hex'))) AND prize->>'coupon'=upper(trim(_code)) ORDER BY created_at DESC LIMIT 1;
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
GRANT EXECUTE ON FUNCTION public.quote_saved_spin_coupon(uuid,text,text,text,integer,integer,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.place_saved_spin_order(_award_id uuid,_code text,_token text,_expected_discount integer,_name text,_phone text,_address text,_area text,_payment text,_note text,_items jsonb,_offer_id uuid DEFAULT NULL,_qty integer DEFAULT 1) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.guest_spin_awards%ROWTYPE; c text; o public.orders%ROWTYPE; d integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;
 SELECT * INTO a FROM public.guest_spin_awards WHERE id=_award_id AND (user_id=auth.uid() OR (user_id IS NULL AND coalesce(_token,'')<>'' AND token_hash=encode(sha256(convert_to(_token,'UTF8')),'hex'))) AND prize->>'coupon'=upper(trim(_code)) ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
 IF NOT FOUND OR a.phone<>public.spin_normalize_phone(_phone) THEN RAISE EXCEPTION 'SPIN_COUPON_INVALID'; END IF;
 IF a.order_code IS NOT NULL THEN
  IF a.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'SPIN_COUPON_USED'; END IF;
  RETURN a.order_code;
 END IF;
 IF _offer_id IS NOT NULL THEN c:=public.place_offer_order(_offer_id,_qty,_name,_phone,_address,_area,_payment,_note); ELSE c:=public.place_order(_name,_phone,_address,_area,_payment,'',_items,_note); END IF;
 SELECT * INTO o FROM public.orders WHERE code=c;
 d:=(public.quote_saved_spin_coupon(_award_id,_code,_token,_phone,o.subtotal,o.delivery_fee,_offer_id)->>'discount')::integer;
 IF d IS DISTINCT FROM _expected_discount THEN RAISE EXCEPTION 'SPIN_CHANGED'; END IF;
 UPDATE public.orders SET discount_amount=d,promo_code=a.prize->>'coupon',total=subtotal+delivery_fee-d WHERE code=c;
 UPDATE public.guest_spin_awards SET order_code=c,user_id=auth.uid() WHERE id=a.id;
 RETURN c;
END $$;
REVOKE ALL ON FUNCTION public.place_saved_spin_order(uuid,text,text,integer,text,text,text,text,text,text,jsonb,uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.place_saved_spin_order(uuid,text,text,integer,text,text,text,text,text,text,jsonb,uuid,integer) TO authenticated;

-- Add Spin Win without changing the customer's existing Profile menu entries.
UPDATE public.app_ui_settings SET profile_items=profile_items||'[{"id":"spin_win","bn":"স্পিন উইন","en":"Spin Win","target":"action:spin","icon":"icon_gift","visible":true}]'::jsonb WHERE jsonb_typeof(profile_items)='array' AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(profile_items) x WHERE x->>'target'='action:spin');

CREATE OR REPLACE FUNCTION public.save_spin_campaign(_config jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p jsonb; link text; oid uuid; winning_count integer;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.has_role(auth.uid(),'admin'),false) THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 IF length(trim(coalesce(_config->>'campaign','')))=0 OR jsonb_array_length(_config->'prizes') NOT BETWEEN 3 AND 12 THEN RAISE EXCEPTION 'SLOT_COUNT_INVALID'; END IF;
 SELECT count(*) INTO winning_count FROM jsonb_array_elements(_config->'prizes') x WHERE coalesce((x->>'eligible')::boolean,false);
 IF winning_count<>3 THEN RAISE EXCEPTION 'THREE_WINNERS_REQUIRED'; END IF;
 IF (SELECT count(DISTINCT x->>'id') FROM jsonb_array_elements(_config->'prizes') x)<>jsonb_array_length(_config->'prizes') OR (SELECT count(DISTINCT upper(x->>'coupon')) FROM jsonb_array_elements(_config->'prizes') x WHERE coalesce((x->>'eligible')::boolean,false))<>winning_count THEN RAISE EXCEPTION 'DUPLICATE_SLOT_OR_COUPON'; END IF;
 FOR p IN SELECT x FROM jsonb_array_elements(_config->'prizes') x LOOP
  IF length(trim(coalesce(p->>'name_bn','')))=0 OR (coalesce((p->>'eligible')::boolean,false) AND coalesce(p->>'coupon','')!~'^[A-Z0-9_-]{3,32}$') OR p->>'kind' NOT IN('fixed','percent','delivery','offer','gift') OR coalesce((p->>'value')::integer,-1)<0 OR coalesce((p->>'minimum')::integer,-1)<0 OR (p->>'kind'='percent' AND (p->>'value')::integer>100) THEN RAISE EXCEPTION 'INVALID_PRIZE'; END IF;
  IF coalesce((p->>'eligible')::boolean,false) AND p->>'kind' IN('fixed','percent') AND (p->>'value')::integer<=0 THEN RAISE EXCEPTION 'POSITIVE_DISCOUNT_REQUIRED'; END IF;
  IF EXISTS(SELECT 1 FROM public.promo_codes WHERE code=p->>'coupon') THEN RAISE EXCEPTION 'COUPON_ALREADY_USED_IN_PROMOS'; END IF;
  link:=p->>'link';
  IF link IS NULL OR link!~'^/(products|product/[A-Za-z0-9_-]+|offers|checkout)(\?.*)?$' THEN RAISE EXCEPTION 'APP_LINK_REQUIRED'; END IF;
  IF coalesce((p->>'eligible')::boolean,false) AND p->>'kind' IN('offer','gift') THEN
   IF link!~'^/offers\?offer=[0-9a-fA-F-]{36}$' THEN RAISE EXCEPTION 'GIFT_OFFER_LINK_REQUIRED'; END IF;
   oid:=substring(link from 'offer=([0-9a-fA-F-]{36})')::uuid;
   IF NOT EXISTS(SELECT 1 FROM public.offers WHERE id=oid AND visible) THEN RAISE EXCEPTION 'OFFER_NOT_AVAILABLE'; END IF;
  END IF;
 END LOOP;
 UPDATE public.spin_campaigns SET config=_config WHERE id=1;
END $$;
REVOKE ALL ON FUNCTION public.save_spin_campaign(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_spin_campaign(jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.draw_guest_spin(_name text,_phone text,_token text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c jsonb; a public.guest_spin_awards%ROWTYPE; p jsonb; phone_normal text; h text; eligible jsonb;
BEGIN
 IF length(trim(coalesce(_name,''))) NOT BETWEEN 2 AND 100 THEN RAISE EXCEPTION 'NAME_REQUIRED'; END IF;
 IF coalesce(_token,'')!~'^[0-9a-f-]{72}$' THEN RAISE EXCEPTION 'TOKEN_INVALID'; END IF;
 phone_normal:=public.spin_normalize_phone(_phone); h:=encode(sha256(convert_to(_token,'UTF8')),'hex');
 SELECT config INTO c FROM public.spin_campaigns WHERE id=1 FOR SHARE;
 IF NOT coalesce((c->>'enabled')::boolean,false) THEN RAISE EXCEPTION 'SPIN_DISABLED'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(phone_normal||coalesce(c->>'campaign',''),0));
 SELECT * INTO a FROM public.guest_spin_awards WHERE campaign=c->>'campaign' AND phone=phone_normal;
 IF FOUND THEN
  IF a.token_hash<>h THEN RAISE EXCEPTION 'PHONE_ALREADY_SPUN'; END IF;
  RETURN jsonb_build_object('id',a.id,'prize',a.prize-'eligible'-'weight','customer_name',a.customer_name,'phone',a.phone,'expires_at',a.expires_at,'order_code',a.order_code);
 END IF;
 SELECT jsonb_agg(x) INTO eligible FROM jsonb_array_elements(c->'prizes') x WHERE coalesce((x->>'eligible')::boolean,false);
 IF jsonb_array_length(c->'prizes') NOT BETWEEN 3 AND 12 OR coalesce(jsonb_array_length(eligible),0)<>3 THEN RAISE EXCEPTION 'THREE_WINNERS_REQUIRED'; END IF;
 p:=eligible->floor(random()*jsonb_array_length(eligible))::integer;
 INSERT INTO public.guest_spin_awards(campaign,customer_name,phone,token_hash,prize) VALUES(c->>'campaign',trim(_name),phone_normal,h,p) RETURNING * INTO a;
 RETURN jsonb_build_object('id',a.id,'prize',a.prize-'eligible'-'weight','customer_name',a.customer_name,'phone',a.phone,'expires_at',a.expires_at,'order_code',a.order_code);
END $$;
REVOKE ALL ON FUNCTION public.draw_guest_spin(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.draw_guest_spin(text,text,text) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.get_spin_campaign() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('enabled',config->'enabled','campaign',config->'campaign','title_bn',config->'title_bn','title_en',config->'title_en','subtitle_bn',config->'subtitle_bn','subtitle_en',config->'subtitle_en','logo',config->'logo','prizes',coalesce((SELECT jsonb_agg(p-'coupon'-'eligible'-'weight' ORDER BY n) FROM jsonb_array_elements(config->'prizes') WITH ORDINALITY t(p,n)),'[]'::jsonb)) FROM public.spin_campaigns WHERE id=1
$$;

COMMIT;
NOTIFY pgrst,'reload schema';
