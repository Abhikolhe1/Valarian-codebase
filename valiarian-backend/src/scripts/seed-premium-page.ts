import {v4 as uuidv4} from 'uuid';
import {ValiarianBackendApplication} from '../application';
import {PageRepository, SectionRepository} from '../repositories';

/**
 * Seed Premium Page Content
 * This script creates the premium page with all sections in the CMS
 */
export async function seedPremiumPage(app: ValiarianBackendApplication) {
  const pageRepo = await app.getRepository(PageRepository);
  const sectionRepo = await app.getRepository(SectionRepository);

  console.log('🌱 Starting premium page migration...');

  try {
    // Check if premium page already exists
    const existingPage = await pageRepo.findOne({where: {slug: 'premium'}});
    if (existingPage) {
      console.log('⚠️  Premium page already exists. Skipping...');
      return;
    }

    // Create premium page
    const premiumPageId = uuidv4();
    const premiumPage = await pageRepo.create({
      id: premiumPageId,
      slug: 'premium',
      title: 'Premium Collection',
      description: 'Signature Edition - Handcrafted premium cotton polos',
      status: 'published',
      seoTitle: 'Premium Signature Edition - Valiarian | Limited Edition Luxury Polos',
      seoDescription:
        'Discover the Signature Edition - handcrafted in Portugal using the world\'s finest Sea Island cotton. Only 150 pieces available. Experience true luxury.',
      seoKeywords: [
        'premium polos',
        'signature edition',
        'luxury fashion',
        'sea island cotton',
        'limited edition',
        'handcrafted',
        'portugal',
      ],
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Created premium page:', premiumPage.slug);

    // Create Hero Section
    const heroSection = await sectionRepo.create({
      id: uuidv4(),
      pageId: premiumPageId,
      type: 'hero',
      name: 'Premium Hero',
      order: 1,
      enabled: true,
      content: {
        heading: 'Once in a Lifetime.',
        subheading: 'Signature Edition',
        description:
          'Handcrafted in Portugal using the world\'s finest Sea Island cotton. Only 150 pieces available.',
        backgroundImage: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=1600&q=80',
        backgroundVideo: null,
        overlayOpacity: 0.4,
        ctaButtons: [
          {
            text: 'Explore Details',
            url: '#details',
            style: 'primary',
            icon: null,
            openInNewTab: false,
          },
        ],
        alignment: 'center',
        height: 'full',
        badge: {
          text: 'DROP LIVE NOW',
          icon: 'solar:bolt-bold',
          color: '#d32f2f',
        },
      },
      settings: {
        backgroundColor: '#f5f5f0',
        textColor: '#1a1a1a',
        headingColor: '#c17a3a',
        fontFamily: 'Cormorant Garamond',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Created premium hero section');

    // Create Countdown Section
    const countdownSection = await sectionRepo.create({
      id: uuidv4(),
      pageId: premiumPageId,
      type: 'text',
      name: 'Countdown Timer',
      order: 2,
      enabled: true,
      content: {
        title: 'Time is Luxury',
        subtitle: 'Don\'t waste it.',
        body: `
          <p>The allocation window is closing. Once the timer reaches zero, the Signature Edition enters the vault, never to be produced again. Secure your legacy.</p>
        `,
        alignment: 'left',
        countdown: {
          enabled: true,
          endDate: '2026-01-15T23:59:59',
          label: 'Drop Closes In',
        },
        productInfo: {
          edition: 'Standard Edition',
          available: 240,
          total: 400,
          sizes: ['S', 'M', 'L', 'XL'],
          ctaText: 'Preorder',
          ctaUrl: '/shop/premium',
        },
      },
      settings: {
        backgroundColor: '#f5f5f0',
        padding: 'xlarge',
        layout: 'split',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Created countdown section');

    // Create Fabric Details Section
    const fabricSection = await sectionRepo.create({
      id: uuidv4(),
      pageId: premiumPageId,
      type: 'text',
      name: 'Fabric Details',
      order: 3,
      enabled: true,
      content: {
        title: 'Crafted From Exceptional Materials',
        subtitle: 'Fabric Story',
        body: '',
        alignment: 'center',
        carousel: {
          enabled: true,
          items: [
            {
              name: 'Premium Egyptian Cotton',
              description:
                'Woven from long-staple Egyptian cotton fibers for unmatched softness, breathability, and durability. Designed for everyday luxury.',
              specs: {
                weight: '180 GSM',
                weave: 'Plain weave',
                feel: 'Ultra-soft',
              },
            },
            {
              name: 'Organic Piqué Knit',
              description:
                'A timeless polo knit structure that enhances airflow while maintaining a sharp, structured silhouette.',
              specs: {
                weight: '200 GSM',
                weave: 'Piqué knit',
                feel: 'Structured & airy',
              },
            },
            {
              name: 'Mercerized Cotton',
              description:
                'Mercerization strengthens the yarn, enhances luster, and delivers a refined, silky surface with long-lasting color.',
              specs: {
                weight: '190 GSM',
                weave: 'Mercerized weave',
                feel: 'Smooth & lustrous',
              },
            },
          ],
        },
      },
      settings: {
        backgroundColor: '#fafafa',
        padding: 'xlarge',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Created fabric details section');

    // Create Statement Section
    const statementSection = await sectionRepo.create({
      id: uuidv4(),
      pageId: premiumPageId,
      type: 'text',
      name: 'Statement of Arrival',
      order: 4,
      enabled: true,
      content: {
        title: '"Not Just a Shirt.',
        subtitle: 'A Statement of Arrival."',
        body: '',
        alignment: 'center',
      },
      settings: {
        backgroundColor: '#fafafa',
        padding: 'large',
        titleColor: '#8C6549',
        subtitleColor: '#4A39189E',
        fontFamily: 'Lora',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Created statement section');

    // Create "What Makes It Premium" Section
    const premiumFeaturesSection = await sectionRepo.create({
      id: uuidv4(),
      pageId: premiumPageId,
      type: 'features',
      name: 'What Makes It Premium',
      order: 5,
      enabled: true,
      content: {
        heading: 'What Makes It Premium',
        description:
          'THIS ISN\'T JUST ANOTHER POLO. IT\'S A MASTERPIECE OF CRAFTSMANSHIP, DESIGNED TO LAST A LIFETIME.',
        features: [
          {
            icon: '/assets/premium/ic-make-brand.png',
            title: 'Exceptional Fabric',
            description:
              'Sea Island cotton represents less than 0.0004% of global cotton production. Its rarity and quality make it the choice of the world\'s most discerning brands.',
            link: null,
          },
          {
            icon: '/assets/premium/ic-make-brand.png',
            title: 'Artisan Craftsmanship',
            description:
              'Hand-finished in Portugal by master tailors with over 30 years of experience. Each polo takes 6 hours to complete — 4x longer than mass-produced alternatives.',
            link: null,
          },
          {
            icon: '/assets/premium/ic-design.png',
            title: 'Engineered Fit',
            description:
              'Custom-developed pattern based on 10,000+ body scans. Tailored shoulders, tapered waist, and optimal sleeve length create a silhouette that enhances every physique.',
            link: null,
          },
          {
            icon: '/assets/premium/ic-development.png',
            title: 'Limited Production',
            description:
              'Only 150 pieces will ever be made. Each polo is individually numbered and comes with a certificate of authenticity, ensuring true exclusivity.',
            link: null,
          },
        ],
        layout: 'grid',
        columns: 4,
      },
      settings: {
        backgroundImage: '/assets/premium/premium.png',
        backgroundColor: '#1a1a1a',
        textColor: '#ffffff',
        overlayOpacity: 0.65,
        padding: 'xlarge',
        descriptionColor: '#FFF5CC',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Created premium features section');

    // Create "Order With Confidence" Section
    const confidenceSection = await sectionRepo.create({
      id: uuidv4(),
      pageId: premiumPageId,
      type: 'features',
      name: 'Order With Confidence',
      order: 6,
      enabled: true,
      content: {
        heading: 'Order With Confidence',
        description: '',
        features: [
          {
            icon: '/assets/premium/stack3.png',
            title: 'Secure Payments',
            description:
              'Every detail matters. From the selection of premium cotton to the final stitch, we never compromise on quality.',
            link: null,
          },
          {
            icon: '/assets/premium/stack1.png',
            title: 'Quality Guarantee',
            description:
              'We are committed to ethical production, sustainable materials, and creating garments designed to last a lifetime.',
            link: null,
          },
          {
            icon: '/assets/premium/stack.png',
            title: 'Premium Packaging',
            description:
              'We don\'t follow trends. We create classic pieces that transcend seasons and remain relevant year after year.',
            link: null,
          },
        ],
        layout: 'grid',
        columns: 3,
      },
      settings: {
        backgroundColor: '#F5F5F5',
        padding: 'xlarge',
        headingColor: '#7A5C45',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Created confidence section');

    // Create "Reserve Today" CTA Section
    const reserveSection = await sectionRepo.create({
      id: uuidv4(),
      pageId: premiumPageId,
      type: 'cta',
      name: 'Reserve Today',
      order: 7,
      enabled: true,
      content: {
        heading: 'Reserve Your\'s Today',
        description:
          'Only 150 pieces available worldwide. Once they\'re gone, they\'re gone forever.',
        backgroundImage: null,
        backgroundColor: '#AC7F5E45',
        buttons: [
          {
            text: 'Buy Now',
            url: '/shop/premium',
            style: 'primary',
            icon: null,
            openInNewTab: false,
          },
        ],
        alignment: 'center',
        additionalInfo: {
          text: 'Only Available Until 15th January 2026',
          position: 'above-button',
        },
      },
      settings: {
        textColor: '#8C6549',
        padding: 'xlarge',
        buttonColor: '#6A3941',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Created reserve today section');

    console.log('');
    console.log('🎉 Premium page migration completed successfully!');
    console.log('📄 Page ID:', premiumPageId);
    console.log('🔗 Page URL: /page/premium');
    console.log('');
    console.log('Next steps:');
    console.log('1. Upload images to media library through admin panel:');
    console.log('   - Premium background image (premium.png)');
    console.log('   - Feature icons (ic-make-brand.png, ic-design.png, ic-development.png)');
    console.log('   - Confidence icons (stack.png, stack1.png, stack3.png)');
    console.log('2. Update section content with actual image URLs from media library');
    console.log('3. Verify countdown timer functionality on frontend');
    console.log('4. Test fabric carousel on frontend');
    console.log('5. Verify page renders correctly with all sections');
  } catch (error) {
    console.error('❌ Error seeding premium page:', error);
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
    await seedPremiumPage(app);
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed premium page:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  run();
}
