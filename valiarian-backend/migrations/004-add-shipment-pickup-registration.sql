BEGIN;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS pickupreference varchar;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS pickupregisteredat timestamptz;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS pickupregistrationerror varchar;
COMMIT;
