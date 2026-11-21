-- Run once. No product/order/account data is changed.
create table if not exists public.admin_translation_usage (
 user_id uuid not null references auth.users(id) on delete cascade,
 usage_day date not null,
 requests integer not null default 0,
 characters integer not null default 0,
 primary key(user_id,usage_day)
);
alter table public.admin_translation_usage enable row level security;
revoke all on public.admin_translation_usage from anon, authenticated;
create or replace function public.admin_translation_claim(_characters integer)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare allowed boolean;
begin
 if auth.uid() is null or not public.has_role(auth.uid(),'admin') then raise exception 'admin required'; end if;
 if _characters < 1 or _characters > 12000 then return false; end if;
 insert into public.admin_translation_usage(user_id,usage_day,requests,characters)
 values(auth.uid(),(now() at time zone 'Asia/Dhaka')::date,1,_characters)
 on conflict(user_id,usage_day) do update set requests=admin_translation_usage.requests+1,characters=admin_translation_usage.characters+excluded.characters
 where admin_translation_usage.requests < 300 and admin_translation_usage.characters+excluded.characters <= 100000
 returning true into allowed;
 return coalesce(allowed,false);
end $$;
revoke all on function public.admin_translation_claim(integer) from public,anon;
grant execute on function public.admin_translation_claim(integer) to authenticated;
