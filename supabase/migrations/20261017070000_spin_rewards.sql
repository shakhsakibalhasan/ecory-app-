BEGIN;
CREATE TABLE IF NOT EXISTS public.spin_campaigns(id integer PRIMARY KEY DEFAULT 1 CHECK(id=1),config jsonb NOT NULL DEFAULT '{"enabled":false,"campaign":"launch","title_bn":"স্পিন করুন, উপহার জিতুন","title_en":"Spin & Win","prizes":[]}'::jsonb);
INSERT INTO public.spin_campaigns(id) VALUES(1) ON CONFLICT DO NOTHING;
ALTER TABLE public.spin_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "spin admin" ON public.spin_campaigns;
CREATE POLICY "spin admin" ON public.spin_campaigns FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
GRANT SELECT,UPDATE ON public.spin_campaigns TO authenticated;
CREATE TABLE IF NOT EXISTS public.spin_awards(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users(id),campaign text NOT NULL,prize jsonb NOT NULL,expires_at timestamptz NOT NULL DEFAULT now()+interval '7 days',order_code text,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(user_id,campaign));
ALTER TABLE public.spin_awards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own spin awards" ON public.spin_awards;
CREATE POLICY "own spin awards" ON public.spin_awards FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
GRANT SELECT ON public.spin_awards TO authenticated;
REVOKE ALL ON public.spin_awards FROM anon;
CREATE OR REPLACE FUNCTION public.get_spin_campaign() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT config FROM public.spin_campaigns WHERE id=1 $$;
REVOKE ALL ON FUNCTION public.get_spin_campaign() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_spin_campaign() TO anon,authenticated;
CREATE OR REPLACE FUNCTION public.draw_spin() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c jsonb; a public.spin_awards%ROWTYPE; p jsonb; target numeric; acc numeric:=0; total numeric; u uuid:=auth.uid();
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED'; END IF;
 SELECT config INTO c FROM public.spin_campaigns WHERE id=1 FOR SHARE;
 IF NOT coalesce((c->>'enabled')::boolean,false) THEN RAISE EXCEPTION 'SPIN_DISABLED'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(u::text||coalesce(c->>'campaign',''),0));
 SELECT * INTO a FROM public.spin_awards WHERE user_id=u AND campaign=c->>'campaign';
 IF FOUND THEN RETURN to_jsonb(a); END IF;
 IF jsonb_array_length(c->'prizes') NOT BETWEEN 2 AND 8 THEN RAISE EXCEPTION 'INVALID_PRIZES'; END IF;
 SELECT sum((x->>'weight')::numeric) INTO total FROM jsonb_array_elements(c->'prizes') x;
 IF total IS NULL OR total<=0 OR EXISTS(SELECT 1 FROM jsonb_array_elements(c->'prizes') x WHERE coalesce((x->>'weight')::numeric,0)<=0) THEN RAISE EXCEPTION 'INVALID_WEIGHTS'; END IF;
 target:=random()*total;
 FOR p IN SELECT x FROM jsonb_array_elements(c->'prizes') x LOOP
  acc:=acc+(p->>'weight')::numeric; EXIT WHEN target<acc;
 END LOOP;
 IF p->>'kind' NOT IN ('offer','gift','fixed','percent','delivery') OR coalesce((p->>'value')::integer,0)<0 OR (p->>'kind'='percent' AND (p->>'value')::integer>100) THEN RAISE EXCEPTION 'INVALID_PRIZE'; END IF;
 INSERT INTO public.spin_awards(user_id,campaign,prize) VALUES(u,c->>'campaign',p) RETURNING * INTO a;
 RETURN to_jsonb(a);
END $$;
REVOKE ALL ON FUNCTION public.draw_spin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.draw_spin() TO authenticated;
CREATE OR REPLACE FUNCTION public.quote_spin(_award uuid,_subtotal integer,_delivery integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.spin_awards%ROWTYPE; d integer:=0;
BEGIN
 SELECT * INTO a FROM public.spin_awards WHERE id=_award AND user_id=auth.uid();
 IF NOT FOUND OR a.order_code IS NOT NULL OR a.expires_at<=now() THEN RAISE EXCEPTION 'SPIN_EXPIRED'; END IF;
 IF _subtotal<coalesce((a.prize->>'minimum')::integer,0) THEN RAISE EXCEPTION 'SPIN_MINIMUM'; END IF;
 d:=CASE a.prize->>'kind' WHEN 'fixed' THEN least(_subtotal,(a.prize->>'value')::integer) WHEN 'percent' THEN least(_subtotal,floor(_subtotal::numeric*(a.prize->>'value')::integer/100)::integer) WHEN 'delivery' THEN greatest(_delivery,0) ELSE 0 END;
 RETURN jsonb_build_object('discount',greatest(d,0),'prize',a.prize,'award',a.id);
END $$;
REVOKE ALL ON FUNCTION public.quote_spin(uuid,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.quote_spin(uuid,integer,integer) TO authenticated;
CREATE OR REPLACE FUNCTION public.place_spin_order(_award uuid,_expected_discount integer,_name text,_phone text,_address text,_area text,_payment text,_note text,_items jsonb,_offer_id uuid DEFAULT NULL,_qty integer DEFAULT 1) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.spin_awards%ROWTYPE; c text; o public.orders%ROWTYPE; d integer;
BEGIN
 SELECT * INTO a FROM public.spin_awards WHERE id=_award AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'SPIN_INVALID'; END IF;
 IF a.order_code IS NOT NULL THEN RETURN a.order_code; END IF;
 IF a.expires_at<=now() THEN RAISE EXCEPTION 'SPIN_EXPIRED'; END IF;
 IF a.prize->>'kind' NOT IN ('fixed','percent','delivery') THEN RAISE EXCEPTION 'SPIN_NOT_DISCOUNT'; END IF;
 IF _offer_id IS NOT NULL THEN c:=public.place_offer_order(_offer_id,_qty,_name,_phone,_address,_area,_payment,_note); ELSE c:=public.place_order(_name,_phone,_address,_area,_payment,'',_items,_note); END IF;
 SELECT * INTO o FROM public.orders WHERE code=c;
 d:=(public.quote_spin(_award,o.subtotal,o.delivery_fee)->>'discount')::integer;
 IF d IS DISTINCT FROM _expected_discount THEN RAISE EXCEPTION 'SPIN_CHANGED'; END IF;
 UPDATE public.orders SET discount_amount=d,promo_code='SPIN',total=subtotal+delivery_fee-d WHERE code=c;
 UPDATE public.spin_awards SET order_code=c WHERE id=_award;
 RETURN c;
END $$;
REVOKE ALL ON FUNCTION public.place_spin_order(uuid,integer,text,text,text,text,text,text,jsonb,uuid,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_spin_order(uuid,integer,text,text,text,text,text,text,jsonb,uuid,integer) TO authenticated;
COMMIT;
NOTIFY pgrst,'reload schema';
