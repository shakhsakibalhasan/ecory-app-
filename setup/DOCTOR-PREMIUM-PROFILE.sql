BEGIN;
-- Content fields only. Existing fees, bookings, payment functions and RLS stay intact.
ALTER TABLE public.doctors
 ADD COLUMN IF NOT EXISTS designation text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS designation_en text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS education text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS education_en text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS achievements text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS achievements_en text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS consultation_note text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS consultation_note_en text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS profile_position text NOT NULL DEFAULT 'center top';
COMMIT;
