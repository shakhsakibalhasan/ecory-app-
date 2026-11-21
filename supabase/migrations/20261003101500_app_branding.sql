-- Public brand assets only. Admin writes retain the existing role check.
CREATE TABLE IF NOT EXISTS public.app_branding (
 id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
 name_bn text NOT NULL DEFAULT 'ইকোরি' CHECK (length(name_bn) BETWEEN 1 AND 80),
 name_en text NOT NULL DEFAULT 'Ecory' CHECK (length(name_en) BETWEEN 1 AND 80),
 admin_name text NOT NULL DEFAULT 'ইকোরি অ্যাডমিন' CHECK (length(admin_name) BETWEEN 1 AND 80),
 app_logo text NOT NULL DEFAULT '' CHECK (app_logo = '' OR app_logo ~ '^https://'),
 menu_logo text NOT NULL DEFAULT '' CHECK (menu_logo = '' OR menu_logo ~ '^https://'),
 admin_logo text NOT NULL DEFAULT '' CHECK (admin_logo = '' OR admin_logo ~ '^https://'),
 favicon text NOT NULL DEFAULT '' CHECK (favicon = '' OR favicon ~ '^https://'),
 android_icon text NOT NULL DEFAULT '' CHECK (android_icon = '' OR android_icon ~ '^https://')
);
ALTER TABLE public.app_branding ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public branding read" ON public.app_branding;
CREATE POLICY "public branding read" ON public.app_branding FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "admin branding write" ON public.app_branding;
CREATE POLICY "admin branding write" ON public.app_branding FOR ALL TO authenticated
 USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
GRANT SELECT ON public.app_branding TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.app_branding TO authenticated;
INSERT INTO public.app_branding (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
