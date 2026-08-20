-- Backward-compatible provider metadata and idempotency safeguards.
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS providerrequestid varchar;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS providermode varchar;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS creationstate varchar DEFAULT 'CREATED';
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS reconciliationrequired boolean DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS shipments_courier_awb_unique
  ON public.shipments (couriername, awbnumber);

CREATE UNIQUE INDEX IF NOT EXISTS shipments_active_provider_request_unique
  ON public.shipments (providerrequestid)
  WHERE providerrequestid IS NOT NULL AND status <> 'cancelled' AND isdeleted = false;
