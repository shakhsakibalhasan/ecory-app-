ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS sku text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS in_stock boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS offer_text_bn text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS short_bn text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS short_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ingredients_bn text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ingredients_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS related jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS badges jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_locked boolean NOT NULL DEFAULT true;

CREATE TABLE public.categories (
  key text PRIMARY KEY,
  name_bn text NOT NULL,
  name_en text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT '',
  visible boolean NOT NULL DEFAULT true,
  sort integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin write" ON public.categories FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE TABLE public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image text NOT NULL,
  link text NOT NULL DEFAULT '',
  alt_bn text NOT NULL DEFAULT '',
  visible boolean NOT NULL DEFAULT true,
  sort integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.banners TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.banners TO authenticated;
GRANT ALL ON public.banners TO service_role;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON public.banners FOR SELECT TO anon, authenticated USING (visible OR has_role(auth.uid(),'admin'));
CREATE POLICY "admin write" ON public.banners FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE TABLE public.outlets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  photo text NOT NULL DEFAULT '',
  map_url text NOT NULL DEFAULT '',
  visible boolean NOT NULL DEFAULT true,
  sort integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.outlets TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.outlets TO authenticated;
GRANT ALL ON public.outlets TO service_role;
ALTER TABLE public.outlets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON public.outlets FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin write" ON public.outlets FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor uuid,
  table_name text NOT NULL,
  row_id text NOT NULL,
  action text NOT NULL,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read" ON public.audit_log FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.log_product_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.audit_log(actor,table_name,row_id,action,changes)
  VALUES (auth.uid(),'products',coalesce(NEW.id,OLD.id)::text,TG_OP,
    CASE WHEN TG_OP='UPDATE' THEN jsonb_build_object('price',jsonb_build_array(OLD.price,NEW.price),'old_price',jsonb_build_array(OLD.old_price,NEW.old_price),'status',jsonb_build_array(OLD.status,NEW.status),'variants_changed',OLD.variants IS DISTINCT FROM NEW.variants,'content_changed',(OLD.desc_bn,OLD.name_bn,OLD.image) IS DISTINCT FROM (NEW.desc_bn,NEW.name_bn,NEW.image))
    ELSE '{}'::jsonb END);
  RETURN coalesce(NEW,OLD);
END $$;
CREATE TRIGGER products_audit AFTER INSERT OR UPDATE OR DELETE ON public.products FOR EACH ROW EXECUTE FUNCTION public.log_product_change();

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sources text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS reviewed_at date;
DROP POLICY IF EXISTS "public read" ON public.posts;
CREATE POLICY "public read" ON public.posts FOR SELECT TO anon, authenticated USING (status='published' OR has_role(auth.uid(),'admin'));

ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS rating integer CHECK (rating BETWEEN 1 AND 5);

ALTER TABLE public.certifications
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS valid_until text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS doc_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sort integer NOT NULL DEFAULT 0;

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS imo text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS facebook text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS instagram text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tiktok text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS youtube text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fee_dhaka integer NOT NULL DEFAULT 80,
  ADD COLUMN IF NOT EXISTS fee_outside integer NOT NULL DEFAULT 120,
  ADD COLUMN IF NOT EXISTS free_delivery_min integer,
  ADD COLUMN IF NOT EXISTS payments jsonb NOT NULL DEFAULT '{"cod":true,"bkash":true,"nagad":true,"online":false}'::jsonb,
  ADD COLUMN IF NOT EXISTS home_sections jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking text NOT NULL DEFAULT '';

-- stop auto-promoting first signup
DROP TRIGGER IF EXISTS on_auth_user_first_admin ON auth.users;

CREATE OR REPLACE FUNCTION public.place_order(_name text, _phone text, _address text, _area text, _payment text, _trx text, _items jsonb, _note text)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare it jsonb; p record; s record; sub int := 0; fee int; lines jsonb := '[]'; q int; c text; chosen jsonb; unit_price int; variant_id text; variant_label text;
begin
  if coalesce(trim(_name),'')='' or coalesce(trim(_phone),'')='' or coalesce(trim(_address),'')='' then raise exception 'missing fields'; end if;
  if jsonb_array_length(_items) = 0 then raise exception 'empty cart'; end if;
  select * into s from public.site_settings where id=1;
  if s.payments is not null and coalesce((s.payments->>_payment)::boolean,false) = false then raise exception 'payment method unavailable'; end if;
  for it in select * from jsonb_array_elements(_items) loop
    q := greatest(1, least(99, (it->>'qty')::int));
    select * into p from public.products where id = (it->>'id')::uuid and active and status='published';
    if not found then raise exception 'product not found'; end if;
    variant_id := nullif(it->>'variantId','');
    chosen := null;
    if variant_id is not null then
      select value into chosen from jsonb_array_elements(p.variants) where value->>'id'=variant_id and coalesce((value->>'disabled')::boolean,false)=false limit 1;
      if chosen is null then raise exception 'invalid product option'; end if;
    end if;
    unit_price := coalesce((chosen->>'price')::int,p.price);
    variant_label := coalesce(chosen->>'label_bn','');
    sub := sub + unit_price*q;
    lines := lines || jsonb_build_object('id',p.id,'name',p.name_bn,'price',unit_price,'qty',q,'variantId',variant_id,'variant',variant_label,'image',coalesce(chosen->>'image',p.image));
  end loop;
  fee := case when _area='dhaka' then coalesce(s.fee_dhaka,80) else coalesce(s.fee_outside,120) end;
  if s.free_delivery_min is not null and sub >= s.free_delivery_min then fee := 0; end if;
  c := 'EC' || to_char(now(),'YYMMDD') || lpad((floor(random()*10000))::int::text,4,'0');
  insert into public.orders(code,customer_name,phone,address,area,payment_method,trx_id,items,subtotal,delivery_fee,total,note,user_id)
  values (c,left(_name,100),left(_phone,20),left(_address,500),_area,_payment,nullif(left(_trx,50),''),lines,sub,fee,sub+fee,left(_note,500),auth.uid());
  return c;
end $function$;

DROP FUNCTION IF EXISTS public.track_order(text,text);
CREATE FUNCTION public.track_order(_code text, _phone text)
 RETURNS TABLE(code text, status text, total integer, delivery_fee integer, payment_method text, items jsonb, created_at timestamptz, tracking text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ select o.code,o.status,o.total,o.delivery_fee,o.payment_method,o.items,o.created_at,o.tracking from public.orders o where o.code = upper(trim(_code)) and o.phone = trim(_phone) $$;

CREATE POLICY "media public read" ON storage.objects FOR SELECT USING (bucket_id='media');
CREATE POLICY "media admin insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='media' AND has_role(auth.uid(),'admin'));
CREATE POLICY "media admin update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='media' AND has_role(auth.uid(),'admin'));
CREATE POLICY "media admin delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='media' AND has_role(auth.uid(),'admin'));