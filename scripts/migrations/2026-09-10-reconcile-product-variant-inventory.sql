-- Reconcile the normalized product_variants table from the variants JSON that
-- is edited and displayed by the admin/storefront. Run once when deploying the
-- transactional dual-write fix. Existing reserved quantities are preserved.
BEGIN;

WITH embedded AS (
  SELECT
    p.id::text AS product_id,
    (variant.value ->> 'id')::uuid AS variant_id,
    variant.value
  FROM public.products p
  CROSS JOIN LATERAL jsonb_array_elements(
    COALESCE(p.variants, '[]'::jsonb)
  ) AS variant(value)
  WHERE variant.value ->> 'id' IS NOT NULL
)
INSERT INTO public.product_variants (
  id,
  productid,
  sku,
  color,
  colorname,
  size,
  images,
  price,
  stockquantity,
  reservedquantity,
  instock,
  isdefault,
  isactive,
  isdeleted,
  createdat,
  updatedat
)
SELECT
  variant_id,
  product_id,
  variant.value ->> 'sku',
  variant.value ->> 'color',
  variant.value ->> 'colorName',
  variant.value ->> 'size',
  COALESCE(variant.value -> 'images', '[]'::jsonb)::text,
  NULLIF(variant.value ->> 'price', '')::integer,
  GREATEST(COALESCE((variant.value ->> 'stockQuantity')::integer, 0), 0),
  0,
  GREATEST(COALESCE((variant.value ->> 'stockQuantity')::integer, 0), 0) > 0,
  COALESCE((variant.value ->> 'isDefault')::boolean, false),
  true,
  false,
  NOW(),
  NOW()
FROM embedded variant
ON CONFLICT (id) DO UPDATE SET
  productid = EXCLUDED.productid,
  sku = EXCLUDED.sku,
  color = EXCLUDED.color,
  colorname = EXCLUDED.colorname,
  size = EXCLUDED.size,
  images = EXCLUDED.images,
  price = EXCLUDED.price,
  stockquantity = EXCLUDED.stockquantity,
  instock = EXCLUDED.instock,
  isdefault = EXCLUDED.isdefault,
  isactive = true,
  isdeleted = false,
  deletedat = NULL,
  updatedat = NOW()
WHERE (
  product_variants.productid,
  product_variants.sku,
  product_variants.color,
  product_variants.colorname,
  product_variants.size,
  product_variants.images,
  product_variants.price,
  product_variants.stockquantity,
  product_variants.instock,
  product_variants.isdefault,
  product_variants.isactive,
  product_variants.isdeleted
) IS DISTINCT FROM (
  EXCLUDED.productid,
  EXCLUDED.sku,
  EXCLUDED.color,
  EXCLUDED.colorname,
  EXCLUDED.size,
  EXCLUDED.images,
  EXCLUDED.price,
  EXCLUDED.stockquantity,
  EXCLUDED.instock,
  EXCLUDED.isdefault,
  true,
  false
);

DELETE FROM public.product_variants normalized
WHERE EXISTS (
  SELECT 1
  FROM public.products product
  WHERE product.id::text = normalized.productid
)
AND NOT EXISTS (
  SELECT 1
  FROM public.products product
  CROSS JOIN LATERAL jsonb_array_elements(
    COALESCE(product.variants, '[]'::jsonb)
  ) AS variant(value)
  WHERE product.id::text = normalized.productid
    AND variant.value ->> 'id' = normalized.id::text
);

COMMIT;
