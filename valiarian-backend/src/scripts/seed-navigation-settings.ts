import {v4 as uuidv4} from 'uuid';
import {ValiarianBackendApplication} from '../application';
import {NavigationMenuRepository, SiteSettingsRepository} from '../repositories';

/**
 * Seed Navigation Menus and Site Settings
 * This script creates navigation menus (header, footer, mobile) and site settings
 */
export async function seedNavigationAndSettings(app: ValiarianBackendApplication) {
  const navigationRepo = await app.getRepository(NavigationMenuRepository);
  const settingsRepo = await app.getRepository(SiteSettingsRepository);

  console.log('🌱 Starting navigation and settings migration...');

  try {
    // ========================================
    // HEADER NAVIGATION
    // ========================================
    const existingHeader = await navigationRepo.findByLocation('header');
    if (!existingHeader) {
      const headerNav = await navigationRepo.create({
        id: uuidv4(),
        name: 'Main Header Navigation',
        location: 'header',
        enabled: true,
        items: [
          {
            label: 'Home',
            url: '/',
            order: 1,
            openInNewTab: false,
          },
          {
            label: 'Category',
            url: '/product',
            order: 2,
            openInNewTab: false,
          },
          {
            label: 'About',
            url: '/about',
            order: 3,
            openInNewTab: false,
          },
          {
            label: 'Premium',
            url: '/premium',
            order: 4,
            openInNewTab: false,
          },
          {
            label: 'Contact',
            url: '/contact',
            order: 5,
            openInNewTab: false,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('✅ Created header navigation');
    } else {
      console.log('⚠️  Header navigation already exists. Skipping...');
    }

    // ========================================
    // FOOTER NAVIGATION
    // ========================================
    const existingFooter = await navigationRepo.findByLocation('footer');
    if (!existingFooter) {
      const footerNav = await navigationRepo.create({
        id: uuidv4(),
        name: 'Footer Navigation',
        location: 'footer',
        enabled: true,
        items: [
          // Quick Links Section
          {
            label: 'Quick Links',
            url: '#',
            order: 1,
            openInNewTab: false,
            children: [
              {
                label: 'Home',
                url: '/',
                order: 1,
                openInNewTab: false,
              },
              {
                label: 'Shop',
                url: '/product',
                order: 2,
                openInNewTab: false,
              },
              {
                label: 'About Us',
                url: '/about',
                order: 3,
                openInNewTab: false,
              },
              {
                label: 'Premium Collection',
                url: '/premium',
                order: 4,
                openInNewTab: false,
              },
            ],
          },
          // Customer Service Section
          {
            label: 'Customer Service',
            url: '#',
            order: 2,
            openInNewTab: false,
            children: [
              {
                label: 'Contact Us',
                url: '/contact',
                order: 1,
                openInNewTab: false,
              },
              {
                label: 'Shipping & Returns',
                url: '/shipping',
                order: 2,
                openInNewTab: false,
              },
              {
                label: 'Size Guide',
                url: '/size-guide',
                order: 3,
                openInNewTab: false,
              },
              {
                label: 'FAQ',
                url: '/faq',
                order: 4,
                openInNewTab: false,
              },
            ],
          },
          // Legal Section
          {
            label: 'Legal',
            url: '#',
            order: 3,
            openInNewTab: false,
            children: [
              {
                label: 'Privacy Policy',
                url: '/privacy',
                order: 1,
                openInNewTab: false,
              },
              {
                label: 'Terms of Service',
                url: '/terms',
                order: 2,
                openInNewTab: false,
              },
            ],
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('✅ Created footer navigation');
    } else {
      console.log('⚠️  Footer navigation already exists. Skipping...');
    }

    // ========================================
    // MOBILE NAVIGATION
    // ========================================
    const existingMobile = await navigationRepo.findByLocation('mobile');
    if (!existingMobile) {
      const mobileNav = await navigationRepo.create({
        id: uuidv4(),
        name: 'Mobile Navigation',
        location: 'mobile',
        enabled: true,
        items: [
          {
            label: 'Home',
            url: '/',
            icon: 'eva:home-fill',
            order: 1,
            openInNewTab: false,
          },
          {
            label: 'Shop',
            url: '/product',
            icon: 'eva:shopping-bag-fill',
            order: 2,
            openInNewTab: false,
          },
          {
            label: 'About',
            url: '/about',
            icon: 'eva:info-fill',
            order: 3,
            openInNewTab: false,
          },
          {
            label: 'Premium',
            url: '/premium',
            icon: 'eva:star-fill',
            order: 4,
            openInNewTab: false,
          },
          {
            label: 'Contact',
            url: '/contact',
            icon: 'eva:email-fill',
            order: 5,
            openInNewTab: false,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('✅ Created mobile navigation');
    } else {
      console.log('⚠️  Mobile navigation already exists. Skipping...');
    }

    // ========================================
    // SITE SETTINGS
    // ========================================
    const existingSettings = await settingsRepo.getSingleton();
    if (!existingSettings) {
      const settings = await settingsRepo.create({
        id: uuidv4(),
        siteName: 'Valiarian',
        siteDescription:
          'Premium cotton polos engineered for comfort. Discover luxury fashion with Valiarian.',
        logo: '/logo/logo_full.svg',
        favicon: '/favicon/favicon.ico',
        contactEmail: 'info@valiarian.com',
        contactPhone: '+1 (555) 123-4567',
        socialMedia: {
          facebook: 'https://facebook.com/valiarian',
          instagram: 'https://instagram.com/valiarian',
          twitter: 'https://twitter.com/valiarian',
          linkedin: 'https://linkedin.com/company/valiarian',
          youtube: 'https://youtube.com/@valiarian',
          pinterest: 'https://pinterest.com/valiarian',
        },
        footerText:
          'The starting point for your next project with Valiarian UI Kit, built on the newest version of Material-UI ©, ready to be customized to your style.',
        copyrightText: `© ${new Date().getFullYear()} Valiarian. All rights reserved`,
        gtmId: '', // Add Google Tag Manager ID if available
        gaId: '', // Add Google Analytics ID if available
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('✅ Created site settings');
    } else {
      console.log('⚠️  Site settings already exist. Skipping...');
    }

    console.log('');
    console.log('🎉 Navigation and settings migration completed successfully!');
    console.log('');
    console.log('Created:');
    console.log('  - Header Navigation (5 items)');
    console.log('  - Footer Navigation (3 sections with multiple links)');
    console.log('  - Mobile Navigation (5 items with icons)');
    console.log('  - Site Settings (logo, social media, contact info)');
    console.log('');
    console.log('Next steps:');
    console.log('1. Verify navigation menus in admin panel');
    console.log('2. Update social media URLs with actual links');
    console.log('3. Add Google Analytics and Tag Manager IDs if available');
    console.log('4. Test navigation on frontend');
  } catch (error) {
    console.error('❌ Error seeding navigation and settings:', error);
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
    await seedNavigationAndSettings(app);
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed navigation and settings:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  run();
}
