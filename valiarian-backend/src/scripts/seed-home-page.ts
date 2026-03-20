import {v4 as uuidv4} from 'uuid';
import {ValiarianBackendApplication} from '../application';
import {PageRepository, SectionRepository} from '../repositories';

async function seedHomePage() {
  const app = new ValiarianBackendApplication();
  await app.boot();

  const pageRepo = await app.getRepository(PageRepository);
  const sectionRepo = await app.getRepository(SectionRepository);

  console.log('Seeding home page data...');

  // Check if home page already exists
  let homePage = await pageRepo.findOne({where: {slug: 'home'}});

  if (!homePage) {
    console.log('Creating home page...');
    homePage = await pageRepo.create({
      id: uuidv4(),
      slug: 'home',
      title: 'Home Page',
      description: 'Valiarian Home Page',
      status: 'published',
      publishedAt: new Date(),
      isActive: true,
      isDeleted: false,
    });
  } else {
    console.log('Home page already exists, updating it...');
    await pageRepo.updateById(homePage.id, {
      status: 'published',
      updatedAt: new Date(),
    });
  }

  // Delete existing sections to re-seed (idempotent approach)
  const existingSections = await sectionRepo.find({where: {pageId: homePage.id}});
  for (const section of existingSections) {
    await sectionRepo.deleteById(section.id);
  }

  const sectionsData = [
    {
      type: 'hero' as const,
      name: 'Hero Section',
      order: 1,
      enabled: true,
      content: {
        title: 'Premium Cotton Polos.',
        ctaText: 'Explore Collection',
        ctaLink: '/product',
        backgroundImage: '/assets/images/home/hero/valiarian-hero.png',
      },
    },
    {
      type: 'scroll-animated' as const,
      name: 'Scroll Animated Products',
      order: 2,
      enabled: true,
      content: {
        products: [
          {
            id: 1,
            title: 'Premium Classic T-Shirt',
            description: 'Crafted with premium cotton for ultimate comfort and style. Perfect for everyday wear.',
            image: '/assets/images/home/scroll-animation/tshirt1-removebg-preview.png',
            buttonText: 'Shop Now',
            buttonLink: '/product',
          },
          {
            id: 2,
            title: 'Essential Comfort Fit',
            description: 'Experience the perfect blend of comfort and durability. Made to last, designed to impress.',
            image: '/assets/images/home/scroll-animation/tshirt2-removebg-preview.png',
            buttonText: 'Explore',
            buttonLink: '/product',
          },
          {
            id: 3,
            title: 'Modern Fit Premium',
            description: 'Contemporary design meets classic elegance. Elevate your wardrobe with this timeless piece.',
            image: '/assets/images/home/scroll-animation/tshirt3-removebg-preview.png',
            buttonText: 'Discover',
            buttonLink: '/product',
          },
          {
            id: 4,
            title: 'Signature Collection',
            description: 'Our signature piece that defines quality and style. A must-have for the modern wardrobe.',
            image: '/assets/images/home/scroll-animation/tshirt2-removebg-preview.png',
            buttonText: 'View Collection',
            buttonLink: '/product',
          },
        ],
      },
    },
    {
      type: 'new-arrivals' as const,
      name: 'New Arrivals Section',
      order: 3,
      enabled: true,
      content: {
        title: 'New Arrivals',
        subtitle: 'Discover our latest collection of premium cotton polos, crafted with the same attention to detail and commitment to quality.',
      },
    },
    {
      type: 'collection-hero' as const,
      name: 'Collection Hero',
      order: 4,
      enabled: true,
      content: {
        title: 'COLLECTION',
        subtitle: 'Explore our latest designs',
        backgroundImage: '/assets/images/home/new-arrival/new-arrival-hero.jpeg',
      },
    },
    {
      type: 'best-sellers' as const,
      name: 'Best Sellers Section',
      order: 5,
      enabled: true,
      content: {
        title: 'Best Sellers',
        subtitle: 'Our most beloved pieces, chosen by customers for their exceptional quality and timeless appeal.',
      },
    },
    {
      type: 'fabric-info' as const,
      name: 'Fabric Information',
      order: 6,
      enabled: true,
      content: {
        title: 'Premium Fabrics',
        subtitle: 'Discover the exceptional materials that make our clothing extraordinary',
        fabrics: [
          {
            id: 1,
            name: 'Premium Egyptian Cotton',
            description: 'Sourced from the finest Egyptian cotton fields, this luxurious fabric offers unmatched softness and breathability. Perfect for everyday comfort.',
            image: '/assets/images/home/fabric/fabric1.webp',
            video: '/assets/images/home/fabric/fabric1.mp4',
            tags: ['100% Cotton', 'Breathable', 'Durable'],
          },
          {
            id: 2,
            name: 'Organic Bamboo Fiber',
            description: 'Eco-friendly and naturally antimicrobial, bamboo fiber provides exceptional moisture-wicking properties and a silky smooth texture.',
            image: '/assets/images/home/fabric/fabric2.jpg',
            video: '/assets/images/home/fabric/fabric2.mp4',
            tags: ['Sustainable', 'Antimicrobial', 'Moisture-Wicking'],
          },
          {
            id: 3,
            name: 'Supima Cotton Blend',
            description: 'Premium Supima cotton blended with spandex for enhanced stretch and shape retention. Ideal for a modern, fitted silhouette.',
            image: '/assets/images/home/fabric/fabric1.webp',
            video: '/assets/images/home/fabric/fabric1.mp4',
            tags: ['Elastic', 'Shape Retention', 'Premium'],
          },
          {
            id: 4,
            name: 'Linen-Cotton Mix',
            description: 'The perfect blend of natural linen and cotton creates a fabric that is both sophisticated and comfortable, with excellent temperature regulation.',
            image: '/assets/images/home/fabric/fabric2.jpg',
            video: '/assets/images/home/fabric/fabric2.mp4',
            tags: ['Temperature Regulating', 'Elegant', 'Natural'],
          },
        ],
      },
    },
    {
      type: 'social-media' as const,
      name: 'Social Media Feed',
      order: 7,
      enabled: true,
      content: {
        title: '@valiarianpremiumpolos',
        instagram: 'valiarian.wear',
        youtube: 'valiarianwear',
      },
    },
  ];

  for (const sectionData of sectionsData) {
    console.log(`Creating section: ${sectionData.name}...`);
    await sectionRepo.create({
      id: uuidv4(),
      pageId: homePage.id,
      ...sectionData,
      isActive: true,
      isDeleted: false,
    });
  }

  console.log('Home page seeding completed successfully!');
  process.exit(0);
}

seedHomePage().catch(err => {
  console.error('Error seeding home page:', err);
  process.exit(1);
});
