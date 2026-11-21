BEGIN;
CREATE TABLE IF NOT EXISTS public.offers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title_bn text NOT NULL DEFAULT '', title_en text NOT NULL DEFAULT '',
 description_bn text NOT NULL DEFAULT '', description_en text NOT NULL DEFAULT '', image text NOT NULL DEFAULT '',
 product_id uuid REFERENCES public.products(id) ON DELETE SET NULL, link text NOT NULL DEFAULT '',
 price integer CHECK(price > 0), old_price integer, visible boolean NOT NULL DEFAULT false,
 sort integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(old_price IS NULL OR (price IS NOT NULL AND old_price > price))
);
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ecory published offers" ON public.offers;
CREATE POLICY "Ecory published offers" ON public.offers FOR SELECT TO anon,authenticated USING(visible OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Ecory admin offers" ON public.offers;
CREATE POLICY "Ecory admin offers" ON public.offers FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
GRANT SELECT ON public.offers TO anon,authenticated;
GRANT INSERT,UPDATE,DELETE ON public.offers TO authenticated;
DROP POLICY IF EXISTS "Ecory admin product deletion" ON public.products;
CREATE POLICY "Ecory admin product deletion" ON public.products FOR DELETE TO authenticated USING(public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Ecory admin category deletion" ON public.categories;
CREATE POLICY "Ecory admin category deletion" ON public.categories FOR DELETE TO authenticated USING(public.has_role(auth.uid(),'admin'));
GRANT DELETE ON public.products,public.categories TO authenticated;
-- Remove Offer from customer categories without deleting their products.
UPDATE public.categories SET visible=false WHERE lower(key) ~ 'offer' OR name_bn ~ 'অফার' OR lower(name_en) ~ 'offer';
NOTIFY pgrst,'reload schema';
COMMIT;
