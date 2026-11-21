BEGIN;
-- Admin-only aggregate of all recorded spin awards; no customer tokens exposed.
CREATE OR REPLACE FUNCTION public.admin_spin_dashboard() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.has_role(auth.uid(),'admin'),false) THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 WITH awards AS (
  SELECT *, CASE WHEN order_code IS NOT NULL THEN 'used' WHEN expires_at<=now() THEN 'expired' ELSE 'available' END state
  FROM public.guest_spin_awards
 ), prize_groups AS (
  SELECT campaign, prize->>'id' prize_id, coalesce(prize->>'name_bn','নামহীন পুরস্কার') name,
   prize->>'coupon' coupon, count(*) won, count(*) FILTER(WHERE state='used') used,
   count(*) FILTER(WHERE state='available') available, count(*) FILTER(WHERE state='expired') expired
  FROM awards GROUP BY campaign,prize->>'id',prize->>'name_bn',prize->>'coupon'
 )
 SELECT jsonb_build_object('summary',(SELECT jsonb_build_object(
   'total',count(*),'people',count(DISTINCT phone),'used',count(*) FILTER(WHERE state='used'),
   'available',count(*) FILTER(WHERE state='available'),'expired',count(*) FILTER(WHERE state='expired'),
   'linked',count(*) FILTER(WHERE user_id IS NOT NULL),'campaigns',count(DISTINCT campaign),
   'today',count(*) FILTER(WHERE (created_at AT TIME ZONE 'Asia/Dhaka')::date=(now() AT TIME ZONE 'Asia/Dhaka')::date)
 ) FROM awards), 'prizes',coalesce((SELECT jsonb_agg(to_jsonb(g) ORDER BY won DESC,campaign,name) FROM prize_groups g),'[]'::jsonb),
 'generated_at',now()) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_spin_dashboard() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_spin_dashboard() TO authenticated;
CREATE OR REPLACE FUNCTION public.admin_spin_participants(_page integer DEFAULT 0,_search text DEFAULT '',_state text DEFAULT 'all') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.has_role(auth.uid(),'admin'),false) THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 IF _page IS NULL OR _page<0 OR _page>100000 OR _state NOT IN('all','available','used','expired') THEN RAISE EXCEPTION 'INVALID_FILTER'; END IF;
 WITH filtered AS(SELECT *,CASE WHEN order_code IS NOT NULL THEN 'used' WHEN expires_at<=now() THEN 'expired' ELSE 'available' END AS state FROM public.guest_spin_awards WHERE length(coalesce(_search,''))<=100 AND (coalesce(_search,'')='' OR customer_name ILIKE '%'||_search||'%' OR phone ILIKE '%'||_search||'%' OR campaign ILIKE '%'||_search||'%')), selected AS(SELECT * FROM filtered WHERE _state='all' OR state=_state),paged AS(SELECT * FROM selected ORDER BY created_at DESC,id LIMIT 25 OFFSET _page*25)
 SELECT jsonb_build_object('total',(SELECT count(*) FROM selected),'rows',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'campaign',campaign,'name',customer_name,'phone',phone,'prize',prize->>'name_bn','coupon',prize->>'coupon','state',state,'created_at',created_at,'expires_at',expires_at,'order_code',order_code,'linked',user_id IS NOT NULL,'prize_details',prize-'eligible'-'weight') ORDER BY created_at DESC,id) FROM paged),'[]'::jsonb)) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_spin_participants(integer,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_spin_participants(integer,text,text) TO authenticated;

COMMIT;
