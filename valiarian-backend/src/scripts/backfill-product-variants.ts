import {ValiarianBackendApplication} from '../application';
import {ProductRepository} from '../repositories';
import {IsolationLevel} from '@loopback/repository';

/**
 * Backfills `product_variants` from the embedded `products.variants` JSONB.
 *
 * Why this exists: InventoryLifecycleService (reserveOnOrderConfirmed,
 * deductOnShipment, etc.) operates exclusively against the `product_variants`
 * table via `UPDATE ... WHERE id = $2` — no fallback, no existence check. If
 * that table is empty (or missing a given variant id), those calls silently
 * affect zero rows: no error, no reservation, no deduction. Stock has still
 * been changing correctly up to now only because a *separate* code path
 * (ProductRepository.reserveVariantStockAtomic, used by order confirmation)
 * has a fallback onto the embedded JSONB when the relational row is absent.
 * That fallback does not exist on the shipment-time deduction path, which is
 * the actual bug this backfill fixes.
 *
 * Variant IDs are preserved exactly as they appear in the JSONB — existing
 * order_items.variantid values already reference them, and changing an id
 * here would silently break stock accounting for every past order.
 *
 * Safe to re-run: uses INSERT ... ON CONFLICT (id) DO NOTHING, so a second
 * run only picks up variants that didn't exist yet (e.g. from newly-created
 * products since the last run). It never overwrites an existing
 * product_variants row — this is a backfill for the empty-table case, not a
 * general two-way sync.
 *
 * Usage:
 *   npm run backfill:product-variants:dry   (report only, no writes)
 *   npm run backfill:product-variants       (apply)
 */

interface RawVariant {
  id?: unknown;
  sku?: unknown;
  color?: unknown;
  colorName?: unknown;
  size?: unknown;
  images?: unknown;
  stockQuantity?: unknown;
  inStock?: unknown;
  isDefault?: unknown;
  price?: unknown;
}

interface InsertRow {
  id: string;
  productId: string;
  sku: string;
  color: string;
  colorName: string;
  size: string;
  images: string[];
  stockQuantity: number;
  inStock: boolean;
  isDefault: boolean;
  price: number | null;
}

interface SkippedVariant {
  productId: string;
  productSku?: string;
  variantId?: string;
  variantSku?: string;
  reasons: string[];
}

interface Report {
  productsScanned: number;
  variantsFound: number;
  duplicateVariantIds: string[];
  duplicateSkus: string[];
  skipped: SkippedVariant[];
  insertable: InsertRow[];
}

function isValidStock(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value >= 0;
}

async function analyze(productRepo: ProductRepository): Promise<Report> {
  const products = await productRepo.find();

  const variantIdCounts = new Map<string, number>();
  const skuCounts = new Map<string, number>();
  const candidates: Array<{row: InsertRow | null; skipped: SkippedVariant | null}> = [];
  let variantsFound = 0;

  for (const product of products) {
    const variants: RawVariant[] = Array.isArray(product.variants) ? (product.variants as RawVariant[]) : [];

    for (const v of variants) {
      variantsFound++;
      const reasons: string[] = [];

      const id = typeof v.id === 'string' && v.id.trim() ? v.id.trim() : undefined;
      const sku = typeof v.sku === 'string' && v.sku.trim() ? v.sku.trim() : undefined;
      const color = typeof v.color === 'string' && v.color.trim() ? v.color.trim() : undefined;
      const colorName = typeof v.colorName === 'string' && v.colorName.trim() ? v.colorName.trim() : undefined;
      const size = typeof v.size === 'string' && v.size.trim() ? v.size.trim() : undefined;

      if (!id) reasons.push('missing variant id');
      if (!sku) reasons.push('missing sku');
      if (!color) reasons.push('missing color');
      if (!colorName) reasons.push('missing colorName');
      if (!size) reasons.push('missing size');
      if (!isValidStock(v.stockQuantity)) {
        reasons.push(`invalid stockQuantity: ${JSON.stringify(v.stockQuantity)}`);
      }

      if (id) variantIdCounts.set(id, (variantIdCounts.get(id) ?? 0) + 1);
      if (sku) skuCounts.set(sku, (skuCounts.get(sku) ?? 0) + 1);

      if (reasons.length > 0 || !id || !sku || !color || !colorName || !size || !isValidStock(v.stockQuantity)) {
        candidates.push({
          row: null,
          skipped: {
            productId: product.id,
            productSku: product.sku,
            variantId: id,
            variantSku: sku,
            reasons: reasons.length > 0 ? reasons : ['unknown validation failure'],
          },
        });
        continue;
      }

      candidates.push({
        row: {
          id,
          productId: product.id,
          sku,
          color,
          colorName,
          size,
          images: Array.isArray(v.images) ? (v.images as string[]) : [],
          stockQuantity: v.stockQuantity as number,
          inStock: typeof v.inStock === 'boolean' ? v.inStock : (v.stockQuantity as number) > 0,
          isDefault: typeof v.isDefault === 'boolean' ? v.isDefault : false,
          price: typeof v.price === 'number' && Number.isFinite(v.price) ? v.price : null,
        },
        skipped: null,
      });
    }
  }

  const duplicateVariantIds = [...variantIdCounts.entries()].filter(([, c]) => c > 1).map(([id]) => id);
  const duplicateSkus = [...skuCounts.entries()].filter(([, c]) => c > 1).map(([sku]) => sku);
  const dupIdSet = new Set(duplicateVariantIds);
  const dupSkuSet = new Set(duplicateSkus);

  const skipped: SkippedVariant[] = [];
  const insertable: InsertRow[] = [];

  for (const c of candidates) {
    if (c.skipped) {
      skipped.push(c.skipped);
      continue;
    }
    const row = c.row!;
    // A duplicate id/sku is ambiguous — inserting either candidate risks
    // deducting stock against the wrong physical variant. Exclude both/all
    // occurrences and report them; this must be resolved by hand in the
    // source data (products.variants), not guessed by this script.
    if (dupIdSet.has(row.id) || dupSkuSet.has(row.sku)) {
      skipped.push({
        productId: row.productId,
        variantId: row.id,
        variantSku: row.sku,
        reasons: [
          dupIdSet.has(row.id) ? `duplicate variant id (appears ${variantIdCounts.get(row.id)} times)` : undefined,
          dupSkuSet.has(row.sku) ? `duplicate sku (appears ${skuCounts.get(row.sku)} times)` : undefined,
        ].filter((x): x is string => !!x),
      });
      continue;
    }
    insertable.push(row);
  }

  return {
    productsScanned: products.length,
    variantsFound,
    duplicateVariantIds,
    duplicateSkus,
    skipped,
    insertable,
  };
}

