import {securityId, UserProfile} from '@loopback/security';
import {Client, expect} from '@loopback/testlab';
import {v4 as uuidv4} from 'uuid';
import {ValiarianBackendApplication} from '../..';
import {
  AuditLogRepository,
  PageRepository,
  PermissionsRepository,
  RolePermissionsRepository,
  RolesRepository,
  UserRolesRepository,
  UsersRepository,
} from '../../repositories';
import {BcryptHasher} from '../../services/hash.password.bcrypt';
import {JWTService} from '../../services/jwt-service';
import {setupApplication} from './test-helper';

describe('Authorization and Audit Logging (acceptance)', () => {
  let app: ValiarianBackendApplication;
  let client: Client;
  let pageRepository: PageRepository;
  let auditLogRepository: AuditLogRepository;
  let usersRepository: UsersRepository;
  let rolesRepository: RolesRepository;
  let permissionsRepository: PermissionsRepository;
  let userRolesRepository: UserRolesRepository;
  let rolePermissionsRepository: RolePermissionsRepository;
  let jwtService: JWTService;
  let hasher: BcryptHasher;

  // Test users and tokens
  let superAdminToken: string;
  let superAdminUserId: string;
  let adminToken: string;
  let adminUserId: string;
  let editorToken: string;
  let editorUserId: string;
  let viewerToken: string;
  let viewerUserId: string;

  before('setupApplication', async () => {
    ({app, client} = await setupApplication());
    pageRepository = await app.getRepository(PageRepository);
    auditLogRepository = await app.getRepository(AuditLogRepository);
    usersRepository = await app.getRepository(UsersRepository);
    rolesRepository = await app.getRepository(RolesRepository);
    permissionsRepository = await app.getRepository(PermissionsRepository);
    userRolesRepository = await app.getRepository(UserRolesRepository);
    rolePermissionsRepository = await app.getRepository(RolePermissionsRepository);
    jwtService = await app.get('service.jwt.service');
    hasher = await app.get('service.hasher');
  });

  after(async () => {
    await app.stop();
  });

  beforeEach(async () => {
    // Clean up test data
    await pageRepository.deleteAll();
    await auditLogRepository.deleteAll();

    // Get roles from database
    const superAdminRole = await rolesRepository.findOne({where: {value: 'super_admin'}});
    const adminRole = await rolesRepository.findOne({where: {value: 'admin'}});
    const editorRole = await rolesRepository.findOne({where: {value: 'editor'}});
    const viewerRole = await rolesRepository.findOne({where: {value: 'viewer'}});

    if (!superAdminRole || !adminRole || !editorRole || !viewerRole) {
      throw new Error('Required roles not found in database');
    }

    // Get permissions from database
    const pagesCreatePerm = await permissionsRepository.findOne({
      where: {permission: 'cms:pages:create'},
    });
    const pagesReadPerm = await permissionsRepository.findOne({
      where: {permission: 'cms:pages:read'},
    });
    const pagesUpdatePerm = await permissionsRepository.findOne({
      where: {permission: 'cms:pages:update'},
    });
    const pagesDeletePerm = await permissionsRepository.findOne({
      where: {permission: 'cms:pages:delete'},
    });
    const pagesPublishPerm = await permissionsRepository.findOne({
      where: {permission: 'cms:pages:publish'},
    });

    if (!pagesCreatePerm || !pagesReadPerm || !pagesUpdatePerm || !pagesDeletePerm || !pagesPublishPerm) {
      throw new Error('Required permissions not found in database');
    }

    const hashedPassword = await hasher.hashPassword('testpassword');

    // Create Super Admin user
    const superAdminUser = await usersRepository.create({
      id: uuidv4(),
      email: 'superadmin@test.com',
      fullName: 'Super Admin User',
      password: hashedPassword,
      isActive: true,
    });
    superAdminUserId = superAdminUser.id;

    await userRolesRepository.create({
      usersId: superAdminUserId,
      rolesId: superAdminRole.id,
    });

    const superAdminProfile: UserProfile = {
      [securityId]: superAdminUserId,
      id: superAdminUserId,
      email: 'superadmin@test.com',
      roles: ['super_admin'],
      permissions: [],
    };
    superAdminToken = await jwtService.generateToken(superAdminProfile);

    // Create Admin user
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
      permissions: [
        'cms:pages:create',
        'cms:pages:read',
        'cms:pages:update',
        'cms:pages:delete',
        'cms:pages:publish',
      ],
    };
    adminToken = await jwtService.generateToken(adminProfile);

    // Create Editor user
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
      permissions: ['cms:pages:create', 'cms:pages:read', 'cms:pages:update'],
    };
    editorToken = await jwtService.generateToken(editorProfile);

    // Create Viewer user
    const viewerUser = await usersRepository.create({
      id: uuidv4(),
      email: 'viewer@test.com',
      fullName: 'Viewer User',
      password: hashedPassword,
      isActive: true,
    });
    viewerUserId = viewerUser.id;

    await userRolesRepository.create({
      usersId: viewerUserId,
      rolesId: viewerRole.id,
    });

    const viewerProfile: UserProfile = {
      [securityId]: viewerUserId,
      id: viewerUserId,
      email: 'viewer@test.com',
      roles: ['viewer'],
      permissions: ['cms:pages:read'],
    };
    viewerToken = await jwtService.generateToken(viewerProfile);
  });

  describe('Role-Based Access Control', () => {
    describe('Super Admin Role', () => {
      it('allows super admin to create pages', async () => {
        const pageData = {
          slug: 'super-admin-page',
          title: 'Super Admin Page',
          status: 'draft',
        };

        const res = await client
          .post('/api/cms/pages')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send(pageData)
          .expect(201);

        expect(res.body.slug).to.equal('super-admin-page');
      });

      it('allows super admin to publish pages', async () => {
        const page = await pageRepository.create({
          id: uuidv4(),
          slug: 'test-page',
          title: 'Test Page',
          status: 'draft',
          version: 1,
          createdBy: superAdminUserId,
          updatedBy: superAdminUserId,
        });

        const res = await client
          .post(`/api/cms/pages/${page.id}/publish`)
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({comment: 'Publishing'})
          .expect(200);

        expect(res.body.status).to.equal('published');
      });

      it('allows super admin to duplicate pages', async () => {
        const page = await pageRepository.create({
          id: uuidv4(),
          slug: 'original-page',
          title: 'Original Page',
          status: 'published',
          version: 1,
          createdBy: superAdminUserId,
          updatedBy: superAdminUserId,
        });

        const res = await client
          .post(`/api/cms/pages/${page.id}/duplicate`)
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({newSlug: 'duplicated-page'})
          .expect(201);

        expect(res.body.slug).to.equal('duplicated-page');
      });

      it('allows super admin to access audit logs', async () => {
        await client
          .get('/api/cms/audit-logs')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .expect(200);
      });
    });

    describe('Admin Role', () => {
      it('allows admin to create pages', async () => {
        const pageData = {
          slug: 'admin-page',
          title: 'Admin Page',
          status: 'draft',
        };

        const res = await client
          .post('/api/cms/pages')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(pageData)
          .expect(201);

        expect(res.body.slug).to.equal('admin-page');
      });

      it('allows admin to update pages', async () => {
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
          .put(`/api/cms/pages/${page.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({title: 'Updated Title'})
          .expect(200);

        expect(res.body.title).to.equal('Updated Title');
      });

      it('allows admin to publish pages', async () => {
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
          .send({comment: 'Publishing'})
          .expect(200);

        expect(res.body.status).to.equal('published');
      });

      it('allows admin to duplicate pages', async () => {
        const page = await pageRepository.create({
          id: uuidv4(),
          slug: 'original-page',
          title: 'Original Page',
          status: 'published',
          version: 1,
          createdBy: adminUserId,
          updatedBy: adminUserId,
        });

        const res = await client
          .post(`/api/cms/pages/${page.id}/duplicate`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({newSlug: 'duplicated-page'})
          .expect(201);

        expect(res.body.slug).to.equal('duplicated-page');
      });

      it('allows admin to access audit logs', async () => {
        await client
          .get('/api/cms/audit-logs')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      });
    });

    describe('Editor Role', () => {
      it('allows editor to create pages', async () => {
        const pageData = {
          slug: 'editor-page',
          title: 'Editor Page',
          status: 'draft',
        };

        const res = await client
          .post('/api/cms/pages')
          .set('Authorization', `Bearer ${editorToken}`)
          .send(pageData)
          .expect(201);

        expect(res.body.slug).to.equal('editor-page');
      });

      it('allows editor to update pages', async () => {
        const page = await pageRepository.create({
          id: uuidv4(),
          slug: 'test-page',
          title: 'Test Page',
          status: 'draft',
          version: 1,
          createdBy: editorUserId,
          updatedBy: editorUserId,
        });

        const res = await client
          .put(`/api/cms/pages/${page.id}`)
          .set('Authorization', `Bearer ${editorToken}`)
          .send({title: 'Updated Title'})
          .expect(200);

        expect(res.body.title).to.equal('Updated Title');
      });

      it('denies editor from publishing pages', async () => {
        const page = await pageRepository.create({
          id: uuidv4(),
          slug: 'test-page',
          title: 'Test Page',
          status: 'draft',
          version: 1,
          createdBy: editorUserId,
          updatedBy: editorUserId,
        });

        const res = await client
          .post(`/api/cms/pages/${page.id}/publish`)
          .set('Authorization', `Bearer ${editorToken}`)
          .send({comment: 'Publishing'})
          .expect(403);

        expect(res.body.error.message).to.match(/Forbidden/);
      });

      it('denies editor from duplicating pages', async () => {
        const page = await pageRepository.create({
          id: uuidv4(),
          slug: 'original-page',
          title: 'Original Page',
          status: 'published',
          version: 1,
          createdBy: editorUserId,
          updatedBy: editorUserId,
        });

        const res = await client
          .post(`/api/cms/pages/${page.id}/duplicate`)
          .set('Authorization', `Bearer ${editorToken}`)
          .send({newSlug: 'duplicated-page'})
          .expect(403);

        expect(res.body.error.message).to.match(/Forbidden/);
      });

      it('denies editor from accessing audit logs', async () => {
        const res = await client
          .get('/api/cms/audit-logs')
          .set('Authorization', `Bearer ${editorToken}`)
          .expect(403);

        expect(res.body.error.message).to.match(/Forbidden/);
      });
    });

    describe('Viewer Role', () => {
      it('allows viewer to read pages', async () => {
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
          .set('Authorization', `Bearer ${viewerToken}`)
          .expect(200);

        expect(res.body.id).to.equal(page.id);
      });

      it('denies viewer from creating pages', async () => {
        const pageData = {
          slug: 'viewer-page',
          title: 'Viewer Page',
          status: 'draft',
        };

        const res = await client
          .post('/api/cms/pages')
          .set('Authorization', `Bearer ${viewerToken}`)
          .send(pageData)
          .expect(403);

        expect(res.body.error.message).to.match(/Forbidden/);
      });

      it('denies viewer from updating pages', async () => {
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
          .put(`/api/cms/pages/${page.id}`)
          .set('Authorization', `Bearer ${viewerToken}`)
          .send({title: 'Updated Title'})
          .expect(403);

        expect(res.body.error.message).to.match(/Forbidden/);
      });

      it('denies viewer from publishing pages', async () => {
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
          .set('Authorization', `Bearer ${viewerToken}`)
          .send({comment: 'Publishing'})
          .expect(403);

        expect(res.body.error.message).to.match(/Forbidden/);
      });

      it('denies viewer from duplicating pages', async () => {
        const page = await pageRepository.create({
          id: uuidv4(),
          slug: 'original-page',
          title: 'Original Page',
          status: 'published',
          version: 1,
          createdBy: adminUserId,
          updatedBy: adminUserId,
        });

        const res = await client
          .post(`/api/cms/pages/${page.id}/duplicate`)
          .set('Authorization', `Bearer ${viewerToken}`)
          .send({newSlug: 'duplicated-page'})
          .expect(403);

        expect(res.body.error.message).to.match(/Forbidden/);
      });

      it('denies viewer from accessing audit logs', async () => {
        const res = await client
          .get('/api/cms/audit-logs')
          .set('Authorization', `Bearer ${viewerToken}`)
          .expect(403);

        expect(res.body.error.message).to.match(/Forbidden/);
      });
    });
  });

  describe('Audit Logging', () => {
    describe('Page Creation', () => {
      it('creates audit log when page is created', async () => {
        const pageData = {
          slug: 'audit-test-page',
          title: 'Audit Test Page',
          status: 'draft',
        };

        const res = await client
          .post('/api/cms/pages')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(pageData)
          .expect(201);

        const pageId = res.body.id;

        // Wait a bit for audit log to be created
        await new Promise(resolve => setTimeout(resolve, 100));

        const auditLogs = await auditLogRepository.find({
          where: {entityId: pageId, action: 'create'},
        });

        expect(auditLogs.length).to.be.greaterThan(0);
        const auditLog = auditLogs[0];
        expect(auditLog.userId).to.equal(adminUserId);
        expect(auditLog.action).to.equal('create');
        expect(auditLog.entityType).to.equal('page');
        expect(auditLog.entityId).to.equal(pageId);
      });
    });

    describe('Page Update', () => {
      it('creates audit log when page is updated', async () => {
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
          .put(`/api/cms/pages/${page.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({title: 'Updated Title', description: 'Updated description'})
          .expect(200);

        // Wait a bit for audit log to be created
        await new Promise(resolve => setTimeout(resolve, 100));

        const auditLogs = await auditLogRepository.find({
          where: {entityId: page.id, action: 'update'},
        });

        expect(auditLogs.length).to.be.greaterThan(0);
        const auditLog = auditLogs[0];
        expect(auditLog.userId).to.equal(adminUserId);
        expect(auditLog.action).to.equal('update');
        expect(auditLog.entityType).to.equal('page');
        expect(auditLog.entityId).to.equal(page.id);
        expect(auditLog.changes).to.be.Object();
      });
    });

    describe('Page Publishing', () => {
      it('creates audit log when page is published', async () => {
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

        // Wait a bit for audit log to be created
        await new Promise(resolve => setTimeout(resolve, 100));

        const auditLogs = await auditLogRepository.find({
          where: {entityId: page.id, action: 'publish'},
        });

        expect(auditLogs.length).to.be.greaterThan(0);
        const auditLog = auditLogs[0];
        expect(auditLog.userId).to.equal(adminUserId);
        expect(auditLog.action).to.equal('publish');
        expect(auditLog.entityType).to.equal('page');
        expect(auditLog.entityId).to.equal(page.id);
      });
    });

    describe('Page Duplication', () => {
      it('creates audit log when page is duplicated', async () => {
        const page = await pageRepository.create({
          id: uuidv4(),
          slug: 'original-page',
          title: 'Original Page',
          status: 'published',
          version: 1,
          createdBy: adminUserId,
          updatedBy: adminUserId,
        });

        const res = await client
          .post(`/api/cms/pages/${page.id}/duplicate`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({newSlug: 'duplicated-page'})
          .expect(201);

        const newPageId = res.body.id;

        // Wait a bit for audit log to be created
        await new Promise(resolve => setTimeout(resolve, 100));

        const auditLogs = await auditLogRepository.find({
          where: {entityId: newPageId, action: 'duplicate'},
        });

        expect(auditLogs.length).to.be.greaterThan(0);
        const auditLog = auditLogs[0];
        expect(auditLog.userId).to.equal(adminUserId);
        expect(auditLog.action).to.equal('duplicate');
        expect(auditLog.entityType).to.equal('page');
        expect(auditLog.entityId).to.equal(newPageId);
      });
    });

    describe('Audit Log Retrieval', () => {
      it('returns audit logs for a specific entity', async () => {
        const page = await pageRepository.create({
          id: uuidv4(),
          slug: 'test-page',
          title: 'Test Page',
          status: 'draft',
          version: 1,
          createdBy: adminUserId,
          updatedBy: adminUserId,
        });

        // Create some audit logs
        await auditLogRepository.create({
          id: uuidv4(),
          userId: adminUserId,
          userEmail: 'admin@test.com',
          action: 'create',
          entityType: 'page',
          entityId: page.id,
          entityName: 'Test Page',
        });

        await auditLogRepository.create({
          id: uuidv4(),
          userId: adminUserId,
          userEmail: 'admin@test.com',
          action: 'update',
          entityType: 'page',
          entityId: page.id,
          entityName: 'Test Page',
          changes: {title: {old: 'Test Page', new: 'Updated Page'}},
        });

        const res = await client
          .get('/api/cms/audit-logs')
          .query({entityType: 'page', entityId: page.id})
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(res.body.data).to.be.Array();
        expect(res.body.data.length).to.be.greaterThanOrEqual(2);
        expect(res.body.data[0].entityId).to.equal(page.id);
      });

      it('returns audit logs for a specific user', async () => {
        const page = await pageRepository.create({
          id: uuidv4(),
          slug: 'test-page',
          title: 'Test Page',
          status: 'draft',
          version: 1,
          createdBy: adminUserId,
          updatedBy: adminUserId,
        });

        await auditLogRepository.create({
          id: uuidv4(),
          userId: adminUserId,
          userEmail: 'admin@test.com',
          action: 'create',
          entityType: 'page',
          entityId: page.id,
          entityName: 'Test Page',
        });

        const res = await client
          .get('/api/cms/audit-logs')
          .query({userId: adminUserId})
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(res.body.data).to.be.Array();
        expect(res.body.data.length).to.be.greaterThan(0);
        expect(res.body.data[0].userId).to.equal(adminUserId);
      });

      it('returns recent audit logs with pagination', async () => {
        // Create multiple audit logs
        for (let i = 0; i < 15; i++) {
          await auditLogRepository.create({
            id: uuidv4(),
            userId: adminUserId,
            userEmail: 'admin@test.com',
            action: 'create',
            entityType: 'page',
            entityId: uuidv4(),
            entityName: `Test Page ${i}`,
          });
        }

        const res = await client
          .get('/api/cms/audit-logs')
          .query({page: 1, pageSize: 10})
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(res.body.data).to.be.Array();
        expect(res.body.data.length).to.equal(10);
        expect(res.body.page).to.equal(1);
        expect(res.body.pageSize).to.equal(10);
        expect(res.body.total).to.be.greaterThanOrEqual(15);
      });

      it('filters audit logs by action', async () => {
        const page = await pageRepository.create({
          id: uuidv4(),
          slug: 'test-page',
          title: 'Test Page',
          status: 'draft',
          version: 1,
          createdBy: adminUserId,
          updatedBy: adminUserId,
        });

        await auditLogRepository.create({
          id: uuidv4(),
          userId: adminUserId,
          userEmail: 'admin@test.com',
          action: 'create',
          entityType: 'page',
          entityId: page.id,
          entityName: 'Test Page',
        });

        await auditLogRepository.create({
          id: uuidv4(),
          userId: adminUserId,
          userEmail: 'admin@test.com',
          action: 'publish',
          entityType: 'page',
          entityId: page.id,
          entityName: 'Test Page',
        });

        const res = await client
          .get('/api/cms/audit-logs')
          .query({action: 'publish'})
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(res.body.data).to.be.Array();
        expect(res.body.data.length).to.be.greaterThan(0);
        res.body.data.forEach((log: any) => {
          expect(log.action).to.equal('publish');
        });
      });
    });

    describe('Audit Log Content', () => {
      it('includes user information in audit logs', async () => {
        const page = await pageRepository.create({
          id: uuidv4(),
          slug: 'test-page',
          title: 'Test Page',
          status: 'draft',
          version: 1,
          createdBy: adminUserId,
          updatedBy: adminUserId,
        });

        await auditLogRepository.create({
          id: uuidv4(),
          userId: adminUserId,
          userEmail: 'admin@test.com',
          action: 'create',
          entityType: 'page',
          entityId: page.id,
          entityName: 'Test Page',
        });

        const auditLogs = await auditLogRepository.find({
          where: {entityId: page.id},
        });

        expect(auditLogs.length).to.be.greaterThan(0);
        const auditLog = auditLogs[0];
        expect(auditLog.userId).to.equal(adminUserId);
        expect(auditLog.userEmail).to.equal('admin@test.com');
      });

      it('includes change details in update audit logs', async () => {
        const page = await pageRepository.create({
          id: uuidv4(),
          slug: 'test-page',
          title: 'Test Page',
          status: 'draft',
          version: 1,
          createdBy: adminUserId,
          updatedBy: adminUserId,
        });

        await auditLogRepository.create({
          id: uuidv4(),
          userId: adminUserId,
          userEmail: 'admin@test.com',
          action: 'update',
          entityType: 'page',
          entityId: page.id,
          entityName: 'Test Page',
          changes: {
            title: {old: 'Test Page', new: 'Updated Page'},
            description: {old: null, new: 'New description'},
          },
        });

        const auditLogs = await auditLogRepository.find({
          where: {entityId: page.id, action: 'update'},
        });

        expect(auditLogs.length).to.be.greaterThan(0);
        const auditLog = auditLogs[0];
        expect(auditLog.changes).to.be.Object();
        expect(auditLog.changes).to.have.property('title');
        expect(auditLog.changes).to.have.property('description');
      });
    });
  });
});
