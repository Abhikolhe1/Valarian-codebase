-- Additive migration; run before deploying code that reads these Order fields.
-- The normal LoopBack schema autoupdate also creates these nullable columns.
-- Existing orders intentionally remain unchecked, not assumed serviceable.
BEGIN;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS bluedartdeliverystatus text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS bluedartcheckedat timestamptz;
COMMIT;
