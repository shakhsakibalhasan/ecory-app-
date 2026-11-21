-- Validate every normal checkout on the server, including promo/spin wrappers.
BEGIN;
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
    if coalesce(it->>'qty','') !~ '^[0-9]{1,2}$' then raise exception 'invalid quantity'; end if;
    q := (it->>'qty')::int;
    if q < 1 or q > 99 then raise exception 'invalid quantity'; end if;
    select * into p from public.products where id = (it->>'id')::uuid and active and status='published';
    if not found then raise exception 'product not found'; end if;
    if not p.in_stock then raise exception 'product out of stock'; end if;
    variant_id := nullif(it->>'variantId','');
    chosen := null;
    if variant_id is not null then
      select value into chosen from jsonb_array_elements(p.variants) where value->>'id'=variant_id and coalesce((value->>'disabled')::boolean,false)=false limit 1;
      if chosen is null then raise exception 'invalid product option'; end if;
      if coalesce((chosen->>'in_stock')::boolean,true)=false then raise exception 'product option out of stock'; end if;
    end if;
    if variant_id is null and exists (select 1 from jsonb_array_elements(coalesce(p.variants,'[]'::jsonb)) v where coalesce((v->>'disabled')::boolean,false)=false) then raise exception 'select a product option'; end if;
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
-- Aggregate only public review ratings; no private customer/media data returned.
CREATE OR REPLACE FUNCTION public.public_product_review_stats()
RETURNS TABLE(product_id uuid, count bigint, rating numeric)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT r.product_id, count(*),
    avg(r.rating::numeric) FILTER (WHERE r.rating BETWEEN 1 AND 5)
  FROM public.reviews r
  WHERE r.hidden = false AND r.product_id IS NOT NULL
  GROUP BY r.product_id;
$$;
GRANT EXECUTE ON FUNCTION public.public_product_review_stats() TO anon, authenticated;

COMMIT;
