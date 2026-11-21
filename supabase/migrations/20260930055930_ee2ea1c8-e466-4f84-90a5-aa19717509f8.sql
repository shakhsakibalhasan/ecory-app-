alter table public.reviews add column if not exists source_url text not null default '',
 add column if not exists product_id uuid references public.products(id) on delete set null,
 add column if not exists sort integer not null default 0,
 add column if not exists hidden boolean not null default false,
 add column if not exists aspect text not null default '16/9';