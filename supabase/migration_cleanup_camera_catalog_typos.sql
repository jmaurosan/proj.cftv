-- Correções de digitação no cadastro/catálogo de câmeras.
-- Execute no SQL Editor do Supabase para limpar registros já salvos.

UPDATE public.cameras
SET model = 'THC-B1220C-P'
WHERE lower(trim(model)) IN ('thc-b1220c-pm', 'thc-b1220c-p');

DELETE FROM public.equipment_models wrong
WHERE wrong.type = 'camera'
  AND lower(trim(wrong.model)) IN ('thc-b1220c-pm', 'thc-b1220c-p')
  AND wrong.model <> 'THC-B1220C-P'
  AND EXISTS (
    SELECT 1
    FROM public.equipment_models correct
    WHERE correct.type = wrong.type
      AND correct.brand = wrong.brand
      AND correct.model = 'THC-B1220C-P'
      AND correct.user_id = wrong.user_id
      AND correct.id <> wrong.id
  );

WITH normalized_duplicates AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY type, brand, user_id
      ORDER BY
        CASE WHEN model = 'THC-B1220C-P' THEN 0 ELSE 1 END,
        updated_at DESC NULLS LAST,
        created_at DESC NULLS LAST,
        id
    ) AS keep_order
  FROM public.equipment_models
  WHERE type = 'camera'
    AND lower(trim(model)) IN ('thc-b1220c-pm', 'thc-b1220c-p')
)
DELETE FROM public.equipment_models
WHERE id IN (
  SELECT id
  FROM normalized_duplicates
  WHERE keep_order > 1
);

UPDATE public.equipment_models
SET model = 'THC-B1220C-P'
WHERE type = 'camera'
  AND lower(trim(model)) IN ('thc-b1220c-pm', 'thc-b1220c-p')
  AND model <> 'THC-B1220C-P';

UPDATE public.cameras
SET brand = 'JFL'
WHERE upper(trim(brand)) = 'JBL';

DELETE FROM public.equipment_models wrong
WHERE wrong.type = 'camera'
  AND upper(trim(wrong.brand)) = 'JBL'
  AND EXISTS (
    SELECT 1
    FROM public.equipment_models correct
    WHERE correct.type = wrong.type
      AND correct.brand = 'JFL'
      AND correct.model = wrong.model
      AND correct.user_id = wrong.user_id
      AND correct.id <> wrong.id
  );

UPDATE public.equipment_models
SET brand = 'JFL'
WHERE type = 'camera'
  AND upper(trim(brand)) = 'JBL';

UPDATE public.cameras
SET brand = 'Hikivision'
WHERE lower(trim(brand)) = 'hikvision';

DELETE FROM public.equipment_models wrong
WHERE wrong.type = 'camera'
  AND lower(trim(wrong.brand)) = 'hikvision'
  AND EXISTS (
    SELECT 1
    FROM public.equipment_models correct
    WHERE correct.type = wrong.type
      AND correct.brand = 'Hikivision'
      AND correct.model = wrong.model
      AND correct.user_id = wrong.user_id
      AND correct.id <> wrong.id
  );

UPDATE public.equipment_models
SET brand = 'Hikivision'
WHERE type = 'camera'
  AND lower(trim(brand)) = 'hikvision';

UPDATE public.cameras
SET brand = NULL
WHERE lower(trim(brand)) = '_other_';

DELETE FROM public.equipment_models
WHERE type = 'camera'
  AND lower(trim(brand)) = '_other_';
