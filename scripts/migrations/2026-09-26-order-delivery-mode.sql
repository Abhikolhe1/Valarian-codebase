BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS deliverymode text;

UPDATE public.orders
SET deliverymode = 'surface'
WHERE deliverymode IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_deliverymode_check'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_deliverymode_check
      CHECK (deliverymode IN ('surface', 'express')) NOT VALID;
  END IF;
END
$$;

COMMIT;
