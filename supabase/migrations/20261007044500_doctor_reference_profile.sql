BEGIN;
ALTER TABLE public.doctors
 ADD COLUMN IF NOT EXISTS availability text NOT NULL DEFAULT 'unknown' CHECK(availability IN ('unknown','online','offline')),
 ADD COLUMN IF NOT EXISTS followup_fee integer CHECK(followup_fee>=0),
 ADD COLUMN IF NOT EXISTS followup_days integer CHECK(followup_days>0),
 ADD COLUMN IF NOT EXISTS patients_seen integer CHECK(patients_seen>=0),
 ADD COLUMN IF NOT EXISTS joined_on date,
 ADD COLUMN IF NOT EXISTS doctor_code text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS consultation_minutes integer CHECK(consultation_minutes>0),
 ADD COLUMN IF NOT EXISTS profile_reviews jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(profile_reviews)='array'),
 ADD COLUMN IF NOT EXISTS profile_clips jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(profile_clips)='array');
NOTIFY pgrst,'reload schema';
COMMIT;
