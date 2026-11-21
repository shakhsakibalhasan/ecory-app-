BEGIN;
CREATE TABLE IF NOT EXISTS public.doctor_customer_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,reviewer_name text NOT NULL CHECK(length(reviewer_name) BETWEEN 1 AND 80),
 rating integer NOT NULL CHECK(rating BETWEEN 1 AND 5),body text NOT NULL CHECK(length(body) BETWEEN 3 AND 2000),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(doctor_id,user_id)
);
ALTER TABLE public.doctor_customer_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.doctor_customer_reviews FROM anon,authenticated;
CREATE INDEX IF NOT EXISTS doctor_customer_reviews_listing ON public.doctor_customer_reviews(doctor_id,created_at DESC);
CREATE OR REPLACE VIEW public.doctor_public_reviews AS SELECT id,doctor_id,reviewer_name,rating,body,created_at FROM public.doctor_customer_reviews;
GRANT SELECT ON public.doctor_public_reviews TO anon,authenticated;
CREATE OR REPLACE FUNCTION public.submit_doctor_review(p_doctor uuid,p_rating integer,p_body text,p_name text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED';END IF;
 IF p_rating IS NULL OR p_rating NOT BETWEEN 1 AND 5 OR p_body IS NULL OR length(trim(p_body)) NOT BETWEEN 3 AND 2000 OR p_name IS NULL OR length(trim(p_name)) NOT BETWEEN 1 AND 80 THEN RAISE EXCEPTION 'INVALID_REVIEW';END IF;
 INSERT INTO public.doctor_customer_reviews(doctor_id,user_id,reviewer_name,rating,body) VALUES(p_doctor,auth.uid(),trim(p_name),p_rating,trim(p_body)) ON CONFLICT(doctor_id,user_id) DO UPDATE SET reviewer_name=EXCLUDED.reviewer_name,rating=EXCLUDED.rating,body=EXCLUDED.body,updated_at=now();
END $$;
REVOKE ALL ON FUNCTION public.submit_doctor_review(uuid,integer,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_doctor_review(uuid,integer,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.doctor_review_summary(p_doctor uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT jsonb_build_object('rating',round(avg(rating),1),'count',count(*)) FROM public.doctor_customer_reviews WHERE doctor_id=p_doctor $$;
REVOKE ALL ON FUNCTION public.doctor_review_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.doctor_review_summary(uuid) TO anon,authenticated;
COMMIT;
