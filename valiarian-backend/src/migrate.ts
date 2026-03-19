import {ValiarianBackendApplication} from './application';

export async function migrate(args: string[]) {
  console.log('Migrate args:', args);
  const existingSchema =
    args.includes('--rebuild') || process.argv.includes('--rebuild')
      ? 'drop'
      : 'alter';
  console.log('Migrating schemas (%s existing schema)', existingSchema);

  const app = new ValiarianBackendApplication();
  await app.boot();

  console.log('Running pre-migration cleanup...');
  const ds = (await app.get('datasources.valiarian')) as any;

  try {
    if (existingSchema === 'drop') {
      await ds.execute('DROP TABLE IF EXISTS category_product CASCADE');
      await ds.execute('DROP TABLE IF EXISTS product_variants CASCADE');
      await ds.execute('DROP TABLE IF EXISTS products CASCADE');
      await ds.execute('DROP TABLE IF EXISTS categories CASCADE');
      await ds.execute('DROP TABLE IF EXISTS parent_categories CASCADE');
    }

    await ds
      .execute('ALTER TABLE categories RENAME COLUMN parent_id TO parent_category_id')
      .catch(() => undefined);

    await ds
      .execute('ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id uuid')
      .catch(() => undefined);

    await ds
      .execute(`
        UPDATE products
        SET category_id = categories::uuid
        WHERE category_id IS NULL
        AND categories IS NOT NULL
        AND categories ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      `)
      .catch(() => undefined);

    await ds
      .execute('ALTER TABLE products DROP COLUMN IF EXISTS categories')
      .catch(() => undefined);

    await ds
      .execute('DROP TABLE IF EXISTS category_product CASCADE')
      .catch(() => undefined);

    console.log('Pre-migration cleanup completed.');
  } catch (error) {
    console.log('Pre-migration cleanup skipped.', error);
  }

  const models = [
    'Users',
    'Roles',
    'Permissions',
    'RolePermissions',
    'UserRoles',
    'Media',
    'Otp',
    'RegistrationSessions',
    'RefreshToken',
    'Page',
    'Section',
    'ContentVersion',
    'SectionTemplate',
    'NavigationMenu',
    'SiteSettings',
    'ParentCategory',
    'Category',
    'Product',
    'ProductVariant',
    'Carts',
    'CartItems',
    'Order',
    'OrderStatusHistory',
    'Address',
    'AuditLog',
  ];

  for (const model of models) {
    console.log(`Migrating model: ${model}...`);
    await app.migrateSchema({
      existingSchema,
      models: [model],
    });
  }

  process.exit(0);
}

migrate(process.argv).catch(err => {
  console.error('Cannot migrate database schema', err);
  process.exit(1);
});
