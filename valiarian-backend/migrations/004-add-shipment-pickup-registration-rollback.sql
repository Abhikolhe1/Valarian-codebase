BEGIN;
ALTER TABLE public.shipments DROP COLUMN IF EXISTS pickupregistrationerror;
ALTER TABLE public.shipments DROP COLUMN IF EXISTS pickupregisteredat;
ALTER TABLE public.shipments DROP COLUMN IF EXISTS pickupreference;
COMMIT;
