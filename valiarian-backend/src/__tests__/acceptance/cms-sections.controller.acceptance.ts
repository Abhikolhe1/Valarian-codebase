import {securityId, UserProfile} from '@loopback/security';
import {Client, expect} from '@loopback/testlab';
import {v4 as uuidv4} from 'uuid';
import {ValiarianBackendApplication} from '../..';
import {
  PageRepository,
  RolesRepository,
  SectionRepository,
  UserRolesRepository,
  UsersRepository,
} from '../../repositories';
import {BcryptHasher} from '../../services/hash.password.bcrypt';
import {JWTService} from '../../services/jwt-service';
import {setupApplication} from './test-helper';

describe('CMSSectionController (acceptance)', () => {
  let app: ValiarianBackendApplication;
  let client: Client;
  let pageRepository: PageRepository;
  let sectionRepository: SectionRepository;
  let usersRepository: UsersRepository;
  let rolesRepository: RolesRepository;
  let userRolesRepository: UserRolesRepository;
  let jwtService: JWTService;
  let hasher: BcryptHasher;
  let adminToken: string;
  let adminUserId: string;
  let testPageId: string;

  before('setupApplication', async () => {
    ({app, client} = await setupApplication());
    pageRepository = await app.getRepository(PageRepository);
    sectionRepository = await app.getRepository(SectionRepository);
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
    await sectionRepository.deleteAll();
    await pageRepository.deleteAll();

    // Create test users and roles
    const adminRole = await rolesRepository.findOne({where: {value: 'admin'}});

    if (!adminRole) {
      throw new Error('Admin role not found in database');
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

    // Create a test page
    const testPage = await pageRepository.create({
      id: uuidv4(),
      slug: 'test-page',
      title: 'Test Page',
      status: 'draft',
      version: 1,
      createdBy: adminUserId,
      updatedBy: adminUserId,
    });
    testPageId = testPage.id;
  });

  describe('GET /api/cms/sections', () => {
    it('returns sections for a specific page', async () => {
      // Create sections for the test page
      await sectionRepository.create({
        id: uuidv4(),
        pageId: testPageId,
        type: 'hero',
        name: 'Hero Section',
        order: 0,
        enabled: true,
        content: {heading: 'Welcome'},
      });

      await sectionRepository.create({
        id: uuidv4(),
        pageId: testPageId,
        type: 'features',
        name: 'Features Section',
        order: 1,
        enabled: true,
        content: {features: []},
      });

      const res = await client
        .get('/api/cms/sections')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({pageId: testPageId})
        .expect(200);

      expect(res.body).to.be.Array();
      expect(res.body.length).to.equal(2);
      expect(res.body[0].pageId).to.equal(testPageId);
    });

    it('filters sections by type', async () => {
      await sectionRepository.create({
        id: uuidv4(),
        pageId: testPageId,
        type: 'hero',
        name: 'Hero Section',
        order: 0,
        enabled: true,
        content: {},
      });

      await sectionRepository.create({
        id: uuidv4(),
        pageId: testPageId,
        type: 'features',
        name: 'Features Section',
        order: 1,
        enabled: true,
        content: {},
      });

      const res = await client
        .get('/api/cms/sections')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({pageId: testPageId, type: 'hero'})
        .expect(200);

      expect(res.body).to.be.Array();
      expect(res.body.length).to.equal(1);
      expect(res.body[0].type).to.equal('hero');
    });

    it('excludes disabled sections when includeDisabled is false', async () => {
      await sectionRepository.create({
        id: uuidv4(),
        pageId: testPageId,
        type: 'hero',
        name: 'Enabled Section',
        order: 0,
        enabled: true,
        content: {},
      });

      await sectionRepository.create({
        id: uuidv4(),
        pageId: testPageId,
        type: 'features',
        name: 'Disabled Section',
        order: 1,
        enabled: false,
        content: {},
      });

      const res = await client
        .get('/api/cms/sections')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({pageId: testPageId, includeDisabled: false})
        .expect(200);

      expect(res.body).to.be.Array();
      expect(res.body.length).to.equal(1);
      expect(res.body[0].enabled).to.be.true();
    });

    it('returns 401 without authentication', async () => {
      await client.get('/api/cms/sections').expect(401);
    });
  });

  describe('GET /api/cms/sections/{id}', () => {
    it('returns section by ID', async () => {
      const section = await sectionRepository.create({
        id: uuidv4(),
        pageId: testPageId,
        type: 'hero',
        name: 'Hero Section',
        order: 0,
        enabled: true,
        content: {heading: 'Welcome', subheading: 'Test'},
      });

      const res = await client
        .get(`/api/cms/sections/${section.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.id).to.equal(section.id);
      expect(res.body.name).to.equal('Hero Section');
      expect(res.body.content.heading).to.equal('Welcome');
    });

    it('returns 404 for non-existent section', async () => {
      const fakeId = uuidv4();
      await client
        .get(`/api/cms/sections/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('returns 401 without authentication', async () => {
      const section = await sectionRepository.create({
        id: uuidv4(),
        pageId: testPageId,
        type: 'hero',
        name: 'Hero Section',
        order: 0,
        enabled: true,
        content: {},
      });

      await client.get(`/api/cms/sections/${section.id}`).expect(401);
    });
  });

  describe('POST /api/cms/sections', () => {
    it('creates a new section with valid data', async () => {
      const sectionData = {
        pageId: testPageId,
        type: 'hero',
        name: 'New Hero Section',
        order: 0,
        enabled: true,
        content: {
          heading: 'Welcome to Our Site',
          subheading: 'Discover amazing products',
          backgroundImage: '/images/hero.jpg',
        },
        settings: {
          height: 'full',
          alignment: 'center',
        },
      };

      const res = await client
        .post('/api/cms/sections')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sectionData)
        .expect(201);

      expect(res.body.pageId).to.equal(testPageId);
      expect(res.body.type).to.equal('hero');
      expect(res.body.name).to.equal('New Hero Section');
      expect(res.body.content.heading).to.equal('Welcome to Our Site');
      expect(res.body.order).to.equal(0);

      // Verify section was created in database
      const createdSection = await sectionRepository.findById(res.body.id);
      expect(createdSection).to.not.be.null();
      expect(createdSection.name).to.equal('New Hero Section');
    });

    it('auto-assigns order when not provided', async () => {
      // Create first section
      await sectionRepository.create({
        id: uuidv4(),
        pageId: testPageId,
        type: 'hero',
        name: 'First Section',
        order: 0,
        enabled: true,
        content: {},
      });

      const sectionData = {
        pageId: testPageId,
        type: 'features',
        name: 'Second Section',
        content: {},
      };

      const res = await client
        .post('/api/cms/sections')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sectionData)
        .expect(201);

      expect(res.body.order).to.equal(1);
    });

    it('returns 400 for non-existent page', async () => {
      const fakePageId = uuidv4();
      const sectionData = {
        pageId: fakePageId,
        type: 'hero',
        name: 'Test Section',
        content: {},
      };

      const res = await client
        .post('/api/cms/sections')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sectionData)
        .expect(400);

      expect(res.body.error.message).to.match(/not found/);
    });

    it('returns 401 without authentication', async () => {
      const sectionData = {
        pageId: testPageId,
        type: 'hero',
        name: 'Test Section',
        content: {},
      };

      await client.post('/api/cms/sections').send(sectionData).expect(401);
    });
  });

  describe('PUT /api/cms/sections/{id}', () => {
    it('updates section with valid data', async () => {
      const section = await sectionRepository.create({
        id: uuidv4(),
        pageId: testPageId,
        type: 'hero',
        name: 'Original Name',
        order: 0,
        enabled: true,
        content: {heading: 'Original Heading'},
      });

      const updateData = {
        name: 'Updated Name',
        content: {heading: 'Updated Heading', subheading: 'New Subheading'},
        enabled: false,
      };

      const res = await client
        .put(`/api/cms/sections/${section.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(res.body.name).to.equal('Updated Name');
      expect(res.body.content.heading).to.equal('Updated Heading');
      expect(res.body.enabled).to.be.false();
    });

    it('returns 404 for non-existent section', async () => {
      const fakeId = uuidv4();
      const updateData = {
        name: 'Updated Name',
      };

      await client
        .put(`/api/cms/sections/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(404);
    });

    it('returns 401 without authentication', async () => {
      const section = await sectionRepository.create({
        id: uuidv4(),
        pageId: testPageId,
        type: 'hero',
        name: 'Test Section',
        order: 0,
        enabled: true,
        content: {},
      });

      const updateData = {
        name: 'Updated Name',
      };

      await client
        .put(`/api/cms/sections/${section.id}`)
        .send(updateData)
        .expect(401);
    });
  });

  describe('DELETE /api/cms/sections/{id}', () => {
    it('deletes section successfully', async () => {
      const section = await sectionRepository.create({
        id: uuidv4(),
        pageId: testPageId,
        type: 'hero',
        name: 'Test Section',
        order: 0,
        enabled: true,
        content: {},
      });

      await client
        .del(`/api/cms/sections/${section.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Verify section was deleted
      const deletedSection = await sectionRepository.findOne({
        where: {id: section.id},
      });
      expect(deletedSection).to.be.null();
    });

    it('returns 404 for non-existent section', async () => {
      const fakeId = uuidv4();
      await client
        .del(`/api/cms/sections/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('returns 401 without authentication', async () => {
      const section = await sectionRepository.create({
        id: uuidv4(),
        pageId: testPageId,
        type: 'hero',
        name: 'Test Section',
        order: 0,
        enabled: true,
        content: {},
      });

      await client.del(`/api/cms/sections/${section.id}`).expect(401);
    });
  });

  describe('PUT /api/cms/sections/reorder', () => {
    it('reorders sections successfully', async () => {
      // Create sections with initial order
      const section1 = await sectionRepository.create({
        id: uuidv4(),
        pageId: testPageId,
        type: 'hero',
        name: 'Section 1',
        order: 0,
        enabled: true,
        content: {},
      });

      const section2 = await sectionRepository.create({
        id: uuidv4(),
        pageId: testPageId,
        type: 'features',
        name: 'Section 2',
        order: 1,
        enabled: true,
        content: {},
      });

      const section3 = await sectionRepository.create({
        id: uuidv4(),
        pageId: testPageId,
        type: 'cta',
        name: 'Section 3',
        order: 2,
        enabled: true,
        content: {},
      });

      // Reorder: section3, section1, section2
      const reorderData = {
        pageId: testPageId,
        sectionIds: [section3.id, section1.id, section2.id],
      };

      const res = await client
        .put('/api/cms/sections/reorder')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(reorderData)
        .expect(200);

      expect(res.body.success).to.be.true();
      expect(res.body.updated).to.equal(3);

      // Verify new order in database
      const updatedSection1 = await sectionRepository.findById(section1.id);
      const updatedSection2 = await sectionRepository.findById(section2.id);
      const updatedSection3 = await sectionRepository.findById(section3.id);

      expect(updatedSection3.order).to.equal(0);
      expect(updatedSection1.order).to.equal(1);
      expect(updatedSection2.order).to.equal(2);
    });

    it('returns 400 for non-existent page', async () => {
      const fakePageId = uuidv4();
      const reorderData = {
        pageId: fakePageId,
        sectionIds: [uuidv4(), uuidv4()],
      };

      const res = await client
        .put('/api/cms/sections/reorder')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(reorderData)
        .expect(400);

      expect(res.body.error.message).to.match(/not found/);
    });

    it('returns 400 for invalid section IDs', async () => {
      const reorderData = {
        pageId: testPageId,
        sectionIds: [uuidv4(), uuidv4()], // Non-existent sections
      };

      const res = await client
        .put('/api/cms/sections/reorder')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(reorderData)
        .expect(400);

      expect(res.body.error.message).to.match(/Failed to reorder/);
    });

    it('returns 401 without authentication', async () => {
      const reorderData = {
        pageId: testPageId,
        sectionIds: [uuidv4()],
      };

      await client
        .put('/api/cms/sections/reorder')
        .send(reorderData)
        .expect(401);
    });
  });
});
