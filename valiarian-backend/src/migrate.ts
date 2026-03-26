import {ValiarianBackendApplication} from './application';

export async function migrate(args: string[]) {
  const existingSchema = args.includes('--rebuild') ? 'drop' : 'alter';
  console.log('Migrating schemas (%s existing schema)', existingSchema);

  const app = new ValiarianBackendApplication();
  await app.boot();
  await app.migrateSchema({
    existingSchema,
    models: [
      'AboutPage',
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
      'OrderItemEntity',
      'Payment',
      'Invoice',
      'ContactSubmission',
    ],
  });

  process.exit(0);
}

migrate(process.argv).catch(err => {
  console.error('Cannot migrate database schema', err);
  process.exit(1);
});
