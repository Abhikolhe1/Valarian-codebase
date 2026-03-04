import {ValiarianBackendApplication} from '../application';
import {RolesRepository} from '../repositories';

/**
 * Script to ensure the "user" role exists in the database
 * Run with: npm run seed:user-role
 */
async function seedUserRole() {
  const app = new ValiarianBackendApplication();
  await app.boot();

  const rolesRepository = await app.getRepository(RolesRepository);

  try {
    // Check if "user" role already exists
    const existingRole = await rolesRepository.findOne({
      where: {value: 'user'},
    });

    if (existingRole) {
      console.log('✅ User role already exists:', existingRole);
      return;
    }

    // Create the "user" role
    const userRole = await rolesRepository.create({
      value: 'user',
      label: 'User',
      description: 'Regular user role for customers',
      isActive: true,
      isDeleted: false,
    });

    console.log('✅ User role created successfully:', userRole);
  } catch (error) {
    console.error('❌ Error seeding user role:', error);
    throw error;
  } finally {
    await app.stop();
  }
}

seedUserRole()
  .then(() => {
    console.log('✅ User role seed completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ User role seed failed:', err);
    process.exit(1);
  });
