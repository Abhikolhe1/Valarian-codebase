DROP INDEX IF EXISTS public.shipments_active_provider_request_unique;
DROP INDEX IF EXISTS public.shipments_courier_awb_unique;
ALTER TABLE public.shipments DROP COLUMN IF EXISTS reconciliationrequired;
ALTER TABLE public.shipments DROP COLUMN IF EXISTS creationstate;
ALTER TABLE public.shipments DROP COLUMN IF EXISTS providermode;
ALTER TABLE public.shipments DROP COLUMN IF EXISTS providerrequestid;
