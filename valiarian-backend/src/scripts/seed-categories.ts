import {v4 as uuidv4} from 'uuid';
import {ValiarianBackendApplication} from '../application';
import {CategoryRepository, ParentCategoryRepository} from '../repositories';

async function seedCategories() {
  const app = new ValiarianBackendApplication();
  await app.boot();

  const parentCategoryRepository = await app.getRepository(
    ParentCategoryRepository,
  );
  const categoryRepository = await app.getRepository(CategoryRepository);

  try {
    console.log('Seeding parent categories and categories...');

    const parentCategories = [
      {
        id: uuidv4(),
        name: 'T-Shirts',
        slug: 't-shirts',
        description: 'All kinds of T-Shirts',
        isActive: true,
      },
      {
        id: uuidv4(),
        name: 'Hoodies',
        slug: 'hoodies',
        description: 'Comfortable Hoodies',
        isActive: true,
      },
      {
        id: uuidv4(),
        name: 'Jackets',
        slug: 'jackets',
        description: 'Stylish Jackets',
        isActive: true,
      },
    ];

    const createdParents: Record<string, {id: string}> = {};

    for (const parentCategory of parentCategories) {
      const existing = await parentCategoryRepository.findOne({
        where: {slug: parentCategory.slug},
      });

      if (existing) {
        createdParents[parentCategory.name] = existing;
        console.log(`Parent category already exists: ${parentCategory.name}`);
        continue;
      }

      const created = await parentCategoryRepository.create(parentCategory);
      createdParents[parentCategory.name] = created;
      console.log(`Created parent category: ${parentCategory.name}`);
    }

    const categories = [
      {
        name: 'Full Sleeves',
        slug: 'full-sleeves',
        parentName: 'T-Shirts',
        description: 'Full sleeve t-shirts',
      },
      {
        name: 'Half Sleeves',
        slug: 'half-sleeves',
        parentName: 'T-Shirts',
        description: 'Half sleeve t-shirts',
      },
      {
        name: 'Oversized',
        slug: 'oversized',
        parentName: 'T-Shirts',
        description: 'Oversized t-shirts',
      },
      {
        name: 'Zipper',
        slug: 'zipper',
        parentName: 'Hoodies',
        description: 'Zipper hoodies',
      },
    ];

    for (const category of categories) {
      const parentCategory = createdParents[category.parentName];
      if (!parentCategory) {
        console.warn(
          `Parent category not found for ${category.name}: ${category.parentName}`,
        );
        continue;
      }

      const existing = await categoryRepository.findOne({
        where: {slug: category.slug},
      });

      if (existing) {
        console.log(`Category already exists: ${category.name}`);
        continue;
      }

      await categoryRepository.create({
        id: uuidv4(),
        name: category.name,
        slug: category.slug,
        parentCategoryId: parentCategory.id,
        description: category.description,
        isActive: true,
      });
      console.log(`Created category: ${category.name}`);
    }

    console.log('Category seeding completed successfully.');
  } catch (error) {
    console.error('Error seeding categories:', error);
    throw error;
  } finally {
    await app.stop();
  }
}

seedCategories()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
