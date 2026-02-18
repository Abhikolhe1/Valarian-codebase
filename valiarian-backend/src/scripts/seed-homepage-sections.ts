import {ValiarianBackendApplication} from '../application';
import {PageRepository, SectionRepository} from '../repositories';

/**
 * Seed homepage sections
 * Creates hero, below hero, and new arrivals sections for the homepage
 */
export async function seedHomepageSections(app: ValiarianBackendApplication) {
  const pageRepository = await app.getRepository(PageRepository);
  const sectionRepository = await app.getRepository(SectionRepository);

  console.log('🌱 Seeding homepage sections...');

  // Find or create homepage
  let homepage = await pageRepository.findOne({
    where: {slug: 'home'},
  });

  if (!homepage) {
    console.log('Creating homepage...');
    homepage = await pageRepository.create({
      title: 'Home',
      slug: 'home',
      description: 'Homepage',
      status: 'published',
      publishedAt: new Date(),
      seoTitle: 'Valiarian - Home',
      seoDescription: 'Welcome to Valiarian',
      seoKeywords: ['home', 'valiarian'],
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  console.log(`✅ Homepage found/created: ${homepage.id}`);

  // Delete existing sections for homepage
  await sectionRepository.deleteAll({pageId: homepage.id});
  console.log('🗑️  Cleared existing sections');

  // Create Hero Section
  const heroSection = await sectionRepository.create({
    pageId: homepage.id,
    name: 'Hero Section',
    type: 'hero',
    order: 1,
    enabled: true,
    content: {
      title: 'Welcome to Valiarian',
      subtitle: 'Discover Amazing Products',
      description: 'Shop the latest trends and exclusive collections',
      ctaText: 'Shop Now',
      ctaLink: '/products',
      backgroundImage: '/assets/images/hero-bg.jpg',
      overlayOpacity: 0.5,
    },
    settings: {
      backgroundColor: '#000000',
      textColor: '#ffffff',
      height: 'full',
      alignment: 'center',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log(`✅ Created Hero Section: ${heroSection.id}`);

  // Create Below Hero Section (Features/Benefits)
  const belowHeroSection = await sectionRepository.create({
    pageId: homepage.id,
    name: 'Features Section',
    type: 'features',
    order: 2,
    enabled: true,
    content: {
      title: 'Why Choose Us',
      subtitle: 'The Best Shopping Experience',
      features: [
        {
          icon: 'solar:delivery-bold',
          title: 'Free Shipping',
          description: 'Free shipping on orders over $50',
        },
        {
          icon: 'solar:shield-check-bold',
          title: 'Secure Payment',
          description: '100% secure payment methods',
        },
        {
          icon: 'solar:refresh-bold',
          title: 'Easy Returns',
          description: '30-day return policy',
        },
        {
          icon: 'solar:chat-round-call-bold',
          title: '24/7 Support',
          description: 'Dedicated customer support',
        },
      ],
    },
    settings: {
      backgroundColor: '#f9fafb',
      columns: 4,
      spacing: 3,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log(`✅ Created Features Section: ${belowHeroSection.id}`);

  // Create New Arrivals Section
  const newArrivalsSection = await sectionRepository.create({
    pageId: homepage.id,
    name: 'New Arrivals',
    type: 'custom',
    order: 3,
    enabled: true,
    content: {
      sectionType: 'product-grid',
      title: 'New Arrivals',
      subtitle: 'Check out our latest products',
      ctaText: 'View All',
      ctaLink: '/products/new',
      displayType: 'grid',
      itemsPerRow: 4,
      maxItems: 8,
      showPrice: true,
      showRating: true,
      showQuickView: true,
      // Products will be fetched dynamically from product API
      productFilter: {
        category: 'new-arrivals',
        sortBy: 'createdAt',
        order: 'desc',
      },
    },
    settings: {
      backgroundColor: '#ffffff',
      spacing: 3,
      cardStyle: 'elevated',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log(`✅ Created New Arrivals Section: ${newArrivalsSection.id}`);

  // Create Featured Categories Section
  const categoriesSection = await sectionRepository.create({
    pageId: homepage.id,
    name: 'Featured Categories',
    type: 'custom',
    order: 4,
    enabled: true,
    content: {
      sectionType: 'category-grid',
      title: 'Shop by Category',
      subtitle: 'Explore our collections',
      categories: [
        {
          name: 'Men',
          image: '/assets/images/category-men.jpg',
          link: '/products/men',
        },
        {
          name: 'Women',
          image: '/assets/images/category-women.jpg',
          link: '/products/women',
        },
        {
          name: 'Accessories',
          image: '/assets/images/category-accessories.jpg',
          link: '/products/accessories',
        },
        {
          name: 'Sale',
          image: '/assets/images/category-sale.jpg',
          link: '/products/sale',
        },
      ],
    },
    settings: {
      backgroundColor: '#f9fafb',
      columns: 4,
      imageRatio: '4:3',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log(`✅ Created Categories Section: ${categoriesSection.id}`);

  // Create Newsletter Section
  const newsletterSection = await sectionRepository.create({
    pageId: homepage.id,
    name: 'Newsletter Signup',
    type: 'custom',
    order: 5,
    enabled: true,
    content: {
      sectionType: 'newsletter',
      title: 'Stay Updated',
      subtitle: 'Subscribe to our newsletter for exclusive offers',
      placeholder: 'Enter your email',
      ctaText: 'Subscribe',
      successMessage: 'Thank you for subscribing!',
      privacyText: 'We respect your privacy. Unsubscribe at any time.',
    },
    settings: {
      backgroundColor: '#1a1a1a',
      textColor: '#ffffff',
      alignment: 'center',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log(`✅ Created Newsletter Section: ${newsletterSection.id}`);

  console.log('✅ Homepage sections seeded successfully!');
  console.log(`   - Hero Section (order: 1)`);
  console.log(`   - Features Section (order: 2)`);
  console.log(`   - New Arrivals (order: 3)`);
  console.log(`   - Featured Categories (order: 4)`);
  console.log(`   - Newsletter (order: 5)`);
}

// Run if executed directly
if (require.main === module) {
  const {ValiarianBackendApplication} = require('../application');

  async function run() {
    const app = new ValiarianBackendApplication();
    await app.boot();
    await seedHomepageSections(app);
    process.exit(0);
  }

  run().catch(err => {
    console.error('Error seeding homepage sections:', err);
    process.exit(1);
  });
}
