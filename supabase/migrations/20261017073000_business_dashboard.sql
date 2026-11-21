BEGIN;
CREATE INDEX IF NOT EXISTS ecory_orders_created_report_idx ON public.orders(created_at);
CREATE OR REPLACE FUNCTION public.admin_business_report(_from date DEFAULT NULL,_to date DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE summary jsonb; statuses jsonb; daily jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.has_role(auth.uid(),'admin'),false) THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 IF _from IS NOT NULL AND _to IS NOT NULL AND _from>_to THEN RAISE EXCEPTION 'INVALID_DATE_RANGE'; END IF;
 WITH filtered AS(SELECT * FROM public.orders WHERE (_from IS NULL OR created_at>=(_from::timestamp AT TIME ZONE 'Asia/Dhaka')) AND (_to IS NULL OR created_at<((_to+1)::timestamp AT TIME ZONE 'Asia/Dhaka')))
 SELECT jsonb_build_object('count',count(*),'total',coalesce(sum(total),0),'delivered_count',count(*) FILTER(WHERE status='delivered'),'delivered_total',coalesce(sum(total) FILTER(WHERE status='delivered'),0),'cancelled_count',count(*) FILTER(WHERE status='cancelled'),'cancelled_total',coalesce(sum(total) FILTER(WHERE status='cancelled'),0),'open_count',count(*) FILTER(WHERE status IN('pending','confirmed','shipped')),'open_total',coalesce(sum(total) FILTER(WHERE status IN('pending','confirmed','shipped')),0),'active_total',coalesce(sum(total) FILTER(WHERE status<>'cancelled'),0),'paid_marked_total',coalesce(sum(total) FILTER(WHERE payment_status='paid'),0),'paid_marked_count',count(*) FILTER(WHERE payment_status='paid')) INTO summary FROM filtered;
 SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') INTO statuses FROM(SELECT status,count(*) AS count,coalesce(sum(total),0) AS total FROM public.orders WHERE (_from IS NULL OR created_at>=(_from::timestamp AT TIME ZONE 'Asia/Dhaka')) AND (_to IS NULL OR created_at<((_to+1)::timestamp AT TIME ZONE 'Asia/Dhaka')) GROUP BY status ORDER BY status)t;
 SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY day DESC),'[]') INTO daily FROM(SELECT (created_at AT TIME ZONE 'Asia/Dhaka')::date AS day,count(*) AS count,coalesce(sum(total),0) AS total,count(*) FILTER(WHERE status='delivered') AS delivered_count,coalesce(sum(total) FILTER(WHERE status='delivered'),0) AS delivered_total,count(*) FILTER(WHERE status='cancelled') AS cancelled_count FROM public.orders WHERE (_from IS NULL OR created_at>=(_from::timestamp AT TIME ZONE 'Asia/Dhaka')) AND (_to IS NULL OR created_at<((_to+1)::timestamp AT TIME ZONE 'Asia/Dhaka')) GROUP BY 1)t;
 RETURN jsonb_build_object('summary',summary,'statuses',statuses,'daily',daily,'generated_at',now());
END $$;
REVOKE ALL ON FUNCTION public.admin_business_report(date,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_business_report(date,date) TO authenticated;
COMMIT;
NOTIFY pgrst,'reload schema';
