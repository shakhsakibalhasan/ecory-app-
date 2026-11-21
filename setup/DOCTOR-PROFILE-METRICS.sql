BEGIN;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS profile_rating numeric(2,1) CHECK(profile_rating BETWEEN 0 AND 5), ADD COLUMN IF NOT EXISTS profile_review_count integer CHECK(profile_review_count >= 0);
COMMENT ON COLUMN public.doctors.profile_rating IS 'Admin recorded verified rating; not automatically calculated from product reviews';
COMMIT;
