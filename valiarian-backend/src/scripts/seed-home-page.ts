import {v4 as uuidv4} from 'uuid';
import {ValiarianBackendApplication} from '../application';
import {MediaRepository, PageRepository, SectionRepository} from '../repositories';

/**
 * Seed Home Page Content
 * This script creates the home page with all sections in the CMS
 */
export async function seedHomePage(app: ValiarianBackendApplication) {
  const pageRepo = await app.getRepository(PageRepository);
  const sectionRepo = await app.getRepository(SectionRepository);
  const mediaRepo = await app.getRepository(MediaRepository);

  console.log('🌱 Starting home page migration...');

  try {
    // Check if home page already exists
    const existingPage = await pageRepo.findOne({where: {slug: 'home'}});
    if (existingPage) {
      console.log('⚠️  Home page already exists. Skipping...');
      return;
    }

    // Create home page
    const homePageId = uuidv4();
    const homePage = await pageRepo.create({
      id: homePageId,
      slug: 'home',
      title: 'Home',
      description: 'Valiarian home page - Premium Cotton Polos',
      status: 'published',
      seoTitle: 'Valiarian - Premium Cotton Polos | Engineered for Comfort',
      seoDescription:
        'Discover premium cotton polos engineered for comfort. Shop our exclusive collection of luxury fashion at Valiarian.',
      seoKeywords: ['premium cotton', 'polos', 'luxury fashion', 'comfort', 'valiarian'],
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Created home page:', homePage.slug);

    // Create Hero Section
    const heroSection = await sectionRepo.create({
      id: uuidv4(),
      pageId: homePageId,
      type: 'hero',
      name: 'Home Hero',
      order: 1,
      enabled: true,
      content: {
        heading: 'Premium Cotton Polos',
        subheading: 'Engineered for Comfort',
        description:
          'Experience the perfect blend of style and comfort with our premium cotton polo collection.',
        backgroundImage: '/assets/images/home/hero-bg.jpg',
        backgroundVideo: null,
        overlayOpacity: 0.3,
        ctaButtons: [
          {
            text: 'Shop Now',
            url: '/shop',
            style: 'primary',
            icon: null,
            openInNewTab: false,
          },
          {
            text: 'Learn More',
            url: '/about',
            style: 'secondary',
            icon: null,
            openInNewTab: false,
          },
        ],
        alignment: 'center',
        height: 'full',
      },
      settings: {
        backgroundColor: '#000000',
        textColor: '#ffffff',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Created hero section');

    // Create Features Section
    const featuresSection = await sectionRepo.create({
      id: uuidv4(),
      pageId: homePageId,
      type: 'features',
      name: 'Why Choose Valiarian',
      order: 2,
      enabled: true,
      content: {
        heading: 'Why Choose Valiarian',
        description: 'Experience the difference with our premium quality products',
        features: [
          {
            icon: 'mdi:quality-high',
            title: 'Premium Quality',
            description: '100% premium cotton fabric for ultimate comfort and durability',
            link: null,
          },
          {
            icon: 'mdi:truck-fast',
            title: 'Fast Shipping',
            description: 'Free worldwide shipping on orders over $100',
            link: null,
          },
          {
            icon: 'mdi:shield-check',
            title: 'Quality Guarantee',
            description: '30-day money-back guarantee on all products',
            link: null,
          },
          {
            icon: 'mdi:headset',
            title: '24/7 Support',
            description: 'Dedicated customer support team ready to help',
            link: null,
          },
        ],
        layout: 'grid',
        columns: 4,
      },
      settings: {
        backgroundColor: '#ffffff',
        padding: 'large',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Created features section');

    // Create Best Sellers Section (Text section with product info)
    const bestSellersSection = await sectionRepo.create({
      id: uuidv4(),
      pageId: homePageId,
      type: 'text',
      name: 'Best Sellers',
      order: 3,
      enabled: true,
      content: {
        title: 'Best Sellers',
        subtitle: 'Our most popular products',
        body: '<p>Discover our best-selling premium cotton polos that customers love. Each piece is crafted with attention to detail and designed for lasting comfort.</p>',
        alignment: 'center',
      },
      settings: {
        backgroundColor: '#f9fafb',
        padding: 'medium',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Created best sellers section');

    // Create Testimonials Section
    const testimonialsSection = await sectionRepo.create({
      id: uuidv4(),
      pageId: homePageId,
      type: 'testimonials',
      name: 'Customer Reviews',
      order: 4,
      enabled: true,
      content: {
        heading: 'What Our Customers Say',
        description: 'Join thousands of satisfied customers',
        testimonials: [
          {
            name: 'John Smith',
            role: 'Fashion Enthusiast',
            company: null,
            avatar: '/assets/images/avatars/avatar-1.jpg',
            content:
              'The quality of these polos is exceptional. The fabric is soft, breathable, and the fit is perfect. Highly recommended!',
            rating: 5,
          },
          {
            name: 'Sarah Johnson',
            role: 'Business Professional',
            company: null,
            avatar: '/assets/images/avatars/avatar-2.jpg',
            content:
              'I love the premium feel and elegant design. These polos are perfect for both casual and business settings.',
            rating: 5,
          },
          {
            name: 'Michael Chen',
            role: 'Style Blogger',
            company: null,
            avatar: '/assets/images/avatars/avatar-3.jpg',
            content:
              'Valiarian has become my go-to brand for quality polos. The attention to detail is impressive.',
            rating: 5,
          },
        ],
        layout: 'grid',
        showRatings: true,
      },
      settings: {
        backgroundColor: '#ffffff',
        padding: 'large',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Created testimonials section');

    // Create CTA Section
    const ctaSection = await sectionRepo.create({
      id: uuidv4(),
      pageId: homePageId,
      type: 'cta',
      name: 'Shop Now CTA',
      order: 5,
      enabled: true,
      content: {
        heading: 'Ready to Experience Premium Quality?',
        description: 'Shop our exclusive collection and enjoy free shipping on orders over $100',
        backgroundImage: '/assets/images/home/cta-bg.jpg',
        backgroundColor: '#1a1a1a',
        buttons: [
          {
            text: 'Shop Collection',
            url: '/shop',
            style: 'primary',
            icon: 'mdi:arrow-right',
            openInNewTab: false,
          },
          {
            text: 'View Lookbook',
            url: '/lookbook',
            style: 'outline',
            icon: null,
            openInNewTab: false,
          },
        ],
        alignment: 'center',
      },
      settings: {
        textColor: '#ffffff',
        overlayOpacity: 0.5,
        padding: 'xlarge',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Created CTA section');

    // Create Fabric Details Section
    const fabricSection = await sectionRepo.create({
      id: uuidv4(),
      pageId: homePageId,
      type: 'text',
      name: 'Premium Fabric',
      order: 6,
      enabled: true,
      content: {
        title: 'Premium Cotton Fabric',
        subtitle: 'Engineered for Comfort',
        body: `
          <h3>What Makes Our Fabric Special</h3>
          <p>Our premium cotton polos are crafted from the finest long-staple cotton, ensuring exceptional softness and durability. Each piece undergoes rigorous quality control to meet our high standards.</p>
          <ul>
            <li>100% Premium Long-Staple Cotton</li>
            <li>Breathable and Moisture-Wicking</li>
            <li>Pre-Shrunk for Perfect Fit</li>
            <li>Colorfast Dyes for Lasting Vibrancy</li>
          </ul>
        `,
        alignment: 'left',
      },
      settings: {
        backgroundColor: '#ffffff',
        padding: 'large',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Created fabric section');

    console.log('');
    console.log('🎉 Home page migration completed successfully!');
    console.log('📄 Page ID:', homePageId);
    console.log('🔗 Page URL: /page/home');
    console.log('');
    console.log('Next steps:');
    console.log('1. Upload images to media library through admin panel');
    console.log('2. Update section content with actual image URLs');
    console.log('3. Verify page renders correctly on frontend');
  } catch (error) {
    console.error('❌ Error seeding home page:', error);
    throw error;
  }
}

/**
 * Run the seed script
 */
async function run() {
  const config = {
    rest: {
      port: +(process.env.PORT ?? 3035),
      host: process.env.HOST,
      gracePeriodForClose: 5000,
      openApiSpec: {
        setServersFromRequest: true,
      },
    },
  };

  const app = new ValiarianBackendApplication(config);
  await app.boot();

  try {
    await seedHomePage(app);
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed home page:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  run();
}
