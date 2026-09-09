-- Additive, data-preserving migration for Delhivery-first courier routing.
BEGIN;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delhiverydeliverystatus text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delhiverycheckedat timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS selectedshippingprovider text;
COMMIT;
