ALTER TABLE public.shipment_labels
  ADD COLUMN IF NOT EXISTS createdat timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updatedat timestamptz NOT NULL DEFAULT now();
