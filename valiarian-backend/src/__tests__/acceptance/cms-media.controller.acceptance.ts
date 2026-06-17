import {securityId, UserProfile} from '@loopback/security';
import {Client, expect} from '@loopback/testlab';
import {v4 as uuidv4} from 'uuid';
import {ValiarianBackendApplication} from '../..';
import {
  MediaRepository,
  RolesRepository,
  UserRolesRepository,
  UsersRepository,
} from '../../repositories';
import {BcryptHasher} from '../../services/hash.password.bcrypt';
import {JWTService} from '../../services/jwt-service';
import {setupApplication} from './test-helper';

describe('CMSMediaController (acceptance)', () => {
  let app: ValiarianBackendApplication;
  let client: Client;
  let mediaRepository: MediaRepository;
  let usersRepository: UsersRepository;
  let rolesRepository: RolesRepository;
  let userRolesRepository: UserRolesRepository;
  let jwtService: JWTService;
  let hasher: BcryptHasher;
  let adminToken: string;
  let adminUserId: string;

  before('setupApplication', async () => {
    ({app, client} = await setupApplication());
    mediaRepository = await app.getRepository(MediaRepository);
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
    await mediaRepository.deleteAll();

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
  });

  describe('GET /api/cms/media', () => {
    it('returns paginated list of media', async () => {
      // Create test media
      await mediaRepository.create({
        id: uuidv4(),
        filename: 'test-image-1.jpg',
        originalName: 'test-image-1.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        url: '/uploads/test-image-1.jpg',
        folder: '/',
        uploadedBy: adminUserId,
      });

      await mediaRepository.create({
        id: uuidv4(),
        filename: 'test-image-2.png',
        originalName: 'test-image-2.png',
        mimeType: 'image/png',
        size: 2048000,
        url: '/uploads/test-image-2.png',
        folder: '/',
        uploadedBy: adminUserId,
      });

      const res = await client
        .get('/api/cms/media')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).to.have.properties(['data', 'total', 'page', 'pageSize']);
      expect(res.body.data).to.be.Array();
      expect(res.body.total).to.equal(2);
      expect(res.body.data.length).to.equal(2);
    });

    it('filters media by folder', async () => {
      await mediaRepository.create({
        id: uuidv4(),
        filename: 'image1.jpg',
        originalName: 'image1.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        url: '/uploads/images/image1.jpg',
        folder: '/images',
        uploadedBy: adminUserId,
      });

      await mediaRepository.create({
        id: uuidv4(),
        filename: 'video1.mp4',
        originalName: 'video1.mp4',
        mimeType: 'video/mp4',
        size: 5120000,
        url: '/uploads/videos/video1.mp4',
        folder: '/videos',
        uploadedBy: adminUserId,
      });

      const res = await client
        .get('/api/cms/media')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({folder: '/images'})
        .expect(200);

      expect(res.body.data.length).to.equal(1);
      expect(res.body.data[0].folder).to.equal('/images');
    });

    it('filters media by mimeType', async () => {
      await mediaRepository.create({
        id: uuidv4(),
        filename: 'image.jpg',
        originalName: 'image.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        url: '/uploads/image.jpg',
        folder: '/',
        uploadedBy: adminUserId,
      });

      await mediaRepository.create({
        id: uuidv4(),
        filename: 'video.mp4',
        originalName: 'video.mp4',
        mimeType: 'video/mp4',
        size: 5120000,
        url: '/uploads/video.mp4',
        folder: '/',
        uploadedBy: adminUserId,
      });

      const res = await client
        .get('/api/cms/media')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({mimeType: 'image'})
        .expect(200);

      expect(res.body.data.length).to.equal(1);
      expect(res.body.data[0].mimeType).to.match(/^image\//);
    });

    it('searches media by filename', async () => {
      await mediaRepository.create({
        id: uuidv4(),
        filename: 'hero-banner.jpg',
        originalName: 'hero-banner.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        url: '/uploads/hero-banner.jpg',
        folder: '/',
        uploadedBy: adminUserId,
      });

      await mediaRepository.create({
        id: uuidv4(),
        filename: 'product-image.jpg',
        originalName: 'product-image.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        url: '/uploads/product-image.jpg',
        folder: '/',
        uploadedBy: adminUserId,
      });

      const res = await client
        .get('/api/cms/media')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({search: 'hero'})
        .expect(200);

      expect(res.body.data.length).to.equal(1);
      expect(res.body.data[0].filename).to.match(/hero/);
    });

    it('supports pagination', async () => {
      // Create 25 media files
      for (let i = 1; i <= 25; i++) {
        await mediaRepository.create({
          id: uuidv4(),
          filename: `image-${i}.jpg`,
          originalName: `image-${i}.jpg`,
          mimeType: 'image/jpeg',
          size: 1024000,
          url: `/uploads/image-${i}.jpg`,
          folder: '/',
          uploadedBy: adminUserId,
        });
      }

      const res = await client
        .get('/api/cms/media')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({page: 2, pageSize: 10})
        .expect(200);

      expect(res.body.data.length).to.equal(10);
      expect(res.body.page).to.equal(2);
      expect(res.body.pageSize).to.equal(10);
      expect(res.body.total).to.equal(25);
    });

    it('returns 401 without authentication', async () => {
      await client.get('/api/cms/media').expect(401);
    });
  });

  describe('GET /api/cms/media/{id}', () => {
    it('returns media by ID', async () => {
      const media = await mediaRepository.create({
        id: uuidv4(),
        filename: 'test-image.jpg',
        originalName: 'test-image.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        width: 1920,
        height: 1080,
        url: '/uploads/test-image.jpg',
        thumbnailUrl: '/uploads/thumbnails/test-image.jpg',
        altText: 'Test image',
        folder: '/',
        uploadedBy: adminUserId,
      });

      const res = await client
        .get(`/api/cms/media/${media.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.id).to.equal(media.id);
      expect(res.body.filename).to.equal('test-image.jpg');
      expect(res.body.altText).to.equal('Test image');
    });

    it('returns 404 for non-existent media', async () => {
      const fakeId = uuidv4();
      await client
        .get(`/api/cms/media/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('returns 401 without authentication', async () => {
      const media = await mediaRepository.create({
        id: uuidv4(),
        filename: 'test-image.jpg',
        originalName: 'test-image.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        url: '/uploads/test-image.jpg',
        folder: '/',
        uploadedBy: adminUserId,
      });

      await client.get(`/api/cms/media/${media.id}`).expect(401);
    });
  });

  describe('POST /api/cms/media/upload', () => {
    it('uploads an image file successfully', async () => {
      // Create a test image buffer (1x1 PNG)
      const imageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64',
      );

      const res = await client
        .post('/api/cms/media/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', imageBuffer, 'test-image.png')
        .expect(201);

      expect(res.body.success).to.be.true();
      expect(res.body.media).to.not.be.null();
      expect(res.body.media.filename).to.not.be.empty();
      expect(res.body.media.mimeType).to.equal('image/png');
    });

    it('uploads a JPEG image successfully', async () => {
      // Create a minimal JPEG buffer
      const jpegBuffer = Buffer.from(
        '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=',
        'base64',
      );

      const res = await client
        .post('/api/cms/media/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', jpegBuffer, 'test-image.jpg')
        .expect(201);

      expect(res.body.success).to.be.true();
      expect(res.body.media.mimeType).to.equal('image/jpeg');
    });

    it('returns 400 when no file is provided', async () => {
      const res = await client
        .post('/api/cms/media/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.error.message).to.match(/No file provided/);
    });

    it('returns 401 without authentication', async () => {
      const imageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64',
      );

      await client
        .post('/api/cms/media/upload')
        .attach('file', imageBuffer, 'test-image.png')
        .expect(401);
    });
  });

  describe('PUT /api/cms/media/{id}', () => {
    it('updates media metadata', async () => {
      const media = await mediaRepository.create({
        id: uuidv4(),
        filename: 'test-image.jpg',
        originalName: 'test-image.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        url: '/uploads/test-image.jpg',
        altText: 'Original alt text',
        folder: '/',
        uploadedBy: adminUserId,
      });

      const updateData = {
        altText: 'Updated alt text',
        caption: 'New caption',
        tags: ['hero', 'banner'],
        folder: '/images',
      };

      const res = await client
        .put(`/api/cms/media/${media.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(res.body.altText).to.equal('Updated alt text');
      expect(res.body.caption).to.equal('New caption');
      expect(res.body.tags).to.eql(['hero', 'banner']);
      expect(res.body.folder).to.equal('/images');
    });

    it('returns 404 for non-existent media', async () => {
      const fakeId = uuidv4();
      const updateData = {
        altText: 'Updated alt text',
      };

      await client
        .put(`/api/cms/media/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(404);
    });

    it('returns 401 without authentication', async () => {
      const media = await mediaRepository.create({
        id: uuidv4(),
        filename: 'test-image.jpg',
        originalName: 'test-image.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        url: '/uploads/test-image.jpg',
        folder: '/',
        uploadedBy: adminUserId,
      });

      const updateData = {
        altText: 'Updated alt text',
      };

      await client
        .put(`/api/cms/media/${media.id}`)
        .send(updateData)
        .expect(401);
    });
  });

  describe('DELETE /api/cms/media/{id}', () => {
    it('deletes media successfully', async () => {
      const media = await mediaRepository.create({
        id: uuidv4(),
        filename: 'test-image.jpg',
        originalName: 'test-image.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        url: '/uploads/test-image.jpg',
        folder: '/',
        uploadedBy: adminUserId,
      });

      await client
        .del(`/api/cms/media/${media.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Verify media was deleted
      const deletedMedia = await mediaRepository.findOne({
        where: {id: media.id},
      });
      expect(deletedMedia).to.be.null();
    });

    it('returns 404 for non-existent media', async () => {
      const fakeId = uuidv4();
      await client
        .del(`/api/cms/media/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('returns 401 without authentication', async () => {
      const media = await mediaRepository.create({
        id: uuidv4(),
        filename: 'test-image.jpg',
        originalName: 'test-image.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        url: '/uploads/test-image.jpg',
        folder: '/',
        uploadedBy: adminUserId,
      });

      await client.del(`/api/cms/media/${media.id}`).expect(401);
    });
  });

  describe('POST /api/cms/media/bulk-delete', () => {
    it('deletes multiple media files', async () => {
      const media1 = await mediaRepository.create({
        id: uuidv4(),
        filename: 'image1.jpg',
        originalName: 'image1.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        url: '/uploads/image1.jpg',
        folder: '/',
        uploadedBy: adminUserId,
      });

      const media2 = await mediaRepository.create({
        id: uuidv4(),
        filename: 'image2.jpg',
        originalName: 'image2.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        url: '/uploads/image2.jpg',
        folder: '/',
        uploadedBy: adminUserId,
      });

      const res = await client
        .post('/api/cms/media/bulk-delete')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({mediaIds: [media1.id, media2.id]})
        .expect(200);

      expect(res.body.success).to.be.true();
      expect(res.body.deleted).to.equal(2);

      // Verify media were deleted
      const remainingMedia = await mediaRepository.find();
      expect(remainingMedia.length).to.equal(0);
    });

    it('returns 400 when no media IDs provided', async () => {
      const res = await client
        .post('/api/cms/media/bulk-delete')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({mediaIds: []})
        .expect(400);

      expect(res.body.error.message).to.match(/No media IDs provided/);
    });

    it('returns 401 without authentication', async () => {
      await client
        .post('/api/cms/media/bulk-delete')
        .send({mediaIds: [uuidv4()]})
        .expect(401);
    });
  });

  describe('GET /api/cms/media/folders/list', () => {
    it('returns list of unique folders', async () => {
      await mediaRepository.create({
        id: uuidv4(),
        filename: 'image1.jpg',
        originalName: 'image1.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        url: '/uploads/images/image1.jpg',
        folder: '/images',
        uploadedBy: adminUserId,
      });

      await mediaRepository.create({
        id: uuidv4(),
        filename: 'image2.jpg',
        originalName: 'image2.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        url: '/uploads/images/image2.jpg',
        folder: '/images',
        uploadedBy: adminUserId,
      });

      await mediaRepository.create({
        id: uuidv4(),
        filename: 'video1.mp4',
        originalName: 'video1.mp4',
        mimeType: 'video/mp4',
        size: 5120000,
        url: '/uploads/videos/video1.mp4',
        folder: '/videos',
        uploadedBy: adminUserId,
      });

      const res = await client
        .get('/api/cms/media/folders/list')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).to.be.Array();
      expect(res.body.length).to.equal(2);
      expect(res.body).to.containEql('/images');
      expect(res.body).to.containEql('/videos');
    });

    it('returns 401 without authentication', async () => {
      await client.get('/api/cms/media/folders/list').expect(401);
    });
  });

  describe('GET /api/cms/media/stats', () => {
    it('returns media library statistics', async () => {
      await mediaRepository.create({
        id: uuidv4(),
        filename: 'image1.jpg',
        originalName: 'image1.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        url: '/uploads/images/image1.jpg',
        folder: '/images',
        uploadedBy: adminUserId,
      });

      await mediaRepository.create({
        id: uuidv4(),
        filename: 'image2.png',
        originalName: 'image2.png',
        mimeType: 'image/png',
        size: 2048000,
        url: '/uploads/images/image2.png',
        folder: '/images',
        uploadedBy: adminUserId,
      });

      await mediaRepository.create({
        id: uuidv4(),
        filename: 'video1.mp4',
        originalName: 'video1.mp4',
        mimeType: 'video/mp4',
        size: 5120000,
        url: '/uploads/videos/video1.mp4',
        folder: '/videos',
        uploadedBy: adminUserId,
      });

      const res = await client
        .get('/api/cms/media/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.totalFiles).to.equal(3);
      expect(res.body.totalSize).to.equal(8192000);
      expect(res.body.totalSizeFormatted).to.not.be.empty();
      expect(res.body.byType.images).to.equal(2);
      expect(res.body.byType.videos).to.equal(1);
      expect(res.body.byFolder['/images']).to.equal(2);
      expect(res.body.byFolder['/videos']).to.equal(1);
    });

    it('returns 401 without authentication', async () => {
      await client.get('/api/cms/media/stats').expect(401);
    });
  });
});
