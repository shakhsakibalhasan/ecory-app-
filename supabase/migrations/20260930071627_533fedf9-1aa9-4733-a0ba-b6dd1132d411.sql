CREATE TABLE public.favourites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favourites TO authenticated;
GRANT ALL ON public.favourites TO service_role;
ALTER TABLE public.favourites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers can read own favourites" ON public.favourites FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Customers can add own favourites" ON public.favourites FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Customers can update own favourites" ON public.favourites FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Customers can remove own favourites" ON public.favourites FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE OR REPLACE FUNCTION public.set_favourites_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER favourites_set_updated_at
BEFORE UPDATE ON public.favourites
FOR EACH ROW EXECUTE FUNCTION public.set_favourites_updated_at();