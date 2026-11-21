BEGIN;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS consultation_fee integer CHECK (consultation_fee >= 0);
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS consultation_free boolean NOT NULL DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS purpose_bn text NOT NULL DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS purpose_en text NOT NULL DEFAULT '';
-- Only fill empty short-use fields; preserve any existing Admin edits.
WITH verified_purposes(id, bn, en) AS (VALUES
  ('f33eca21-6626-4a0f-9379-5a94ceb6df49', 'হজমের যত্ন', 'Digestive care'),
  ('4f9ac95a-acdb-402d-a884-44f97b8fe75d', 'পেট ও হজমের যত্ন', 'Gut & digestive care'),
  ('d4566773-32f2-4900-96d3-d9e7251f4f5c', 'কোষ্ঠকাঠিন্যের যত্ন', 'Regularity care'),
  ('22dc4314-df6e-4257-979d-6f01af1ceb80', 'হজম ও পেটের যত্ন', 'Digestive & gut care'),
  ('7245d01a-a86b-4f0f-82b6-73a4bce2feb6', 'হার্টের যত্ন', 'Heart care'),
  ('878d9127-76ce-4399-a5d8-76cec103fb36', 'পেশি ও জয়েন্টের যত্ন', 'Muscle & joint care'),
  ('4158f24b-50e5-49b1-9220-7362e80f3568', 'পুষ্টি ও হজমের যত্ন', 'Nutrition & digestive care'),
  ('1322b114-71b3-4a17-823c-1cee7d721896', 'শক্তি ও কর্মক্ষমতা', 'Energy & stamina'),
  ('323ce042-c23e-45a9-9482-7888ac506230', 'ঘুম ও মানসিক স্বস্তি', 'Sleep & relaxation'),
  ('0756ad01-f0b1-4786-b78d-c63c2337f982', 'হজম ও পুষ্টি', 'Digestion & nutrition'),
  ('0c84071e-0642-450f-950a-45c2d8e7cdb7', 'শক্তি ও প্রাণবন্ততা', 'Energy & vitality'),
  ('2246bc6e-09f6-4527-8a0f-2a1ce1728262', 'হারবাল চা', 'Herbal tea'),
  ('2f418934-12e6-41bf-b67f-3c2562526180', 'ত্বকের যত্ন', 'Skin care'),
  ('0dcb9999-ee68-46e8-b5dc-074a2d38f4e9', 'শক্তি ও পুষ্টি', 'Energy & nutrition'),
  ('15bae787-fe1c-4e72-9ae2-1e63f2817afa', 'শ্বাসযন্ত্রের যত্ন', 'Respiratory care'),
  ('0eb89bda-1ce6-4897-afc0-1e3b88713a98', 'ব্লাড সুগারের যত্ন', 'Blood-sugar care'),
  ('6359afd0-2129-4dc8-9497-9a5a91525bed', 'শক্তি ও পুষ্টি', 'Energy & nutrition'),
  ('12a4d66c-a60e-40ca-b052-cb21bc5ed637', 'সতেজতা ও প্রশান্তি', 'Refreshment & relaxation'),
  ('7ce544ef-0933-415c-bdbd-1205b53d4440', 'শক্তি ও সতেজতা', 'Energy & refreshment'),
  ('4a80a812-4040-4ca5-8776-8c59e2c62513', 'হার্টের যত্ন', 'Heart care'),
  ('b312ba94-f020-438b-bf1a-3d20ce41c5b7', 'শক্তি ও পুষ্টি', 'Energy & nutrition'),
  ('a63099e2-5d5b-427e-8603-65e744a6073f', 'সতেজতা ও প্রশান্তি', 'Refreshment & relaxation'),
  ('4360b180-4010-4c97-920a-7bbf017fb68d', 'হারবাল চা', 'Herbal tea'),
  ('7bc68080-e44b-430d-8993-0019f5d4a2ad', 'পেশি ও জয়েন্টের যত্ন', 'Muscle & joint care'),
  ('9d43d5af-0f0e-49c2-86b6-aa4a2a8835f2', 'শক্তি ও সতেজতা', 'Energy & refreshment'),
  ('4fb3b054-4c60-446f-b40d-ab7456b3938e', 'শ্বাসযন্ত্রের যত্ন', 'Respiratory care'),
  ('ec1d65b9-52af-4d50-b756-d86af3f9261a', 'পেট ও হজমের যত্ন', 'Gut & digestive care')
)
UPDATE public.products p
SET purpose_bn = CASE WHEN COALESCE(btrim(p.purpose_bn), '') = '' THEN v.bn ELSE p.purpose_bn END,
    purpose_en = CASE WHEN COALESCE(btrim(p.purpose_en), '') = '' THEN v.en ELSE p.purpose_en END
FROM verified_purposes v WHERE p.id = v.id::uuid;
NOTIFY pgrst, 'reload schema';
COMMIT;
