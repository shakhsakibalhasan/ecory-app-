revoke execute on function public.handle_first_admin() from public, anon, authenticated;
revoke execute on function public.has_role(uuid, app_role) from public, anon;
alter table public.products add column if not exists category_key text;
update public.products set category = case category when 'honey' then 'energy' when 'tea' then 'heart' when 'herbal' then 'stomach' when 'oil' then 'joint' else 'natural' end;