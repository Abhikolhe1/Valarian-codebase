import {securityId, UserProfile} from '@loopback/security';
import {Client, expect} from '@loopback/testlab';
import {v4 as uuidv4} from 'uuid';
import {ValiarianBackendApplication} from '../..';
import {ContentVersionRepository, PageRepository, RolesRepository, SectionRepository, UserRolesRepository, UsersRepository} from '../../repositories';
import {BcryptHasher} from '../../services/hash.password.bcrypt';
import {JWTService} from '../../services/jwt-service';
import {setupApplication} from './test-helper';

describe('CMSPageController (acceptance)', () => {
  let app: ValiarianBackendApplication;
  let client: Client;
  let pageRepository: PageRepository;
  let sectionRepository: SectionRepository;
  let contentVersionRepository: ContentVersionRepository;
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
    pageRepository = await app.getRepository(PageRepository);
    sectionRepository = await app.getRepository(SectionRepository);
    contentVersionRepository = await app.getRepository(ContentVersionRepository);
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
    await pageRepository.deleteAll();
    await sectionRepository.deleteAll();
    await contentVersionRepository.deleteAll();

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

  describe('GET /api/cms/pages', () => {
    it('returns paginated list of pages', async () => {
      // Create test pages
      await pageRepository.create({
        id: uuidv4(),
        slug: 'test-page-1',
        title: 'Test Page 1',
        status: 'published',
        version: 1,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      });

      await pageRepository.create({
        id: uuidv4(),
        slug: 'test-page-2',
        title: 'Test Page 2',
        status: 'draft',
        version: 1,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      });

      const res = await client.get('/api/cms/pages').expect(200);

      expect(res.body).to.have.properties(['data', 'total', 'page', 'pageSize']);
      expect(res.body.data).to.be.Array();
      expect(res.body.total).to.equal(2);
      expect(res.body.data.length).to.equal(2);
    });

    it('filters pages by status', async () => {
      await pageRepository.create({
        id: uuidv4(),
        slug: 'published-page',
        title: 'Published Page',
        status: 'published',
        version: 1,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      });

      await pageRepository.create({
        id: uuidv4(),
        slug: 'draft-page',
        title: 'Draft Page',
        status: 'draft',
        version: 1,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      });

      const res = await client
        .get('/api/cms/pages')
        .query({status: 'published'})
        .expect(200);

      expect(res.body.data.length).to.equal(1);
      expect(res.body.data[0].status).to.equal('published');
    });

    it('searches pages by title', async () => {
      await pageRepository.create({
        id: uuidv4(),
        slug: 'home-page',
        title: 'Home Page',
        status: 'published',
        version: 1,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      });

      await pageRepository.create({
        id: uuidv4(),
        slug: 'about-page',
        title: 'About Us',
        status: 'published',
        version: 1,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      });

      const res = await client
        .get('/api/cms/pages')
        .query({search: 'Home'})
        .expect(200);

      expect(res.body.data.length).to.equal(1);
      expect(res.body.data[0].title).to.equal('Home Page');
    });

    it('supports pagination', async () => {
      // Create 15 pages
      for (let i = 1; i <= 15; i++) {
        await pageRepository.create({
          id: uuidv4(),
          slug: `page-${i}`,
          title: `Page ${i}`,
          status: 'published',
          version: 1,
          createdBy: adminUserId,
          updatedBy: adminUserId,
        });
      }

      const res = await client
        .get('/api/cms/pages')
        .query({page: 2, pageSize: 10})
        .expect(200);

      expect(res.body.data.length).to.equal(5);
      expect(res.body.page).to.equal(2);
      expect(res.body.pageSize).to.equal(10);
      expect(res.body.total).to.equal(15);
    });
  });

  describe('GET /api/cms/pages/slug/{slug}', () => {
    it('returns published page by slug', async () => {
      const page = await pageRepository.create({
        id: uuidv4(),
        slug: 'test-page',
        title: 'Test Page',
        description: 'Test description',
        status: 'published',
        version: 1,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      });

      const res = await client
        .get('/api/cms/pages/slug/test-page')
        .expect(200);

      expect(res.body.id).to.equal(page.id);
      expect(res.body.slug).to.equal('test-page');
      expect(res.body.title).to.equal('Test Page');
    });

    it('returns 404 for non-existent slug', async () => {
      await client
        .get('/api/cms/pages/slug/non-existent')
        .expect(404);
    });

    it('returns 404 for draft page', async () => {
      await pageRepository.create({
        id: uuidv4(),
        slug: 'draft-page',
        title: 'Draft Page',
        status: 'draft',
        version: 1,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      });

      await client
        .get('/api/cms/pages/slug/draft-page')
        .expect(404);
    });
  });

  describe('GET /api/cms/pages/{id}', () => {
    it('returns page by ID with authentication', async () => {
      const page = await pageRepository.create({
        id: uuidv4(),
        slug: 'test-page',
        title: 'Test Page',
        status: 'draft',
        version: 1,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      });

      const res = await client
        .get(`/api/cms/pages/${page.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.id).to.equal(page.id);
      expect(res.body.slug).to.equal('test-page');
    });

    it('returns 401 without authentication', async () => {
      const page = await pageRepository.create({
        id: uuidv4(),
        slug: 'test-page',
        title: 'Test Page',
        status: 'draft',
        version: 1,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      });

      await client
        .get(`/api/cms/pages/${page.id}`)
        .expect(401);
    });
  });

  describe('POST /api/cms/pages', () => {
    it('creates a new page with valid data', async () => {
      const pageData = {
        slug: 'new-page',
        title: 'New Page',
        description: 'New page description',
        status: 'draft',
        seoTitle: 'New Page SEO',
        seoDescription: 'SEO description',
        seoKeywords: ['test', 'page'],
      };

      const res = await client
        .post('/api/cms/pages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(pageData)
        .expect(201);

      expect(res.body.slug).to.equal('new-page');
      expect(res.body.title).to.equal('New Page');
      expect(res.body.status).to.equal('draft');
      expect(res.body.version).to.equal(1);
      expect(res.body.createdBy).to.equal(adminUserId);

      // Verify page was created in database
      const createdPage = await pageRepository.findById(res.body.id);
      expect(createdPage).to.not.be.null();
      expect(createdPage.slug).to.equal('new-page');

      // Verify version was created
      const versions = await contentVersionRepository.find({
        where: {pageId: res.body.id},
      });
      expect(versions.length).to.equal(1);
    });

    it('returns 400 for duplicate slug', async () => {
      await pageRepository.create({
        id: uuidv4(),
        slug: 'existing-page',
        title: 'Existing Page',
        status: 'published',
        version: 1,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      });

      const pageData = {
        slug: 'existing-page',
        title: 'New Page',
      };

      const res = await client
        .post('/api/cms/pages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(pageData)
        .expect(400);

      expect(res.body.error.message).to.match(/already exists/);
    });

    it('returns 400 for scheduled page without scheduledAt', async () => {
      const pageData = {
        slug: 'scheduled-page',
        title: 'Scheduled Page',
        status: 'scheduled',
      };

      const res = await client
        .post('/api/cms/pages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(pageData)
        .expect(400);

      expect(res.body.error.message).to.match(/scheduledAt is required/);
    });

    it('returns 400 for scheduled page with past date', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const pageData = {
        slug: 'scheduled-page',
        title: 'Scheduled Page',
        status: 'scheduled',
        scheduledAt: pastDate.toISOString(),
      };

      const res = await client
        .post('/api/cms/pages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(pageData)
        .expect(400);

      expect(res.body.error.message).to.match(/must be a future date/);
    });

    it('returns 401 without authentication', async () => {
      const pageData = {
        slug: 'new-page',
        title: 'New Page',
      };

      await client
        .post('/api/cms/pages')
        .send(pageData)
        .expect(401);
    });
  });

  describe('PUT /api/cms/pages/{id}', () => {
    it('updates page with valid data', async () => {
      const page = await pageRepository.create({
        id: uuidv4(),
        slug: 'test-page',
        title: 'Test Page',
        status: 'draft',
        version: 1,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      });

      const updateData = {
        title: 'Updated Title',
        description: 'Updated description',
      };

      const res = await client
        .put(`/api/cms/pages/${page.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(res.body.title).to.equal('Updated Title');
      expect(res.body.description).to.equal('Updated description');
      expect(res.body.version).to.equal(2);
    });

    it('returns 400 for duplicate slug', async () => {
      await pageRepository.create({
        id: uuidv4(),
        slug: 'existing-page',
        title: 'Existing Page',
        status: 'published',
        version: 1,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      });

      const page = await pageRepository.create({
        id: uuidv4(),
        slug: 'test-page',
        title: 'Test Page',
        status: 'draft',
        version: 1,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      });

      const updateData = {
        slug: 'existing-page',
      };

      const res = await client
        .put(`/api/cms/pages/${page.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(400);

      expect(res.body.error.message).to.match(/already exists/);
    });

    it('returns 404 for non-existent page', async () => {
      const fakeId = uuidv4();
      const updateData = {
        title: 'Updated Title',
      };

      await client
        .put(`/api/cms/pages/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(404);
    });

    it('returns 401 without authentication', async () => {
      const page = await pageRepository.create({
        id: uuidv4(),
        slug: 'test-page',
        title: 'Test Page',
        status: 'draft',
        version: 1,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      });

      const updateData = {
        title: 'Updated Title',
      };

      await client
        .put(`/api/cms/pages/${page.id}`)
        .send(updateData)
        .expect(401);
    });
  });

  describe('POST /api/cms/pages/{id}/publish', () => {
    it('publishes a draft page', async () => {
      const page = await pageRepository.create({
        id: uuidv4(),
        slug: 'test-page',
        title: 'Test Page',
        status: 'draft',
        version: 1,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      });

      const res = await client
        .post(`/api/cms/pages/${page.id}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({comment: 'Publishing page'})
        .expect(200);

      expect(res.body.status).to.equal('published');
      expect(res.body.publishedAt).to.not.be.null();
    });

    it('returns 401 without authentication', async () => {
      const page = await pageRepository.create({
        id: uuidv4(),
        slug: 'test-page',
        title: 'Test Page',
        status: 'draft',
        version: 1,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      });

      await client
        .post(`/api/cms/pages/${page.id}/publish`)
        .send({comment: 'Publishing page'})
        .expect(401);
    });
  });

  describe('POST /api/cms/pages/{id}/duplicate', () => {
    it('duplicates a page with new slug', async () => {
      const page = await pageRepository.create({
        id: uuidv4(),
        slug: 'original-page',
        title: 'Original Page',
        description: 'Original description',
        status: 'published',
        version: 1,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      });

      // Create sections for the original page
      await sectionRepository.create({
        id: uuidv4(),
        pageId: page.id,
        type: 'hero',
        name: 'Hero Section',
        order: 0,
        enabled: true,
        content: {heading: 'Welcome'},
      });

      const res = await client
        .post(`/api/cms/pages/${page.id}/duplicate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          newSlug: 'duplicated-page',
          newTitle: 'Duplicated Page',
        })
        .expect(201);

      expect(res.body.slug).to.equal('duplicated-page');
      expect(res.body.title).to.equal('Duplicated Page');
      expect(res.body.description).to.equal('Original description');
      expect(res.body.status).to.equal('draft');
      expect(res.body.id).to.not.equal(page.id);

      // Verify sections were duplicated
      const duplicatedSections = await sectionRepository.find({
        where: {pageId: res.body.id},
      });
      expect(duplicatedSections.length).to.equal(1);
      expect(duplicatedSections[0].name).to.equal('Hero Section');
    });

    it('returns 400 for duplicate slug', async () => {
      const page = await pageRepository.create({
        id: uuidv4(),
        slug: 'original-page',
        title: 'Original Page',
        status: 'published',
        version: 1,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      });

      await pageRepository.create({
        id: uuidv4(),
        slug: 'existing-page',
        title: 'Existing Page',
        status: 'published',
        version: 1,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      });

      const res = await client
        .post(`/api/cms/pages/${page.id}/duplicate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          newSlug: 'existing-page',
        })
        .expect(400);

      expect(res.body.error.message).to.match(/already exists/);
    });

    it('returns 401 without authentication', async () => {
      const page = await pageRepository.create({
        id: uuidv4(),
        slug: 'test-page',
        title: 'Test Page',
        status: 'published',
        version: 1,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      });

      await client
        .post(`/api/cms/pages/${page.id}/duplicate`)
        .send({newSlug: 'duplicated-page'})
        .expect(401);
    });
  });

  describe('GET /api/cms/pages/{id}/versions', () => {
    it('returns page version history', async () => {
      const page = await pageRepository.create({
        id: uuidv4(),
        slug: 'test-page',
        title: 'Test Page',
        status: 'draft',
        version: 1,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      });

      // Create versions
      await contentVersionRepository.create({
        id: uuidv4(),
        pageId: page.id,
        version: 1,
        content: {page: {title: 'Test Page'}, sections: []},
        comment: 'Initial version',
        createdBy: adminUserId,
      });

      await contentVersionRepository.create({
        id: uuidv4(),
        pageId: page.id,
        version: 2,
        content: {page: {title: 'Updated Page'}, sections: []},
        comment: 'Updated title',
        createdBy: adminUserId,
      });

      const res = await client
        .get(`/api/cms/pages/${page.id}/versions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).to.be.Array();
      expect(res.body.length).to.equal(2);
      expect(res.body[0].version).to.equal(2); // Latest first
      expect(res.body[1].version).to.equal(1);
    });

    it('returns 401 without authentication', async () => {
      const page = await pageRepository.create({
        id: uuidv4(),
        slug: 'test-page',
        title: 'Test Page',
        status: 'draft',
        version: 1,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      });

      await client
        .get(`/api/cms/pages/${page.id}/versions`)
        .expect(401);
    });
  });

  describe('POST /api/cms/pages/{id}/revert/{versionNumber}', () => {
    it('reverts page to specified version', async () => {
      const page = await pageRepository.create({
        id: uuidv4(),
        slug: 'test-page',
        title: 'Current Title',
        description: 'Current description',
        status: 'draft',
        version: 2,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      });

      // Create version to revert to
      await contentVersionRepository.create({
        id: uuidv4(),
        pageId: page.id,
        version: 1,
        content: {
          page: {
            slug: 'test-page',
            title: 'Original Title',
            description: 'Original description',
            status: 'draft',
          },
          sections: [],
        },
        comment: 'Initial version',
        createdBy: adminUserId,
      });

      const res = await client
        .post(`/api/cms/pages/${page.id}/revert/1`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({comment: 'Reverting to version 1'})
        .expect(200);

      expect(res.body.title).to.equal('Original Title');
      expect(res.body.description).to.equal('Original description');
      expect(res.body.version).to.equal(3); // Version incremented
    });

    it('returns 404 for non-existent version', async () => {
      const page = await pageRepository.create({
        id: uuidv4(),
        slug: 'test-page',
        title: 'Test Page',
        status: 'draft',
        version: 1,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      });

      await client
        .post(`/api/cms/pages/${page.id}/revert/999`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({comment: 'Reverting'})
        .expect(404);
    });

    it('returns 401 without authentication', async () => {
      const page = await pageRepository.create({
        id: uuidv4(),
        slug: 'test-page',
        title: 'Test Page',
        status: 'draft',
        version: 1,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      });

      await client
        .post(`/api/cms/pages/${page.id}/revert/1`)
        .send({comment: 'Reverting'})
        .expect(401);
    });
  });
});
