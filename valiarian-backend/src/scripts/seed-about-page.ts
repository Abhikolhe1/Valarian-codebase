import {v4 as uuidv4} from 'uuid';
import {ValiarianBackendApplication} from '../application';
import {PageRepository, SectionRepository} from '../repositories';

/**
 * Seed About Page Content
 * This script creates the about page with all sections in the CMS
 */
export async function seedAboutPage(app: ValiarianBackendApplication) {
  const pageRepo = await app.getRepository(PageRepository);
  const sectionRepo = await app.getRepository(SectionRepository);

  console.log('🌱 Starting about page migration...');

  try {
    // Check if about page already exists
    const existingPage = await pageRepo.findOne({where: {slug: 'about'}});
    if (existingPage) {
      console.log('⚠️  About page already exists. Skipping...');
      return;
    }

    // Create about page
    const aboutPageId = uuidv4();
    const aboutPage = await pageRepo.create({
      id: aboutPageId,
      slug: 'about',
      title: 'About Us',
      description: 'Learn about Valiarian - our story, vision, and team',
      status: 'published',
      seoTitle: 'About Valiarian - Premium Cotton Polos | Our Story',
      seoDescription:
        'Discover the story behind Valiarian. Learn about our commitment to quality, our vision for premium fashion, and meet the team behind our exceptional products.',
      seoKeywords: ['about valiarian', 'our story', 'premium fashion', 'team', 'vision', 'mission'],
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Created about page:', aboutPage.slug);

    // Create Hero Section
    const heroSection = await sectionRepo.create({
      id: uuidv4(),
      pageId: aboutPageId,
      type: 'hero',
      name: 'About Hero',
      order: 1,
      enabled: true,
      content: {
        heading: 'Who we are?',
        subheading: 'Let\'s work together and make awesome site easily',
        description: '',
        backgroundImage: '/assets/images/about/hero.jpg',
        backgroundVideo: null,
        overlayOpacity: 0.5,
        ctaButtons: [],
        alignment: 'left',
        height: 'medium',
      },
      settings: {
        backgroundColor: '#000000',
        textColor: '#ffffff',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Created about hero section');

    // Create "What is Valiarian" Section
    const whatSection = await sectionRepo.create({
      id: uuidv4(),
      pageId: aboutPageId,
      type: 'text',
      name: 'What is Valiarian',
      order: 2,
      enabled: true,
      content: {
        title: 'What is Valiarian?',
        subtitle: '',
        body: `
          <p>Our theme is the most advanced and user-friendly theme you will find on the market, we have documentation and video to help set your site really easily, pre-installed demos you can import in one click and everything from the theme options to page content can be edited from the front-end. This is the theme you are looking for.</p>

          <h4>Our Expertise</h4>
          <ul>
            <li><strong>Development:</strong> 20% - Cutting-edge technology and innovation</li>
            <li><strong>Design:</strong> 40% - Beautiful, functional, and user-centric design</li>
            <li><strong>Marketing:</strong> 60% - Strategic growth and brand building</li>
          </ul>
        `,
        alignment: 'left',
        images: [
          '/assets/images/about/what_1.png',
          '/assets/images/about/what_2.png',
        ],
      },
      settings: {
        backgroundColor: '#ffffff',
        padding: 'large',
        showImages: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Created what section');

    // Create Vision Section
    const visionSection = await sectionRepo.create({
      id: uuidv4(),
      pageId: aboutPageId,
      type: 'cta',
      name: 'Our Vision',
      order: 3,
      enabled: true,
      content: {
        heading: 'Our vision offering the best product nulla vehicula tortor scelerisque ultrices malesuada.',
        description: '',
        backgroundImage: '/assets/images/about/vision.jpg',
        backgroundColor: '#1a1a1a',
        buttons: [],
        alignment: 'center',
        showPlayButton: true,
        partnerLogos: [
          '/assets/icons/brands/ic_brand_ibm.svg',
          '/assets/icons/brands/ic_brand_lya.svg',
          '/assets/icons/brands/ic_brand_spotify.svg',
          '/assets/icons/brands/ic_brand_netflix.svg',
          '/assets/icons/brands/ic_brand_hbo.svg',
          '/assets/icons/brands/ic_brand_amazon.svg',
        ],
      },
      settings: {
        textColor: '#ffffff',
        overlayOpacity: 0.48,
        padding: 'xlarge',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Created vision section');

    // Create Team Section
    const teamSection = await sectionRepo.create({
      id: uuidv4(),
      pageId: aboutPageId,
      type: 'text',
      name: 'Our Team',
      order: 4,
      enabled: true,
      content: {
        title: 'Great team is the key',
        subtitle: 'Dream team',
        body: `
          <p>Valiarian will provide you support if you have any problems, our support team will reply within a day and we also have detailed documentation.</p>
        `,
        alignment: 'center',
        teamMembers: [
          {
            name: 'Jayvion Simon',
            role: 'Full Stack Designer',
            avatar: '/assets/images/avatar/avatar_1.jpg',
            social: {
              facebook: '#',
              instagram: '#',
              linkedin: '#',
              twitter: '#',
            },
          },
          {
            name: 'Lucian Obrien',
            role: 'Backend Developer',
            avatar: '/assets/images/avatar/avatar_2.jpg',
            social: {
              facebook: '#',
              instagram: '#',
              linkedin: '#',
              twitter: '#',
            },
          },
          {
            name: 'Deja Brady',
            role: 'Frontend Developer',
            avatar: '/assets/images/avatar/avatar_3.jpg',
            social: {
              facebook: '#',
              instagram: '#',
              linkedin: '#',
              twitter: '#',
            },
          },
          {
            name: 'Harrison Stein',
            role: 'UI/UX Designer',
            avatar: '/assets/images/avatar/avatar_4.jpg',
            social: {
              facebook: '#',
              instagram: '#',
              linkedin: '#',
              twitter: '#',
            },
          },
          {
            name: 'Reece Chung',
            role: 'Product Manager',
            avatar: '/assets/images/avatar/avatar_5.jpg',
            social: {
              facebook: '#',
              instagram: '#',
              linkedin: '#',
              twitter: '#',
            },
          },
          {
            name: 'Lainey Davidson',
            role: 'Marketing Manager',
            avatar: '/assets/images/avatar/avatar_6.jpg',
            social: {
              facebook: '#',
              instagram: '#',
              linkedin: '#',
              twitter: '#',
            },
          },
        ],
      },
      settings: {
        backgroundColor: '#ffffff',
        padding: 'large',
        layout: 'carousel',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Created team section');

    // Create Testimonials Section
    const testimonialsSection = await sectionRepo.create({
      id: uuidv4(),
      pageId: aboutPageId,
      type: 'testimonials',
      name: 'Customer Testimonials',
      order: 5,
      enabled: true,
      content: {
        heading: 'Who love my work',
        description: 'Our goal is to create a product and service that you\'re satisfied with and use it every day. This is why we\'re constantly working on our services to make it better every day and really listen to what our users has to say.',
        testimonials: [
          {
            name: 'Jayvion Simon',
            role: 'Customer',
            company: null,
            avatar: '/assets/images/avatar/avatar_1.jpg',
            content: 'Excellent Work! Thanks a lot!',
            rating: 5,
          },
          {
            name: 'Lucian Obrien',
            role: 'Customer',
            company: null,
            avatar: '/assets/images/avatar/avatar_2.jpg',
            content: 'It\'s a very good dashboard and we are really liking the product. We\'ve done some things, like migrate to TS and implementing a react useContext api, to fit our job methodology but the product is one of the best in terms of design and application architecture. The team did a really good job.',
            rating: 5,
          },
          {
            name: 'Deja Brady',
            role: 'Customer',
            company: null,
            avatar: '/assets/images/avatar/avatar_3.jpg',
            content: 'Customer support is realy fast and helpful the desgin of this theme is looks amazing also the code is very clean and readble realy good job!',
            rating: 5,
          },
          {
            name: 'Harrison Stein',
            role: 'Customer',
            company: null,
            avatar: '/assets/images/avatar/avatar_4.jpg',
            content: 'Amazing, really good code quality and gives you a lot of examples for implementations.',
            rating: 5,
          },
          {
            name: 'Reece Chung',
            role: 'Customer',
            company: null,
            avatar: '/assets/images/avatar/avatar_5.jpg',
            content: 'Got a few questions after purchasing the product. The owner responded very fast and very helpfull. Overall the code is excellent and works very good. 5/5 stars!',
            rating: 5,
          },
        ],
        layout: 'masonry',
        showRatings: true,
      },
      settings: {
        backgroundColor: '#1a1a1a',
        backgroundImage: '/assets/images/about/testimonials.jpg',
        textColor: '#ffffff',
        overlayOpacity: 0.9,
        padding: 'xlarge',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Created testimonials section');

    console.log('');
    console.log('🎉 About page migration completed successfully!');
    console.log('📄 Page ID:', aboutPageId);
    console.log('🔗 Page URL: /page/about');
    console.log('');
    console.log('Next steps:');
    console.log('1. Upload images to media library through admin panel:');
    console.log('   - /assets/images/about/hero.jpg');
    console.log('   - /assets/images/about/what_1.png');
    console.log('   - /assets/images/about/what_2.png');
    console.log('   - /assets/images/about/vision.jpg');
    console.log('   - /assets/images/about/testimonials.jpg');
    console.log('   - Team member avatars (avatar_1.jpg to avatar_6.jpg)');
    console.log('2. Update section content with actual image URLs from media library');
    console.log('3. Verify page renders correctly on frontend');
  } catch (error) {
    console.error('❌ Error seeding about page:', error);
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
    await seedAboutPage(app);
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed about page:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  run();
}
