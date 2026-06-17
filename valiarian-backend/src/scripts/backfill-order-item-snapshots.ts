import {DataSource} from '@loopback/repository';
import {ValiarianBackendApplication} from '../application';

export async function backfillOrderItemSnapshots() {
  const app = new ValiarianBackendApplication();
  await app.boot();
  const dataSource = (await app.get('datasources.valiarian')) as DataSource;

  const ensureColumnsSql = `
    ALTER TABLE public.order_items
      ADD COLUMN IF NOT EXISTS productnamesnapshot text,
      ADD COLUMN IF NOT EXISTS variantsnapshot jsonb,
      ADD COLUMN IF NOT EXISTS pricesnapshot numeric(10,2),
      ADD COLUMN IF NOT EXISTS barcodeid uuid;
  `;

  const backfillSql = `
    UPDATE public.order_items
    SET productnamesnapshot = COALESCE(productnamesnapshot, name, ''),
        pricesnapshot = COALESCE(pricesnapshot, price, 0)
    WHERE productnamesnapshot IS NULL
       OR pricesnapshot IS NULL;
  `;

  await dataSource.execute(ensureColumnsSql);
  await dataSource.execute(backfillSql);
  console.log('Order item snapshots backfilled.');
}

backfillOrderItemSnapshots()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Failed to backfill order item snapshots', err);
    process.exit(1);
  });
