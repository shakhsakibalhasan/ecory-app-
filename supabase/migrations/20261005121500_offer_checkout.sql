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
