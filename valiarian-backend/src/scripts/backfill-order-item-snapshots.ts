import {DataSource} from '@loopback/repository';
import {ValiarianBackendApplication} from '../application';

/**
 * Makes order_items the complete source of truth for what an order contains.
 *
 * 1. Ensures every snapshot column exists.
 * 2. Backfills snapshot columns from the row's own legacy columns.
 * 3. Backfills slug / originalprice from the orders.items jsonb archive.
 * 4. Creates order_items rows for any legacy order that only ever had jsonb.
 *
 * Safe to re-run: every step is idempotent.
 */
export async function backfillOrderItemSnapshots() {
  const app = new ValiarianBackendApplication();
  await app.boot();
  const dataSource = (await app.get('datasources.valiarian')) as DataSource;

  const ensureColumnsSql = `
    ALTER TABLE public.order_items
      ADD COLUMN IF NOT EXISTS productnamesnapshot text,
      ADD COLUMN IF NOT EXISTS variantsnapshot jsonb,
      ADD COLUMN IF NOT EXISTS pricesnapshot numeric(10,2),
      ADD COLUMN IF NOT EXISTS barcodeid uuid,
      ADD COLUMN IF NOT EXISTS slug text,
      ADD COLUMN IF NOT EXISTS originalprice numeric(10,2);
  `;

  const backfillSql = `
    UPDATE public.order_items
    SET productnamesnapshot = COALESCE(productnamesnapshot, name, ''),
        pricesnapshot = COALESCE(pricesnapshot, price, 0)
    WHERE productnamesnapshot IS NULL
       OR pricesnapshot IS NULL;
  `;

  const backfillFromJsonSql = `
    UPDATE public.order_items oi
    SET slug = COALESCE(oi.slug, NULLIF(jsonitem->>'slug', '')),
        originalprice = COALESCE(
          oi.originalprice,
          NULLIF(jsonitem->>'originalPrice', '')::numeric
        )
    FROM public.orders o
    CROSS JOIN LATERAL jsonb_array_elements(o.items) AS jsonitem
    WHERE oi.orderid = o.id::text
      AND jsonitem->>'id' = oi.id::text
      AND (oi.slug IS NULL OR oi.originalprice IS NULL);
  `;

  const materialiseLegacyItemsSql = `
    INSERT INTO public.order_items (
      id, orderid, productid, variantid, quantity, price, baseprice,
      gstrate, cgstrate, sgstrate, igstrate,
      cgstamount, sgstamount, igstamount, totalamount,
      name, productnamesnapshot, variantsnapshot, pricesnapshot,
      sku, image, slug, originalprice, subtotal, createdat, updatedat
    )
    SELECT
      COALESCE(NULLIF(jsonitem->>'id', '')::uuid, gen_random_uuid()),
      o.id::text,
      jsonitem->>'productId',
      NULLIF(jsonitem->>'variantId', ''),
      COALESCE(NULLIF(jsonitem->>'quantity', '')::integer, 1),
      COALESCE(NULLIF(jsonitem->>'price', '')::numeric, 0),
      NULLIF(jsonitem->>'basePrice', '')::numeric,
      NULLIF(jsonitem->>'gstRate', '')::numeric,
      NULLIF(jsonitem->>'cgstRate', '')::numeric,
      NULLIF(jsonitem->>'sgstRate', '')::numeric,
      NULLIF(jsonitem->>'igstRate', '')::numeric,
      NULLIF(jsonitem->>'cgstAmount', '')::numeric,
      NULLIF(jsonitem->>'sgstAmount', '')::numeric,
      NULLIF(jsonitem->>'igstAmount', '')::numeric,
      NULLIF(jsonitem->>'totalAmount', '')::numeric,
      jsonitem->>'name',
      COALESCE(NULLIF(jsonitem->>'productNameSnapshot', ''), jsonitem->>'name', ''),
      COALESCE(
        jsonitem->'variantSnapshot',
        jsonb_build_object(
          'variantId', jsonitem->>'variantId',
          'sku', jsonitem->>'sku',
          'color', jsonitem->>'color',
          'colorName', jsonitem->>'colorName',
          'size', jsonitem->>'size'
        )
      ),
      COALESCE(
        NULLIF(jsonitem->>'priceSnapshot', '')::numeric,
        NULLIF(jsonitem->>'price', '')::numeric,
        0
      ),
      jsonitem->>'sku',
      jsonitem->>'image',
      NULLIF(jsonitem->>'slug', ''),
      NULLIF(jsonitem->>'originalPrice', '')::numeric,
      NULLIF(jsonitem->>'subtotal', '')::numeric,
      COALESCE(o.createdat, now()),
      now()
    FROM public.orders o
    CROSS JOIN LATERAL jsonb_array_elements(o.items) AS jsonitem
    WHERE jsonb_typeof(o.items) = 'array'
      AND NOT EXISTS (
        SELECT 1 FROM public.order_items existing WHERE existing.orderid = o.id::text
      )
    ON CONFLICT (id) DO NOTHING;
  `;

  const countOrphanedOrders = async (): Promise<number> => {
    const result = (await dataSource.execute(`
      SELECT COUNT(*)::int AS count
      FROM public.orders o
      WHERE NOT EXISTS (
        SELECT 1 FROM public.order_items oi WHERE oi.orderid = o.id::text
      );
    `)) as Array<{count: number}>;

    return result?.[0]?.count ?? 0;
  };

  await dataSource.execute(ensureColumnsSql);
  await dataSource.execute(backfillSql);
  await dataSource.execute(backfillFromJsonSql);

  const orphanedBefore = await countOrphanedOrders();
  await dataSource.execute(materialiseLegacyItemsSql);
  const orphanCount = await countOrphanedOrders();

  console.log('Order item snapshots backfilled.', {
    ordersMissingItemsBefore: orphanedBefore,
    ordersMaterialised: orphanedBefore - orphanCount,
  });

  if (orphanCount > 0) {
    console.warn(
      `WARNING: ${orphanCount} order(s) still have no order_items rows. ` +
        'These will render with an empty item list.',
    );
  } else {
    console.log('Every order has order_items rows.');
  }
}

backfillOrderItemSnapshots()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Failed to backfill order item snapshots', err);
    process.exit(1);
  });
