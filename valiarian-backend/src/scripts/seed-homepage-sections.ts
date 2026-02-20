import {ValiarianBackendApplication} from '../application';
import {PageRepository, SectionRepository} from '../repositories';

/**
 * Seed homepage sections
 * Creates sections that map to existing frontend components
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

  // 1. Hero Section (maps to HomeHero component)
  const heroSection = await sectionRepository.create({
    pageId: homepage.id,
    name: 'Hero Section',
    type: 'hero',
    order: 1,
    enabled: true,
    content: {
      title: 'Premium Cotton Polos.',
      ctaText: 'Explore Collection',
      ctaLink: '/products',
      backgroundImage: '/assets/images/home/hero/valiarian-hero.png',
    },
    settings: {
      backgroundColor: '#000000',
      textColor: '#ffffff',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log(`✅ Created Hero Section: ${heroSection.id}`);

  // 2. Scroll Animated Section (maps to HomeScrollAnimated component)
  const scrollSection = await sectionRepository.create({
    pageId: homepage.id,
    name: 'Scroll Animated Section',
    type: 'scroll-animated',
    order: 2,
    enabled: true,
    content: {
      products: [
        {
          title: 'Premium Classic T-Shirt',
          description: 'Crafted with premium cotton for ultimate comfort and style. Perfect for everyday wear.',
          image: '/assets/images/home/scroll-animation/tshirt1-removebg-preview.png',
          buttonText: 'Shop Now',
          buttonLink: '/products',
        },
        {
          title: 'Essential Comfort Fit',
          description: 'Experience the perfect blend of comfort and durability. Made to last, designed to impress.',
          image: '/assets/images/home/scroll-animation/tshirt2-removebg-preview.png',
          buttonText: 'Explore',
          buttonLink: '/products',
        },
        {
          title: 'Modern Fit Premium',
          description: 'Contemporary design meets classic elegance. Elevate your wardrobe with this timeless piece.',
          image: '/assets/images/home/scroll-animation/tshirt3-removebg-preview.png',
          buttonText: 'Discover',
          buttonLink: '/products',
        },
        {
          title: 'Signature Collection',
          description: 'Our signature piece that defines quality and style. A must-have for the modern wardrobe.',
          image: '/assets/images/home/scroll-animation/tshirt2-removebg-preview.png',
          buttonText: 'View Collection',
          buttonLink: '/products',
        },
      ],
    },
    settings: {
      backgroundColor: '#ffffff',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log(`✅ Created Scroll Animated Section: ${scrollSection.id}`);

  // 3. New Arrivals Section (maps to HomeNewArrivals component)
  const newArrivalsSection = await sectionRepository.create({
    pageId: homepage.id,
    name: 'New Arrivals',
    type: 'new-arrivals',
    order: 3,
    enabled: true,
    content: {
      title: 'New Arrivals',
      subtitle: 'Discover our latest collection of premium cotton polos, crafted with the same attention to detail and commitment to quality.',
    },
    settings: {
      backgroundColor: '#ffffff',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log(`✅ Created New Arrivals Section: ${newArrivalsSection.id}`);

  // 4. Collection Hero Section (maps to HomeCollectionHero component)
  const collectionHeroSection = await sectionRepository.create({
    pageId: homepage.id,
    name: 'Collection Hero',
    type: 'collection-hero',
    order: 4,
    enabled: true,
    content: {
      title: 'New Collection',
      subtitle: 'Explore our latest designs',
      backgroundImage: '/assets/images/home/new-arrival/new-arrival-hero.jpeg',
    },
    settings: {
      backgroundColor: '#000000',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log(`✅ Created Collection Hero Section: ${collectionHeroSection.id}`);

  // 5. Best Sellers Section (maps to HomeBestSellers component)
  const bestSellersSection = await sectionRepository.create({
    pageId: homepage.id,
    name: 'Best Sellers',
    type: 'best-sellers',
    order: 5,
    enabled: true,
    content: {
      title: 'Best Sellers',
      subtitle: 'Our most popular products that customers love',
    },
    settings: {
      backgroundColor: '#f9fafb',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log(`✅ Created Best Sellers Section: ${bestSellersSection.id}`);

  // 6. Fabric Section (maps to HomeFabricSection component)
  const fabricSection = await sectionRepository.create({
    pageId: homepage.id,
    name: 'Fabric Information',
    type: 'fabric-info',
    order: 6,
    enabled: true,
    content: {
      title: 'Premium Fabric',
      subtitle: 'Quality you can feel',
      description: 'Made with the finest cotton for ultimate comfort and durability',
      features: [
        {
          title: 'Breathable',
          description: 'Natural cotton fibers allow air circulation',
          icon: 'solar:wind-bold',
        },
        {
          title: 'Durable',
          description: 'Long-lasting quality that withstands wear',
          icon: 'solar:shield-check-bold',
        },
        {
          title: 'Soft',
          description: 'Gentle on skin with premium softness',
          icon: 'solar:heart-bold',
        },
      ],
    },
    settings: {
      backgroundColor: '#ffffff',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log(`✅ Created Fabric Section: ${fabricSection.id}`);

  // 7. Social Media Section (maps to HomeSocialMedia component)
  const socialMediaSection = await sectionRepository.create({
    pageId: homepage.id,
    name: 'Social Media',
    type: 'social-media',
    order: 7,
    enabled: true,
    content: {
      title: 'Follow Us',
      subtitle: 'Stay connected with Valiarian',
      instagram: 'valiarian',
      facebook: 'valiarian',
      twitter: 'valiarian',
    },
    settings: {
      backgroundColor: '#f9fafb',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log(`✅ Created Social Media Section: ${socialMediaSection.id}`);

  console.log('✅ Homepage sections seeded successfully!');
  console.log(`   - Hero Section (order: 1)`);
  console.log(`   - Scroll Animated Section (order: 2)`);
  console.log(`   - New Arrivals (order: 3)`);
  console.log(`   - Collection Hero (order: 4)`);
  console.log(`   - Best Sellers (order: 5)`);
  console.log(`   - Fabric Information (order: 6)`);
  console.log(`   - Social Media (order: 7)`);
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
