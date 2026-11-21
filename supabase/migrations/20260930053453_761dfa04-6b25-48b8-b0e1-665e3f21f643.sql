-- Helper: set image_url on a variant matched by label
create or replace function public._tmp_set_variant_image(p_product_id uuid, p_label text, p_image text)
returns void language sql as $$
  update public.products
  set variants = (
    select jsonb_agg(case when v->>'label' = p_label then jsonb_set(v, '{image_url}', to_jsonb(p_image)) else v end)
    from jsonb_array_elements(variants) v
  )
  where id = p_product_id;
$$;

-- Kostocare
select public._tmp_set_variant_image('d4566773-32f2-4900-96d3-d9e7251f4f5c','২ ফাইল','/__l5e/assets-v1/2249cdff-1239-4d8d-8bdd-7c6a1909a533/pack-kosto-2.png');
select public._tmp_set_variant_image('d4566773-32f2-4900-96d3-d9e7251f4f5c','৩ ফাইল','/__l5e/assets-v1/e5dd0dc5-b73f-4136-87c7-772fbd8e6cc7/pack-kosto-3.png');
-- Thankuan
select public._tmp_set_variant_image('4f9ac95a-acdb-402d-a884-44f97b8fe75d','২ ফাইল','/__l5e/assets-v1/c631bfbd-50d4-4334-b450-ca759528949f/pack-thank-2.png');
select public._tmp_set_variant_image('4f9ac95a-acdb-402d-a884-44f97b8fe75d','৩ ফাইল','/__l5e/assets-v1/23507b7f-afe7-4b6f-b27b-7046a658d656/pack-thank-3.png');
-- Seed Mix
select public._tmp_set_variant_image('0756ad01-f0b1-4786-b78d-c63c2337f982','২ ফাইল','/__l5e/assets-v1/38cb9fa4-db94-411c-a2ee-15e879604f8a/pack-seed-2.png');
select public._tmp_set_variant_image('0756ad01-f0b1-4786-b78d-c63c2337f982','৩ ফাইল','/__l5e/assets-v1/ece6c8b3-4701-4cc4-ba45-09efa2a234bd/pack-seed-3.png');
-- Seed Mix Powder (২ ফাইল only; ৩ ফাইল price unconfirmed)
select public._tmp_set_variant_image('22dc4314-df6e-4257-9799-5a5a91525bed','২ ফাইল','/__l5e/assets-v1/fa300c98-a12d-4733-a502-2c536aa04f33/pack-seedp-2.png');
-- Arjun Mix
select public._tmp_set_variant_image('4a80a812-4040-4ca5-8776-8c59e2c62513','২ ফাইল','/__l5e/assets-v1/bbdb9c11-1bbe-4401-b5cf-1c9e08298f0b/pack-arjun-2.png');
select public._tmp_set_variant_image('4a80a812-4040-4ca5-8776-8c59e2c62513','৩ ফাইল','/__l5e/assets-v1/ba44a256-dbd6-4d7d-8829-4591a4546964/pack-arjun-3.png');
-- Sugarvez
select public._tmp_set_variant_image('0eb89bda-1ce6-4897-afc0-1e3b88713a98','২ ফাইল','/__l5e/assets-v1/7fb4bec4-5327-440f-aa86-966f4040bb5d/pack-sugar-2.png');
select public._tmp_set_variant_image('0eb89bda-1ce6-4897-afc0-1e3b88713a98','৩ ফাইল','/__l5e/assets-v1/ea2473e9-6444-4cba-b203-d6ed339b7dfe/pack-sugar-3.png');
-- Boroi Pata Mix
select public._tmp_set_variant_image('4fb3b054-4c60-446f-b40d-ab7456b3938e','২ ফাইল','/__l5e/assets-v1/69bf9dfc-1d83-4b6b-8a94-84fb6666c83e/pack-barai-2.png');
select public._tmp_set_variant_image('4fb3b054-4c60-446f-b40d-ab7456b3938e','৩ ফাইল','/__l5e/assets-v1/eb620089-4c3c-46e5-919d-e07d0cc88dbc/pack-barai-3.png');
-- Awshashakti
select public._tmp_set_variant_image('0c84071e-0642-450f-950a-45c2d8e7cdb7','২ ফাইল','/__l5e/assets-v1/2224d0fd-cce2-485f-9beb-c5d639221e90/pack-awsha-2.png');
select public._tmp_set_variant_image('0c84071e-0642-450f-950a-45c2d8e7cdb7','৩ ফাইল','/__l5e/assets-v1/f2b37f0b-c4f1-44e8-945d-75aefd64b60d/pack-awsha-3.png');
-- Beetroot Powder (২ ফাইল only)
select public._tmp_set_variant_image('7245d01a-a86b-4f0f-82b6-73a4bce2feb6','২ ফাইল','/__l5e/assets-v1/bd29926f-800a-4d7b-afd5-4953bf018891/pack-beet-2.png');

drop function public._tmp_set_variant_image(uuid, text, text);