BEGIN;
CREATE TABLE IF NOT EXISTS public.app_ui_settings (
 id integer PRIMARY KEY DEFAULT 1 CHECK(id=1), icons jsonb NOT NULL DEFAULT '{}'::jsonb,
 fonts jsonb NOT NULL DEFAULT '{}'::jsonb, shortcuts jsonb NOT NULL DEFAULT '{}'::jsonb,
 ticker_link text NOT NULL DEFAULT ''
);
INSERT INTO public.app_ui_settings(id) VALUES(1) ON CONFLICT DO NOTHING;
ALTER TABLE public.app_ui_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ui public read" ON public.app_ui_settings;
CREATE POLICY "ui public read" ON public.app_ui_settings FOR SELECT TO anon,authenticated USING(true);
DROP POLICY IF EXISTS "ui admin write" ON public.app_ui_settings;
CREATE POLICY "ui admin write" ON public.app_ui_settings FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
GRANT SELECT ON public.app_ui_settings TO anon,authenticated;
GRANT INSERT,UPDATE,DELETE ON public.app_ui_settings TO authenticated;
GRANT ALL ON public.app_ui_settings TO service_role;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS district_id text NOT NULL DEFAULT '';
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS upazila_id text NOT NULL DEFAULT '';
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS street_address text NOT NULL DEFAULT '';
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS local_area text NOT NULL DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid_amount integer DEFAULT NULL CHECK(paid_amount >= 0);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unverified';
CREATE TABLE IF NOT EXISTS public.order_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,status text NOT NULL,occurred_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.order_events TO authenticated;
GRANT ALL ON public.order_events TO service_role;
DROP POLICY IF EXISTS "customer events" ON public.order_events;
CREATE POLICY "customer events" ON public.order_events FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.orders o WHERE o.id=order_id AND o.user_id=auth.uid()));
CREATE TABLE IF NOT EXISTS public.payment_sessions (
 id uuid PRIMARY KEY, order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id), transaction_id text NOT NULL UNIQUE,
 method text NOT NULL CHECK(method IN('bkash','online','nagad')), amount integer NOT NULL CHECK(amount>0), status text NOT NULL,
 gateway_url text, provider_session text, created_at timestamptz NOT NULL DEFAULT now(), paid_at timestamptz
);
ALTER TABLE public.payment_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_sessions FROM anon,authenticated;
GRANT ALL ON public.payment_sessions TO service_role;
CREATE OR REPLACE FUNCTION public.complete_gateway_payment(_session_id uuid,_transaction_id text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE ps public.payment_sessions; o public.orders;
BEGIN
 SELECT * INTO ps FROM public.payment_sessions WHERE id=_session_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Unknown payment'; END IF;
 IF ps.status='paid' THEN RETURN; END IF;
 SELECT * INTO o FROM public.orders WHERE id=ps.order_id FOR UPDATE;
 IF o.payment_status='paid' OR o.status='cancelled' THEN RAISE EXCEPTION 'Order requires review'; END IF;
 IF ps.amount<>o.total-coalesce(o.paid_amount,0) THEN RAISE EXCEPTION 'Amount mismatch'; END IF;
 UPDATE public.orders SET paid_amount=total,payment_status='paid',trx_id=left(_transaction_id,50) WHERE id=o.id;
 UPDATE public.payment_sessions SET status='paid',paid_at=now() WHERE id=ps.id;
END $$;
REVOKE ALL ON FUNCTION public.complete_gateway_payment(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_gateway_payment(uuid,text) TO service_role;
CREATE OR REPLACE FUNCTION public.initialize_order_payment() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN NEW.paid_amount:=0;NEW.payment_status:='unpaid';RETURN NEW;END $$;
DROP TRIGGER IF EXISTS initialize_order_payment ON public.orders;
CREATE TRIGGER initialize_order_payment BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.initialize_order_payment();
CREATE OR REPLACE FUNCTION public.record_order_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_OP='INSERT' THEN INSERT INTO public.order_events(order_id,status,occurred_at) VALUES(NEW.id,NEW.status,NEW.created_at);
 ELSIF NEW.status IS DISTINCT FROM OLD.status THEN INSERT INTO public.order_events(order_id,status) VALUES(NEW.id,NEW.status); END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.record_order_event() FROM PUBLIC;
DROP TRIGGER IF EXISTS record_order_event ON public.orders;
CREATE TRIGGER record_order_event AFTER INSERT OR UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.record_order_event();

NOTIFY pgrst,'reload schema';
COMMIT;
