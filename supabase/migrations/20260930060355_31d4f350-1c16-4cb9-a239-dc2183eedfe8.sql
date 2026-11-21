create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, full_name text not null default '', phone text not null default '', email text not null default '', avatar text not null default '', updated_at timestamptz not null default now());
grant select, insert, update on public.profiles to authenticated; grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid());
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create table public.addresses (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, label text not null default '', name text not null, phone text not null, address text not null, area text not null default 'dhaka' check (area in ('dhaka','outside')), is_default boolean not null default false, created_at timestamptz not null default now());
grant select, insert, update, delete on public.addresses to authenticated; grant all on public.addresses to service_role;
alter table public.addresses enable row level security;
create policy "own addresses" on public.addresses for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.orders add column user_id uuid references auth.users(id) on delete set null;
create policy "own orders read" on public.orders for select to authenticated using (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.place_order(_name text, _phone text, _address text, _area text, _payment text, _trx text, _items jsonb, _note text)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare it jsonb; p record; sub int := 0; fee int; lines jsonb := '[]'; q int; c text; chosen jsonb; unit_price int; variant_id text; variant_label text;
begin
  if coalesce(trim(_name),'')='' or coalesce(trim(_phone),'')='' or coalesce(trim(_address),'')='' then raise exception 'missing fields'; end if;
  if jsonb_array_length(_items) = 0 then raise exception 'empty cart'; end if;
  for it in select * from jsonb_array_elements(_items) loop
    q := greatest(1, least(99, (it->>'qty')::int));
    select * into p from public.products where id = (it->>'id')::uuid and active;
    if not found then raise exception 'product not found'; end if;
    variant_id := nullif(it->>'variantId','');
    chosen := null;
    if variant_id is not null then
      select value into chosen from jsonb_array_elements(p.variants) where value->>'id'=variant_id limit 1;
      if chosen is null then raise exception 'invalid product option'; end if;
    end if;
    unit_price := coalesce((chosen->>'price')::int,p.price);
    variant_label := coalesce(chosen->>'label_bn','');
    sub := sub + unit_price*q;
    lines := lines || jsonb_build_object('id',p.id,'name',p.name_bn,'price',unit_price,'qty',q,'variantId',variant_id,'variant',variant_label,'image',coalesce(chosen->>'image',p.image));
  end loop;
  fee := case when _area='dhaka' then 80 else 120 end;
  c := 'EC' || to_char(now(),'YYMMDD') || lpad((floor(random()*10000))::int::text,4,'0');
  insert into public.orders(code,customer_name,phone,address,area,payment_method,trx_id,items,subtotal,delivery_fee,total,note,user_id)
  values (c,left(_name,100),left(_phone,20),left(_address,500),_area,_payment,nullif(left(_trx,50),''),lines,sub,fee,sub+fee,left(_note,500),auth.uid());
  return c;
end $function$;