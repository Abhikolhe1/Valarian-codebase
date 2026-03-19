import {ValiarianBackendApplication} from '../application';
import {ValiarianDataSource} from '../datasources';

async function fixColumnName() {
  const app = new ValiarianBackendApplication();
  await app.boot();

  const dataSource: ValiarianDataSource = await app.get('datasources.valiarian');

  try {
    console.log('🔧 Fixing column name: renaming "categories" to "category_id" in "products" table...');
    
    // Execute raw SQL
    await dataSource.execute('ALTER TABLE products RENAME COLUMN categories TO category_id;');
    
    console.log('✅ Column renamed successfully!');
  } catch (err) {
    console.error('❌ Error renaming column:', err);
    // If it already exists or was already renamed, we might get an error.
    // We can check if the column exists first, but the user asked to run this specifically.
  } finally {
    process.exit(0);
  }
}

fixColumnName().catch(err => {
  console.error('Cannot fix column name', err);
  process.exit(1);
});
