import {v4 as uuidv4} from 'uuid';
import {ValiarianBackendApplication} from '../application';
import {ProductRepository} from '../repositories';

/**
 * Migration Script: Convert Products to Variants System
 *
 * This script migrates existing products that use the old colors/sizes arrays
 * to the new variants system with individual variant objects.
 *
 * Usage: npm run migrate:variants
 */

interface MigrationStats {
  total: number;
  migrated: number;
  skipped: number;
  failed: number;
  errors: Array<{productId: string; error: string}>;
}

const COLOR_NAME_MAP: Record<string, string> = {
  '#000000': 'Black',
  '#FFFFFF': 'White',
  '#000080': 'Navy Blue',
  '#4169E1': 'Royal Blue',
  '#FF0000': 'Red',
  '#008000': 'Green',
  '#FFFF00': 'Yellow',
  '#808080': 'Gray',
  '#FFC0CB': 'Pink',
  '#800080': 'Purple',
  '#FFA500': 'Orange',
  '#A52A2A': 'Brown',
  '#00FFFF': 'Cyan',
  '#FF00FF': 'Magenta',
  '#C0C0C0': 'Silver',
  '#FFD700': 'Gold',
  '#1890FF': 'Blue',
  '#00AB55': 'Green',
  '#FF4842': 'Red',
};

function getColorName(hexColor: string): string {
  return COLOR_NAME_MAP[hexColor.toUpperCase()] || hexColor;
}

