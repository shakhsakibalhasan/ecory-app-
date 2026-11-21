BEGIN;
CREATE TABLE IF NOT EXISTS public.order_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
 status text NOT NULL, occurred_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin events" ON public.order_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
GRANT SELECT ON public.order_events TO authenticated;
-- Only original order creation times can be recovered reliably.
INSERT INTO public.order_events(order_id,status,occurred_at)
SELECT id,'pending',created_at FROM public.orders o WHERE NOT EXISTS (SELECT 1 FROM public.order_events e WHERE e.order_id=o.id);
CREATE OR REPLACE FUNCTION public.record_order_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_OP='INSERT' THEN INSERT INTO public.order_events(order_id,status,occurred_at) VALUES(NEW.id,NEW.status,NEW.created_at);
 ELSIF NEW.status IS DISTINCT FROM OLD.status THEN INSERT INTO public.order_events(order_id,status) VALUES(NEW.id,NEW.status); END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.record_order_event() FROM PUBLIC;
DROP TRIGGER IF EXISTS record_order_event ON public.orders;
CREATE TRIGGER record_order_event AFTER INSERT OR UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.record_order_event();
CREATE OR REPLACE FUNCTION public.track_order_details(_code text, _phone text) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
SELECT jsonb_build_object('code',o.code,'status',o.status,'customer_name',o.customer_name,'address',o.address,
 'total',o.total,'subtotal',o.subtotal,'delivery_fee',o.delivery_fee,'payment_method',o.payment_method,'items',o.items,
 'created_at',o.created_at,'tracking',o.tracking,'events',coalesce((SELECT jsonb_agg(jsonb_build_object('status',e.status,'occurred_at',e.occurred_at) ORDER BY e.occurred_at,e.id) FROM public.order_events e WHERE e.order_id=o.id),'[]'::jsonb))
FROM public.orders o WHERE length(trim(_code))>0 AND trim(_phone) ~ '^01[0-9]{9}$' AND o.code=upper(trim(_code)) AND o.phone=trim(_phone)
$$;
REVOKE ALL ON FUNCTION public.track_order_details(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_order_details(text,text) TO anon,authenticated;
COMMIT;
