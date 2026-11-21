create type public.app_role as enum ('admin','user');
create table public.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, role app_role not null, unique(user_id, role));
grant select on public.user_roles to authenticated; grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create or replace function public.has_role(_user_id uuid, _role app_role) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.user_roles where user_id=_user_id and role=_role) $$;
create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.handle_first_admin() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles where role='admin') then
    insert into public.user_roles(user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_first_admin after insert on auth.users for each row execute function public.handle_first_admin();

create table public.products (id uuid primary key default gen_random_uuid(), name_bn text not null, name_en text not null default '', price int not null, old_price int, image text not null default '', category text not null default 'other', desc_bn text not null default '', desc_en text not null default '', active boolean not null default true, sort int not null default 0, created_at timestamptz not null default now());
create table public.site_settings (id int primary key default 1 check (id=1), banner_title_bn text not null default '', banner_title_en text not null default '', banner_sub_bn text not null default '', banner_sub_en text not null default '', banner_image text not null default '', support_phone text not null default '', whatsapp text not null default '', bkash text not null default '', nagad text not null default '');
create table public.posts (id uuid primary key default gen_random_uuid(), kind text not null default 'article' check (kind in ('article','tip')), title_bn text not null, title_en text not null default '', body_bn text not null default '', body_en text not null default '', image text not null default '', created_at timestamptz not null default now());
create table public.reviews (id uuid primary key default gen_random_uuid(), name text not null default '', text_bn text not null default '', media_url text not null, media_type text not null default 'image' check (media_type in ('image','video')), created_at timestamptz not null default now());
create table public.doctors (id uuid primary key default gen_random_uuid(), name text not null, degree text not null default '', specialty_bn text not null default '', specialty_en text not null default '', experience text not null default '', phone text not null default '', whatsapp text not null default '', photo text not null default '', schedule text not null default '', created_at timestamptz not null default now());
create table public.certifications (id uuid primary key default gen_random_uuid(), title text not null, issuer text not null default '', cert_no text not null default '', image text not null default '', created_at timestamptz not null default now());
create table public.orders (id uuid primary key default gen_random_uuid(), code text not null unique, customer_name text not null, phone text not null, address text not null, area text not null check (area in ('dhaka','outside')), payment_method text not null check (payment_method in ('cod','bkash','nagad','online')), trx_id text, items jsonb not null, subtotal int not null, delivery_fee int not null, total int not null, status text not null default 'pending' check (status in ('pending','confirmed','shipped','delivered','cancelled')), note text, created_at timestamptz not null default now());

do $$ declare t text; begin
foreach t in array array['products','site_settings','posts','reviews','doctors','certifications'] loop
  execute format('grant select on public.%I to anon, authenticated', t);
  execute format('grant insert, update, delete on public.%I to authenticated', t);
  execute format('grant all on public.%I to service_role', t);
  execute format('alter table public.%I enable row level security', t);
  execute format('create policy "public read" on public.%I for select to anon, authenticated using (true)', t);
  execute format('create policy "admin write" on public.%I for all to authenticated using (public.has_role(auth.uid(),''admin'')) with check (public.has_role(auth.uid(),''admin''))', t);
end loop; end $$;

grant select, update, delete on public.orders to authenticated; grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "admin orders" on public.orders for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create or replace function public.place_order(_name text, _phone text, _address text, _area text, _payment text, _trx text, _items jsonb, _note text)
returns text language plpgsql security definer set search_path = public as $$
declare it jsonb; p record; sub int := 0; fee int; lines jsonb := '[]'; q int; c text;
begin
  if coalesce(trim(_name),'')='' or coalesce(trim(_phone),'')='' or coalesce(trim(_address),'')='' then raise exception 'missing fields'; end if;
  if jsonb_array_length(_items) = 0 then raise exception 'empty cart'; end if;
  for it in select * from jsonb_array_elements(_items) loop
    q := greatest(1, least(99, (it->>'qty')::int));
    select * into p from public.products where id = (it->>'id')::uuid and active;
    if not found then raise exception 'product not found'; end if;
    sub := sub + p.price*q;
    lines := lines || jsonb_build_object('id',p.id,'name',p.name_bn,'price',p.price,'qty',q);
  end loop;
  fee := case when _area='dhaka' then 80 else 120 end;
  c := 'EC' || to_char(now(),'YYMMDD') || lpad((floor(random()*10000))::int::text,4,'0');
  insert into public.orders(code,customer_name,phone,address,area,payment_method,trx_id,items,subtotal,delivery_fee,total,note)
  values (c,left(_name,100),left(_phone,20),left(_address,500),_area,_payment,nullif(left(_trx,50),''),lines,sub,fee,sub+fee,left(_note,500));
  return c;
end $$;
grant execute on function public.place_order to anon, authenticated;

create or replace function public.track_order(_code text, _phone text)
returns table(code text, status text, total int, delivery_fee int, payment_method text, items jsonb, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select o.code,o.status,o.total,o.delivery_fee,o.payment_method,o.items,o.created_at from public.orders o where o.code = upper(trim(_code)) and o.phone = trim(_phone) $$;
grant execute on function public.track_order to anon, authenticated;

insert into public.site_settings(id,banner_title_bn,banner_title_en,banner_sub_bn,banner_sub_en,banner_image,support_phone,whatsapp,bkash,nagad) values
(1,'প্রকৃতির খাঁটি উপহার','Pure gifts of nature','সব প্রোডাক্টে বিশেষ ছাড়','Special discount on all products','https://ecorybd.com/wp-content/uploads/2026/01/Honey-web-7-300x300.jpg','01700000000','8801700000000','01700000000','01700000000');
insert into public.products(name_bn,name_en,price,old_price,image,category,desc_bn,desc_en,sort) values
('হানি কম্বো','Honey Combo',1390,1990,'https://ecorybd.com/wp-content/uploads/2026/01/Honey-web-7-300x300.jpg','honey','খাঁটি প্রাকৃতিক মধুর কম্বো প্যাক।','Combo pack of pure natural honey.',1),
('রোজেলা টি','Rosella Tea',590,690,'https://ecorybd.com/wp-content/uploads/2025/12/Roselle-Tea-100gm-1-300x300.jpg','tea','প্রাকৃতিক রোজেলা ফুলের চা।','Natural roselle flower tea.',2),
('ফ্লাওয়ার টি বক্স','Flower Tea Box',990,1470,'https://ecorybd.com/wp-content/uploads/2025/11/Flower-Tea-Combo-7-low-300x300.jpg','tea','বিভিন্ন ফুলের চায়ের বক্স।','Box of assorted flower teas.',3),
('শরবত-এ-বারাকাহ','Sherbet-e Barakah',690,null,'https://ecorybd.com/wp-content/uploads/2026/02/SB-5-300x300.jpg','herbal','প্রাকৃতিক উপাদানে তৈরি শরবত।','Sherbet made with natural ingredients.',4),
('সিসামাম ম্যাসাজ অয়েল','Sesamum Massage Oil',390,null,'https://ecorybd.com/wp-content/uploads/2026/05/SMO-1-1-300x300.jpg','oil','তিলের তেলের ম্যাসাজ অয়েল।','Sesame massage oil.',5),
('বরই পাতা মিক্স','Barai Pata Mix',590,null,'https://ecorybd.com/wp-content/uploads/2025/12/BPM-1-300x300.jpg','herbal','বরই পাতার প্রাকৃতিক মিশ্রণ।','Natural jujube leaf mix.',6);
insert into public.posts(kind,title_bn,title_en,body_bn,body_en) values
('tip','সকালে কুসুম গরম পানি','Warm water in the morning','সকালে খালি পেটে এক গ্লাস কুসুম গরম পানি পান করুন।','Drink a glass of warm water on an empty stomach.'),
('tip','মধু ও লেবু','Honey and lemon','কুসুম গরম পানিতে এক চামচ মধু ও লেবু মিশিয়ে পান করুন।','Mix a spoon of honey and lemon in warm water.'),
('tip','পর্যাপ্ত ঘুম','Enough sleep','প্রতিদিন ৭–৮ ঘণ্টা ঘুমান।','Sleep 7–8 hours daily.'),
('article','হারবাল চায়ের উপকারিতা','Benefits of herbal tea','হারবাল চা প্রাকৃতিক উপাদানে তৈরি এবং দৈনন্দিন জীবনে সতেজতা আনে। নিয়মিত পরিমিত পান করুন।','Herbal teas are made from natural ingredients and bring freshness to daily life. Drink in moderation.'),
('article','খাঁটি মধু চেনার উপায়','How to identify pure honey','খাঁটি মধু ঘন হয় এবং পানিতে সহজে মেশে না। বিশ্বস্ত উৎস থেকে কিনুন।','Pure honey is thick and does not dissolve easily in water. Buy from trusted sources.');
insert into public.doctors(name,degree,specialty_bn,specialty_en,experience,phone,whatsapp,schedule) values
('ডা. নমুনা নাম','BAMS','হারবাল ও প্রাকৃতিক চিকিৎসা','Herbal & natural medicine','১০ বছর','01700000000','8801700000000','প্রতিদিন সন্ধ্যা ৬–৯টা');
insert into public.certifications(title,issuer,cert_no) values ('BSTI সার্টিফিকেশন','BSTI','—');