export async function migrateToVariants(
  app: ValiarianBackendApplication,
  options: {dryRun?: boolean; force?: boolean} = {},
): Promise<MigrationStats> {
  const productRepo = await app.getRepository(ProductRepository);
  const {dryRun = false, force = false} = options;

  const stats: MigrationStats = {
    total: 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  console.log('🔄 Starting product variants migration...');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE'}`);
  console.log(`Force: ${force ? 'YES (will overwrite existing variants)' : 'NO'}`);
  console.log('');

  try {
    // Fetch all products
    const allProducts = await productRepo.find();
    stats.total = allProducts.length;

    console.log(`📦 Found ${stats.total} products to process`);
    console.log('');

    for (const product of allProducts) {
      try {
        // Skip if product already has variants and force is not enabled
        if (product.variants && product.variants.length > 0 && !force) {
          console.log(`⏭️  Skipping "${product.name}" - already has ${product.variants.length} variants`);
          stats.skipped++;
          continue;
        }

        // Skip if product has no colors or sizes
        if ((!product.colors || product.colors.length === 0) && (!product.sizes || product.sizes.length === 0)) {
          console.log(`⏭️  Skipping "${product.name}" - no colors or sizes defined`);
          stats.skipped++;
          continue;
        }

        console.log(`🔨 Processing "${product.name}"...`);

        // Generate variants
        const variants = [];
        const colors = product.colors && product.colors.length > 0 ? product.colors : ['#000000'];
        const sizes = product.sizes && product.sizes.length > 0 ? product.sizes : ['M'];
        const totalVariants = colors.length * sizes.length;

        // Calculate stock per variant (distribute evenly)
        const stockPerVariant = Math.floor((product.stockQuantity || 0) / totalVariants);
        const remainderStock = (product.stockQuantity || 0) % totalVariants;

        let variantIndex = 0;
        for (const color of colors) {
          for (const size of sizes) {
            // Add remainder stock to first variant
            const variantStock = stockPerVariant + (variantIndex === 0 ? remainderStock : 0);

            // Generate SKU
            const colorCode = color.replace('#', '').substring(0, 6).toUpperCase();
            const variantSku = product.sku
              ? `${product.sku}-${colorCode}-${size}`
              : `${product.slug?.substring(0, 10).toUpperCase()}-${colorCode}-${size}`;

            variants.push({
              id: uuidv4(),
              sku: variantSku,
              color: color,
              colorName: getColorName(color),
              size: size,
              images: product.images || [],
              stockQuantity: variantStock,
              inStock: variantStock > 0,
              isDefault: variantIndex === 0, // First variant is default
            });

            variantIndex++;
          }
        }

        console.log(`  ✓ Generated ${variants.length} variants (${colors.length} colors × ${sizes.length} sizes)`);
        console.log(`  ✓ Stock distribution: ${stockPerVariant} per variant${remainderStock > 0 ? ` (+${remainderStock} to default)` : ''}`);

        // Update product with variants
        if (!dryRun) {
          await productRepo.updateById(product.id, {
            variants,
            updatedAt: new Date(),
          });
          console.log(`  ✅ Migrated successfully`);
        } else {
          console.log(`  ✅ Would migrate (dry run)`);
        }

        stats.migrated++;
        console.log('');
      } catch (error) {
        console.error(`  ❌ Failed to migrate "${product.name}":`, error);
        stats.failed++;
        stats.errors.push({
          productId: product.id,
          error: error instanceof Error ? error.message : String(error),
        });
        console.log('');
      }
    }

    // Print summary
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 Migration Summary');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total products:     ${stats.total}`);
    console.log(`Migrated:           ${stats.migrated} ✅`);
    console.log(`Skipped:            ${stats.skipped} ⏭️`);
    console.log(`Failed:             ${stats.failed} ❌`);
    console.log('═══════════════════════════════════════════════════════════');

    if (stats.errors.length > 0) {
      console.log('');
      console.log('❌ Errors:');
      stats.errors.forEach(({productId, error}) => {
        console.log(`  - Product ${productId}: ${error}`);
      });
    }

    if (dryRun) {
      console.log('');
      console.log('ℹ️  This was a DRY RUN. No changes were made to the database.');
      console.log('   Run without --dry-run flag to apply changes.');
    }

    console.log('');
    console.log('✨ Migration completed!');
  } catch (error) {
    console.error('💥 Migration failed:', error);
    throw error;
  }

  return stats;
}

/**
 * Rollback Script: Remove Variants from Products
 *
 * This script removes variants from products and restores them to the old
 * colors/sizes array system.
 *
 * Usage: npm run rollback:variants
 */
export async function rollbackVariants(
  app: ValiarianBackendApplication,
  options: {dryRun?: boolean} = {},
): Promise<MigrationStats> {
  const productRepo = await app.getRepository(ProductRepository);
  const {dryRun = false} = options;

  const stats: MigrationStats = {
    total: 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  console.log('⏮️  Starting variants rollback...');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE'}`);
  console.log('');

  try {
    // Fetch all products with variants
    const allProducts = await productRepo.find();
    const productsWithVariants = allProducts.filter(p => p.variants && p.variants.length > 0);
    stats.total = productsWithVariants.length;

    console.log(`📦 Found ${stats.total} products with variants to rollback`);
    console.log('');

    for (const product of productsWithVariants) {
      try {
        console.log(`🔨 Rolling back "${product.name}"...`);

        // Extract unique colors and sizes from variants
        const colors = [...new Set(product.variants!.map(v => v.color))];
        const sizes = [...new Set(product.variants!.map(v => v.size))];

        // Calculate total stock from all variants
        const totalStock = product.variants!.reduce((sum, v) => sum + v.stockQuantity, 0);

        console.log(`  ✓ Extracted ${colors.length} colors and ${sizes.length} sizes`);
        console.log(`  ✓ Total stock: ${totalStock}`);

        // Update product - remove variants, restore colors/sizes
        if (!dryRun) {
          await productRepo.updateById(product.id, {
            variants: [],
            colors,
            sizes,
            stockQuantity: totalStock,
            inStock: totalStock > 0,
            updatedAt: new Date(),
          });
          console.log(`  ✅ Rolled back successfully`);
        } else {
          console.log(`  ✅ Would rollback (dry run)`);
        }

        stats.migrated++;
        console.log('');
      } catch (error) {
        console.error(`  ❌ Failed to rollback "${product.name}":`, error);
        stats.failed++;
        stats.errors.push({
          productId: product.id,
          error: error instanceof Error ? error.message : String(error),
        });
        console.log('');
      }
    }

    // Print summary
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 Rollback Summary');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total products:     ${stats.total}`);
    console.log(`Rolled back:        ${stats.migrated} ✅`);
    console.log(`Failed:             ${stats.failed} ❌`);
    console.log('═══════════════════════════════════════════════════════════');

    if (stats.errors.length > 0) {
      console.log('');
      console.log('❌ Errors:');
      stats.errors.forEach(({productId, error}) => {
        console.log(`  - Product ${productId}: ${error}`);
      });
    }

    if (dryRun) {
      console.log('');
      console.log('ℹ️  This was a DRY RUN. No changes were made to the database.');
      console.log('   Run without --dry-run flag to apply changes.');
    }

    console.log('');
    console.log('✨ Rollback completed!');
  } catch (error) {
    console.error('💥 Rollback failed:', error);
    throw error;
  }

  return stats;
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isForce = args.includes('--force');
  const isRollback = args.includes('--rollback');

  (async () => {
    const {ValiarianBackendApplication} = require('../application');
    const config = require('../datasources/db.datasource.config.json');

    const app = new ValiarianBackendApplication({
      rest: {
        port: 3000,
      },
    });

    await app.boot();
    await app.start();

    try {
      if (isRollback) {
        await rollbackVariants(app, {dryRun: isDryRun});
      } else {
        await migrateToVariants(app, {dryRun: isDryRun, force: isForce});
      }
    } catch (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    } finally {
      await app.stop();
    }

    process.exit(0);
  })();
}
