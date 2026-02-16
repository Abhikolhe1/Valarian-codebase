import {securityId, UserProfile} from '@loopback/security';
import {Client, expect} from '@loopback/testlab';
import {v4 as uuidv4} from 'uuid';
import {ValiarianBackendApplication} from '../..';
import {
  NavigationMenuRepository,
  RolesRepository,
  SectionTemplateRepository,
  SiteSettingsRepository,
  UserRolesRepository,
  UsersRepository,
} from '../../repositories';
import {BcryptHasher} from '../../services/hash.password.bcrypt';
import {JWTService} from '../../services/jwt-service';
import {setupApplication} from './test-helper';

describe('CMS Template, Navigation, and Settings Controllers (acceptance)', () => {
  let app: ValiarianBackendApplication;
  let client: Client;
  let sectionTemplateRepository: SectionTemplateRepository;
  let navigationMenuRepository: NavigationMenuRepository;
  let siteSettingsRepository: SiteSettingsRepository;
  let usersRepository: UsersRepository;
  let rolesRepository: RolesRepository;
  let userRolesRepository: UserRolesRepository;
  let jwtService: JWTService;
  let hasher: BcryptHasher;
  let adminToken: string;
  let adminUserId: string;
  let editorToken: string;
  let editorUserId: string;

  before('setupApplication', async () => {
    ({app, client} = await setupApplication());
    sectionTemplateRepository = await app.getRepository(SectionTemplateRepository);
    navigationMenuRepository = await app.getRepository(NavigationMenuRepository);
    siteSettingsRepository = await app.getRepository(SiteSettingsRepository);
    usersRepository = await app.getRepository(UsersRepository);
    rolesRepository = await app.getRepository(RolesRepository);
    userRolesRepository = await app.getRepository(UserRolesRepository);
    jwtService = await app.get('service.jwt.service');
    hasher = await app.get('service.hasher');
  });

  after(async () => {
    await app.stop();
  });

  beforeEach(async () => {
    // Clean up test data
    await sectionTemplateRepository.deleteAll();
    await navigationMenuRepository.deleteAll();

    // Create test users and roles
    const adminRole = await rolesRepository.findOne({where: {value: 'admin'}});
    const editorRole = await rolesRepository.findOne({where: {value: 'editor'}});

    if (!adminRole || !editorRole) {
      throw new Error('Required roles not found in database');
    }

    // Create admin user
    const hashedPassword = await hasher.hashPassword('testpassword');
    const adminUser = await usersRepository.create({
      id: uuidv4(),
      email: 'admin@test.com',
      fullName: 'Admin User',
      password: hashedPassword,
      isActive: true,
    });
    adminUserId = adminUser.id;

    await userRolesRepository.create({
      usersId: adminUserId,
      rolesId: adminRole.id,
    });

    const adminProfile: UserProfile = {
      [securityId]: adminUserId,
      id: adminUserId,
      email: 'admin@test.com',
      roles: ['admin'],
    };
    adminToken = await jwtService.generateToken(adminProfile);

    // Create editor user
    const editorUser = await usersRepository.create({
      id: uuidv4(),
      email: 'editor@test.com',
      fullName: 'Editor User',
      password: hashedPassword,
      isActive: true,
    });
    editorUserId = editorUser.id;

    await userRolesRepository.create({
      usersId: editorUserId,
      rolesId: editorRole.id,
    });

    const editorProfile: UserProfile = {
      [securityId]: editorUserId,
      id: editorUserId,
      email: 'editor@test.com',
      roles: ['editor'],
    };
    editorToken = await jwtService.generateToken(editorProfile);
  });

  describe('CMSTemplateController', () => {
    describe('GET /api/cms/templates', () => {
      it('returns all templates', async () => {
        // Create test templates
        await sectionTemplateRepository.create({
          id: uuidv4(),
          name: 'Hero Template 1',
          type: 'hero',
          description: 'A hero section template',
          defaultContent: {heading: 'Welcome', subheading: 'To our site'},
          createdBy: adminUserId,
        });

        await sectionTemplateRepository.create({
          id: uuidv4(),
          name: 'Features Template 1',
          type: 'features',
          description: 'A features section template',
          defaultContent: {features: []},
          createdBy: adminUserId,
        });

        const res = await client.get('/api/cms/templates').expect(200);

        expect(res.body).to.be.Array();
        expect(res.body.length).to.equal(2);
      });

      it('filters templates by type', async () => {
        await sectionTemplateRepository.create({
          id: uuidv4(),
          name: 'Hero Template 1',
          type: 'hero',
          defaultContent: {heading: 'Welcome'},
          createdBy: adminUserId,
        });

        await sectionTemplateRepository.create({
          id: uuidv4(),
          name: 'Features Template 1',
          type: 'features',
          defaultContent: {features: []},
          createdBy: adminUserId,
        });

        const res = await client
          .get('/api/cms/templates')
          .query({type: 'hero'})
          .expect(200);

        expect(res.body).to.be.Array();
        expect(res.body.length).to.equal(1);
        expect(res.body[0].type).to.equal('hero');
      });

      it('returns templates grouped by type', async () => {
        await sectionTemplateRepository.create({
          id: uuidv4(),
          name: 'Hero Template 1',
          type: 'hero',
          defaultContent: {heading: 'Welcome'},
          createdBy: adminUserId,
        });

        await sectionTemplateRepository.create({
          id: uuidv4(),
          name: 'Hero Template 2',
          type: 'hero',
          defaultContent: {heading: 'Hello'},
          createdBy: adminUserId,
        });

        await sectionTemplateRepository.create({
          id: uuidv4(),
          name: 'Features Template 1',
          type: 'features',
          defaultContent: {features: []},
          createdBy: adminUserId,
        });

        const res = await client
          .get('/api/cms/templates')
          .query({grouped: true})
          .expect(200);

        expect(res.body).to.be.Object();
        expect(res.body.hero).to.be.Array();
        expect(res.body.hero.length).to.equal(2);
        expect(res.body.features).to.be.Array();
        expect(res.body.features.length).to.equal(1);
      });
    });

    describe('GET /api/cms/templates/{id}', () => {
      it('returns template by ID', async () => {
        const template = await sectionTemplateRepository.create({
          id: uuidv4(),
          name: 'Hero Template',
          type: 'hero',
          description: 'A hero section',
          defaultContent: {heading: 'Welcome'},
          schema: {type: 'object'},
          createdBy: adminUserId,
        });

        const res = await client
          .get(`/api/cms/templates/${template.id}`)
          .expect(200);

        expect(res.body.id).to.equal(template.id);
        expect(res.body.name).to.equal('Hero Template');
        expect(res.body.type).to.equal('hero');
      });

      it('returns 404 for non-existent template', async () => {
        const fakeId = uuidv4();
        await client.get(`/api/cms/templates/${fakeId}`).expect(404);
      });
    });

    describe('POST /api/cms/templates', () => {
      it('creates a new template with valid data', async () => {
        const templateData = {
          name: 'New Hero Template',
          type: 'hero',
          description: 'A new hero template',
          defaultContent: {
            heading: 'Welcome',
            subheading: 'To our site',
            ctaButtons: [],
          },
          schema: {
            type: 'object',
            properties: {
              heading: {type: 'string'},
            },
          },
        };

        const res = await client
          .post('/api/cms/templates')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(templateData)
          .expect(201);

        expect(res.body.name).to.equal('New Hero Template');
        expect(res.body.type).to.equal('hero');
        expect(res.body.createdBy).to.equal(adminUserId);
        expect(res.body.id).to.be.String();

        // Verify template was created in database
        const created = await sectionTemplateRepository.findById(res.body.id);
        expect(created).to.not.be.null();
      });

      it('returns 400 for duplicate template name', async () => {
        await sectionTemplateRepository.create({
          id: uuidv4(),
          name: 'Existing Template',
          type: 'hero',
          defaultContent: {heading: 'Welcome'},
          createdBy: adminUserId,
        });

        const templateData = {
          name: 'Existing Template',
          type: 'features',
          defaultContent: {features: []},
        };

        const res = await client
          .post('/api/cms/templates')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(templateData)
          .expect(400);

        expect(res.body.error.message).to.match(/already exists/);
      });

      it('returns 401 without authentication', async () => {
        const templateData = {
          name: 'New Template',
          type: 'hero',
          defaultContent: {heading: 'Welcome'},
        };

        await client.post('/api/cms/templates').send(templateData).expect(401);
      });
    });
  });

  describe('CMSNavigationController', () => {
    describe('GET /api/cms/navigation/{location}', () => {
      it('returns navigation menu by location', async () => {
        const menu = await navigationMenuRepository.create({
          id: uuidv4(),
          name: 'Header Menu',
          location: 'header',
          enabled: true,
          items: [
            {
              label: 'Home',
              url: '/',
              order: 0,
              openInNewTab: false,
            },
            {
              label: 'About',
              url: '/about',
              order: 1,
              openInNewTab: false,
            },
          ],
        });

        const res = await client
          .get('/api/cms/navigation/header')
          .expect(200);

        expect(res.body.id).to.equal(menu.id);
        expect(res.body.location).to.equal('header');
        expect(res.body.items).to.be.Array();
        expect(res.body.items.length).to.equal(2);
      });

      it('returns 400 for invalid location', async () => {
        const res = await client
          .get('/api/cms/navigation/invalid')
          .expect(400);

        expect(res.body.error.message).to.match(/Invalid location/);
      });

      it('returns 404 when menu not found', async () => {
        await client.get('/api/cms/navigation/header').expect(404);
      });

      it('does not return disabled menus', async () => {
        await navigationMenuRepository.create({
          id: uuidv4(),
          name: 'Header Menu',
          location: 'header',
          enabled: false,
          items: [],
        });

        await client.get('/api/cms/navigation/header').expect(404);
      });
    });

    describe('GET /api/cms/navigation', () => {
      it('returns all enabled navigation menus', async () => {
        await navigationMenuRepository.create({
          id: uuidv4(),
          name: 'Header Menu',
          location: 'header',
          enabled: true,
          items: [],
        });

        await navigationMenuRepository.create({
          id: uuidv4(),
          name: 'Footer Menu',
          location: 'footer',
          enabled: true,
          items: [],
        });

        await navigationMenuRepository.create({
          id: uuidv4(),
          name: 'Disabled Menu',
          location: 'sidebar',
          enabled: false,
          items: [],
        });

        const res = await client.get('/api/cms/navigation').expect(200);

        expect(res.body).to.be.Array();
        expect(res.body.length).to.equal(2);
        expect(res.body.every((m: any) => m.enabled)).to.be.true();
      });
    });

    describe('PUT /api/cms/navigation/{id}', () => {
      it('updates navigation menu', async () => {
        const menu = await navigationMenuRepository.create({
          id: uuidv4(),
          name: 'Header Menu',
          location: 'header',
          enabled: true,
          items: [
            {
              label: 'Home',
              url: '/',
              order: 0,
              openInNewTab: false,
            },
          ],
        });

        const updateData = {
          items: [
            {
              label: 'Home',
              url: '/',
              order: 0,
              openInNewTab: false,
            },
            {
              label: 'About',
              url: '/about',
              order: 1,
              openInNewTab: false,
            },
          ],
        };

        const res = await client
          .put(`/api/cms/navigation/${menu.id}`)
          .set('Authorization', `Bearer ${editorToken}`)
          .send(updateData)
          .expect(200);

        expect(res.body.items.length).to.equal(2);
        expect(res.body.items[1].label).to.equal('About');
      });

      it('supports nested menu items', async () => {
        const menu = await navigationMenuRepository.create({
          id: uuidv4(),
          name: 'Header Menu',
          location: 'header',
          enabled: true,
          items: [],
        });

        const updateData = {
          items: [
            {
              label: 'Products',
              url: '/products',
              order: 0,
              openInNewTab: false,
              children: [
                {
                  label: 'Category 1',
                  url: '/products/category-1',
                  order: 0,
                  parentId: 'products',
                  openInNewTab: false,
                },
                {
                  label: 'Category 2',
                  url: '/products/category-2',
                  order: 1,
                  parentId: 'products',
                  openInNewTab: false,
                },
              ],
            },
          ],
        };

        const res = await client
          .put(`/api/cms/navigation/${menu.id}`)
          .set('Authorization', `Bearer ${editorToken}`)
          .send(updateData)
          .expect(200);

        expect(res.body.items[0].children).to.be.Array();
        expect(res.body.items[0].children.length).to.equal(2);
        expect(res.body.items[0].children[0].parentId).to.equal('products');
      });

      it('validates menu item ordering', async () => {
        const menu = await navigationMenuRepository.create({
          id: uuidv4(),
          name: 'Header Menu',
          location: 'header',
          enabled: true,
          items: [],
        });

        const updateData = {
          items: [
            {
              label: 'Third',
              url: '/third',
              order: 2,
              openInNewTab: false,
            },
            {
              label: 'First',
              url: '/first',
              order: 0,
              openInNewTab: false,
            },
            {
              label: 'Second',
              url: '/second',
              order: 1,
              openInNewTab: false,
            },
          ],
        };

        const res = await client
          .put(`/api/cms/navigation/${menu.id}`)
          .set('Authorization', `Bearer ${editorToken}`)
          .send(updateData)
          .expect(200);

        expect(res.body.items.length).to.equal(3);
        // Items should be stored as provided (ordering is client responsibility)
        expect(res.body.items[0].label).to.equal('Third');
        expect(res.body.items[1].label).to.equal('First');
        expect(res.body.items[2].label).to.equal('Second');
      });

      it('returns 400 when changing location to existing location', async () => {
        await navigationMenuRepository.create({
          id: uuidv4(),
          name: 'Existing Header Menu',
          location: 'header',
          enabled: true,
          items: [],
        });

        const menu = await navigationMenuRepository.create({
          id: uuidv4(),
          name: 'Footer Menu',
          location: 'footer',
          enabled: true,
          items: [],
        });

        const updateData = {
          location: 'header',
        };

        const res = await client
          .put(`/api/cms/navigation/${menu.id}`)
          .set('Authorization', `Bearer ${editorToken}`)
          .send(updateData)
          .expect(400);

        expect(res.body.error.message).to.match(/already exists/);
      });

      it('returns 404 for non-existent menu', async () => {
        const fakeId = uuidv4();
        const updateData = {
          items: [],
        };

        await client
          .put(`/api/cms/navigation/${fakeId}`)
          .set('Authorization', `Bearer ${editorToken}`)
          .send(updateData)
          .expect(404);
      });

      it('returns 401 without authentication', async () => {
        const menu = await navigationMenuRepository.create({
          id: uuidv4(),
          name: 'Header Menu',
          location: 'header',
          enabled: true,
          items: [],
        });

        const updateData = {
          items: [],
        };

        await client
          .put(`/api/cms/navigation/${menu.id}`)
          .send(updateData)
          .expect(401);
      });
    });
  });

  describe('CMSSettingsController', () => {
    let settingsId: string;

    beforeEach(async () => {
      // Create singleton settings
      const settings = await siteSettingsRepository.create({
        id: uuidv4(),
        siteName: 'Test Site',
        siteDescription: 'A test site',
        contactEmail: 'test@example.com',
        socialMedia: {
          facebook: 'https://facebook.com/test',
          instagram: 'https://instagram.com/test',
        },
      });
      settingsId = settings.id;
    });

    describe('GET /api/cms/settings', () => {
      it('returns singleton site settings', async () => {
        const res = await client.get('/api/cms/settings').expect(200);

        expect(res.body.id).to.equal(settingsId);
        expect(res.body.siteName).to.equal('Test Site');
        expect(res.body.siteDescription).to.equal('A test site');
        expect(res.body.socialMedia).to.be.Object();
        expect(res.body.socialMedia.facebook).to.equal('https://facebook.com/test');
      });

      it('returns 404 when settings not found', async () => {
        await siteSettingsRepository.deleteAll();
        await client.get('/api/cms/settings').expect(404);
      });
    });

    describe('PUT /api/cms/settings', () => {
      it('updates site settings', async () => {
        const updateData = {
          siteName: 'Updated Site Name',
          siteDescription: 'Updated description',
          logo: 'https://example.com/logo.png',
          contactPhone: '+1234567890',
        };

        const res = await client
          .put('/api/cms/settings')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData)
          .expect(200);

        expect(res.body.siteName).to.equal('Updated Site Name');
        expect(res.body.siteDescription).to.equal('Updated description');
        expect(res.body.logo).to.equal('https://example.com/logo.png');
        expect(res.body.contactPhone).to.equal('+1234567890');
        // Original values should be preserved
        expect(res.body.contactEmail).to.equal('test@example.com');
      });

      it('updates social media links', async () => {
        const updateData = {
          socialMedia: {
            facebook: 'https://facebook.com/updated',
            instagram: 'https://instagram.com/updated',
            twitter: 'https://twitter.com/updated',
            linkedin: 'https://linkedin.com/updated',
            youtube: 'https://youtube.com/updated',
            pinterest: 'https://pinterest.com/updated',
          },
        };

        const res = await client
          .put('/api/cms/settings')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData)
          .expect(200);

        expect(res.body.socialMedia.facebook).to.equal('https://facebook.com/updated');
        expect(res.body.socialMedia.twitter).to.equal('https://twitter.com/updated');
        expect(res.body.socialMedia.linkedin).to.equal('https://linkedin.com/updated');
      });

      it('updates analytics IDs', async () => {
        const updateData = {
          gtmId: 'GTM-XXXXXXX',
          gaId: 'UA-XXXXXXXX-X',
        };

        const res = await client
          .put('/api/cms/settings')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData)
          .expect(200);

        expect(res.body.gtmId).to.equal('GTM-XXXXXXX');
        expect(res.body.gaId).to.equal('UA-XXXXXXXX-X');
      });

      it('maintains singleton behavior', async () => {
        // Update settings
        await client
          .put('/api/cms/settings')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({siteName: 'First Update'})
          .expect(200);

        // Update again
        await client
          .put('/api/cms/settings')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({siteName: 'Second Update'})
          .expect(200);

        // Verify only one settings record exists
        const allSettings = await siteSettingsRepository.find();
        expect(allSettings.length).to.equal(1);
        expect(allSettings[0].siteName).to.equal('Second Update');
      });

      it('returns 404 when settings not found', async () => {
        await siteSettingsRepository.deleteAll();

        const updateData = {
          siteName: 'Updated Name',
        };

        await client
          .put('/api/cms/settings')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData)
          .expect(404);
      });

      it('returns 401 without authentication', async () => {
        const updateData = {
          siteName: 'Updated Name',
        };

        await client.put('/api/cms/settings').send(updateData).expect(401);
      });
    });
  });
});