function printReport(report: Report): void {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Product Variants Backfill — Report');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Products scanned:          ${report.productsScanned}`);
  console.log(`Variants found (JSONB):    ${report.variantsFound}`);
  console.log(`Duplicate variant IDs:     ${report.duplicateVariantIds.length}`);
  if (report.duplicateVariantIds.length > 0) {
    report.duplicateVariantIds.forEach(id => console.log(`  - ${id}`));
  }
  console.log(`Duplicate SKUs:            ${report.duplicateSkus.length}`);
  if (report.duplicateSkus.length > 0) {
    report.duplicateSkus.forEach(sku => console.log(`  - ${sku}`));
  }
  console.log(`Variants skipped (issues): ${report.skipped.length}`);
  if (report.skipped.length > 0) {
    report.skipped.forEach(s =>
      console.log(
        `  - product ${s.productSku ?? s.productId} / variant ${s.variantSku ?? s.variantId ?? '(no id)'}: ${s.reasons.join('; ')}`,
      ),
    );
  }
  console.log(`Insertable variants:       ${report.insertable.length}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
}

export async function backfillProductVariants(
  app: ValiarianBackendApplication,
  options: {dryRun?: boolean} = {},
): Promise<Report> {
  const {dryRun = false} = options;
  const productRepo = await app.getRepository(ProductRepository);

  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE'}`);

  const report = await analyze(productRepo);
  printReport(report);

  if (dryRun) {
    console.log('Dry run complete. No rows were written to product_variants.');
    return report;
  }

  if (report.insertable.length === 0) {
    console.log('Nothing to insert.');
    return report;
  }

  const dataSource = productRepo.dataSource;
  const transaction = await dataSource.beginTransaction(IsolationLevel.READ_COMMITTED);
  let inserted = 0;
  let alreadyPresent = 0;

  try {
    for (const row of report.insertable) {
      const sql = `
      INSERT INTO public.product_variants
        (id, productid, sku, color, colorname, size, images, price,
         stockquantity, reservedquantity, instock, isdefault, isactive, isdeleted,
         createdat, updatedat)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8,
         $9, 0, $10, $11, true, false,
         NOW(), NOW())
      ON CONFLICT DO NOTHING
      RETURNING id;
    `;
      const result: unknown = await dataSource.execute(sql, [
        row.id,
        row.productId,
        row.sku,
        row.color,
        row.colorName,
        row.size,
        JSON.stringify(row.images),
        row.price,
        row.stockQuantity,
        row.inStock,
        row.isDefault,
      ], {transaction});
      const rows = Array.isArray(result) ? result : (result as {rows?: unknown[]})?.rows;
      if (Array.isArray(rows) && rows.length > 0) {
        inserted++;
      } else {
        alreadyPresent++;
      }
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  console.log(`Inserted: ${inserted}`);
  console.log(`Already present (skipped by ON CONFLICT): ${alreadyPresent}`);
  console.log('Backfill complete.');

  return report;
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');

  (async () => {
    const app = new ValiarianBackendApplication({rest: {port: 0}});
    await app.boot();

    try {
      await backfillProductVariants(app, {dryRun: isDryRun});
    } catch (error) {
      console.error('Backfill failed:', error);
      process.exitCode = 1;
    } finally {
      await app.stop();
    }
  })().catch(error => {
    console.error('Backfill process failed:', error);
    process.exitCode = 1;
  });
}
