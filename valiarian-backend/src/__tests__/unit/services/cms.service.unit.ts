import {expect} from '@loopback/testlab';
import {v4 as uuidv4} from 'uuid';
import {ValiarianBackendApplication} from '../../..';
import {Page, Section} from '../../../models';
import {
  ContentVersionRepository,
  PageRepository,
  SectionRepository,
} from '../../../repositories';
import {CMSService} from '../../../services/cms.service';
import {setupApplication} from '../../acceptance/test-helper';

describe('CMSService (unit)', () => {
  let app: ValiarianBackendApplication;
  let cmsService: CMSService;
  let pageRepository: PageRepository;
  let sectionRepository: SectionRepository;
  let contentVersionRepository: ContentVersionRepository;

  before('setupApplication', async () => {
    ({app} = await setupApplication());
    pageRepository = await app.getRepository(PageRepository);
    sectionRepository = await app.getRepository(SectionRepository);
    contentVersionRepository = await app.getRepository(
      ContentVersionRepository,
    );
    cmsService = new CMSService(
      pageRepository,
      sectionRepository,
      contentVersionRepository,
    );
  });

  after(async () => {
    await app.stop();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await pageRepository.deleteAll();
    await sectionRepository.deleteAll();
    await contentVersionRepository.deleteAll();
  });

  describe('publishPage', () => {
    it('publishes a draft page successfully', async () => {
      const page = await createTestPage({
        slug: 'draft-page',
        title: 'Draft Page',
        status: 'draft',
      });

      const published = await cmsService.publishPage(page.id, 'user-123');

      expect(published.status).to.equal('published');
      expect(published.publishedAt).to.not.be.undefined();
      expect(published.updatedBy).to.equal('user-123');
    });

    it('publishes a scheduled page successfully', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const page = await createTestPage({
        slug: 'scheduled-page',
        title: 'Scheduled Page',
        status: 'scheduled',
        scheduledAt: futureDate,
      });

      const published = await cmsService.publishPage(page.id);

      expect(published.status).to.equal('published');
      expect(published.publishedAt).to.not.be.undefined();
    });

    it('creates a version snapshot before publishing', async () => {
      const page = await createTestPage({
        slug: 'page-with-version',
        title: 'Page with Version',
        status: 'draft',
      });

      await cmsService.publishPage(page.id, 'user-123', 'Publishing page');

      const versions = await contentVersionRepository.find({
        where: {pageId: page.id},
      });

      expect(versions).to.have.length(1);
      expect(versions[0].createdBy).to.equal('user-123');
      expect(versions[0].comment).to.equal('Publishing page');
    });

    it('throws error when page is already published', async () => {
      const page = await createTestPage({
        slug: 'published-page',
        title: 'Published Page',
        status: 'published',
        publishedAt: new Date(),
      });

      await expect(
        cmsService.publishPage(page.id),
      ).to.be.rejectedWith('Page is already published');
    });

    it('throws error when trying to publish archived page', async () => {
      const page = await createTestPage({
        slug: 'archived-page',
        title: 'Archived Page',
        status: 'archived',
      });

      await expect(
        cmsService.publishPage(page.id),
      ).to.be.rejectedWith('Cannot publish an archived page. Please restore it first.');
    });
  });

  describe('unpublishPage', () => {
    it('unpublishes a published page successfully', async () => {
      const page = await createTestPage({
        slug: 'published-page',
        title: 'Published Page',
        status: 'published',
        publishedAt: new Date(),
      });

      const unpublished = await cmsService.unpublishPage(page.id, 'user-123');

      expect(unpublished.status).to.equal('draft');
      expect(unpublished.updatedBy).to.equal('user-123');
    });

    it('creates a version snapshot before unpublishing', async () => {
      const page = await createTestPage({
        slug: 'page-to-unpublish',
        title: 'Page to Unpublish',
        status: 'published',
        publishedAt: new Date(),
      });

      await cmsService.unpublishPage(page.id, 'user-123', 'Unpublishing');

      const versions = await contentVersionRepository.find({
        where: {pageId: page.id},
      });

      expect(versions).to.have.length(1);
      expect(versions[0].comment).to.equal('Unpublishing');
    });

    it('throws error when page is not published', async () => {
      const page = await createTestPage({
        slug: 'draft-page',
        title: 'Draft Page',
        status: 'draft',
      });

      await expect(
        cmsService.unpublishPage(page.id),
      ).to.be.rejectedWith('Only published pages can be unpublished');
    });
  });

  describe('schedulePage', () => {
    it('schedules a draft page successfully', async () => {
      const page = await createTestPage({
        slug: 'draft-page',
        title: 'Draft Page',
        status: 'draft',
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const scheduled = await cmsService.schedulePage(
        page.id,
        futureDate,
        'user-123',
      );

      expect(scheduled.status).to.equal('scheduled');
      expect(scheduled.scheduledAt).to.eql(futureDate);
      expect(scheduled.updatedBy).to.equal('user-123');
    });

    it('schedules a published page successfully', async () => {
      const page = await createTestPage({
        slug: 'published-page',
        title: 'Published Page',
        status: 'published',
        publishedAt: new Date(),
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);

      const scheduled = await cmsService.schedulePage(page.id, futureDate);

      expect(scheduled.status).to.equal('scheduled');
      expect(scheduled.scheduledAt).to.eql(futureDate);
    });

    it('creates a version snapshot before scheduling', async () => {
      const page = await createTestPage({
        slug: 'page-to-schedule',
        title: 'Page to Schedule',
        status: 'draft',
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      await cmsService.schedulePage(page.id, futureDate, 'user-123');

      const versions = await contentVersionRepository.find({
        where: {pageId: page.id},
      });

      expect(versions).to.have.length(1);
      expect(versions[0].comment).to.match(/Scheduled for/);
    });

    it('throws error when scheduled date is in the past', async () => {
      const page = await createTestPage({
        slug: 'page',
        title: 'Page',
        status: 'draft',
      });

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      await expect(
        cmsService.schedulePage(page.id, pastDate),
      ).to.be.rejectedWith('Scheduled date must be in the future');
    });

    it('throws error when trying to schedule archived page', async () => {
      const page = await createTestPage({
        slug: 'archived-page',
        title: 'Archived Page',
        status: 'archived',
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      await expect(
        cmsService.schedulePage(page.id, futureDate),
      ).to.be.rejectedWith('Cannot schedule an archived page. Please restore it first.');
    });
  });

  describe('archivePage', () => {
    it('archives a draft page successfully', async () => {
      const page = await createTestPage({
        slug: 'draft-page',
        title: 'Draft Page',
        status: 'draft',
      });

      const archived = await cmsService.archivePage(page.id, 'user-123');

      expect(archived.status).to.equal('archived');
      expect(archived.updatedBy).to.equal('user-123');
    });

    it('archives a published page successfully', async () => {
      const page = await createTestPage({
        slug: 'published-page',
        title: 'Published Page',
        status: 'published',
        publishedAt: new Date(),
      });

      const archived = await cmsService.archivePage(page.id);

      expect(archived.status).to.equal('archived');
    });

    it('creates a version snapshot before archiving', async () => {
      const page = await createTestPage({
        slug: 'page-to-archive',
        title: 'Page to Archive',
        status: 'draft',
      });

      await cmsService.archivePage(page.id, 'user-123', 'Archiving old page');

      const versions = await contentVersionRepository.find({
        where: {pageId: page.id},
      });

      expect(versions).to.have.length(1);
      expect(versions[0].comment).to.equal('Archiving old page');
    });
  });

  describe('restorePage', () => {
    it('restores an archived page to draft successfully', async () => {
      const page = await createTestPage({
        slug: 'archived-page',
        title: 'Archived Page',
        status: 'archived',
      });

      const restored = await cmsService.restorePage(page.id, 'user-123');

      expect(restored.status).to.equal('draft');
      expect(restored.updatedBy).to.equal('user-123');
    });

    it('creates a version snapshot before restoring', async () => {
      const page = await createTestPage({
        slug: 'page-to-restore',
        title: 'Page to Restore',
        status: 'archived',
      });

      await cmsService.restorePage(page.id, 'user-123', 'Restoring page');

      const versions = await contentVersionRepository.find({
        where: {pageId: page.id},
      });

      expect(versions).to.have.length(1);
      expect(versions[0].comment).to.equal('Restoring page');
    });

    it('throws error when page is not archived', async () => {
      const page = await createTestPage({
        slug: 'draft-page',
        title: 'Draft Page',
        status: 'draft',
      });

      await expect(
        cmsService.restorePage(page.id),
      ).to.be.rejectedWith('Only archived pages can be restored');
    });
  });

  describe('updatePageWithVersion', () => {
    it('updates page and increments version', async () => {
      const page = await createTestPage({
        slug: 'page',
        title: 'Original Title',
        status: 'draft',
        version: 1,
      });

      const updated = await cmsService.updatePageWithVersion(
        page.id,
        {title: 'Updated Title'},
        'user-123',
      );

      expect(updated.title).to.equal('Updated Title');
      expect(updated.version).to.equal(2);
      expect(updated.updatedBy).to.equal('user-123');
    });

    it('creates a version snapshot before updating', async () => {
      const page = await createTestPage({
        slug: 'page',
        title: 'Original Title',
        status: 'draft',
        version: 1,
      });

      await cmsService.updatePageWithVersion(
        page.id,
        {title: 'Updated Title'},
        'user-123',
        'Major update',
      );

      const versions = await contentVersionRepository.find({
        where: {pageId: page.id},
      });

      expect(versions).to.have.length(1);
      expect(versions[0].version).to.equal(1);
      expect(versions[0].comment).to.equal('Major update');
    });

    it('uses default comment when not provided', async () => {
      const page = await createTestPage({
        slug: 'page',
        title: 'Title',
        status: 'draft',
        version: 3,
      });

      await cmsService.updatePageWithVersion(
        page.id,
        {description: 'New description'},
        'user-123',
      );

      const versions = await contentVersionRepository.find({
        where: {pageId: page.id},
      });

      expect(versions[0].comment).to.equal('Updated page to version 4');
    });
  });

  describe('createVersion', () => {
    it('creates a version snapshot with page data', async () => {
      const page = await createTestPage({
        slug: 'test-page',
        title: 'Test Page',
        status: 'draft',
        version: 1,
        seoTitle: 'SEO Title',
        seoDescription: 'SEO Description',
      });

      const version = await cmsService.createVersion(
        page.id,
        'user-123',
        'Test snapshot',
      );

      expect(version.pageId).to.equal(page.id);
      expect(version.version).to.equal(1);
      expect(version.createdBy).to.equal('user-123');
      expect(version.comment).to.equal('Test snapshot');
      expect(version.content).to.have.property('page');
      expect((version.content as any).page.title).to.equal('Test Page');
    });

    it('includes sections in version snapshot', async () => {
      const page = await createTestPage({
        slug: 'page-with-sections',
        title: 'Page with Sections',
        status: 'draft',
      });

      await createTestSection({
        pageId: page.id,
        name: 'Hero Section',
        type: 'hero',
        order: 0,
      });

      await createTestSection({
        pageId: page.id,
        name: 'Features Section',
        type: 'features',
        order: 1,
      });

      const version = await cmsService.createVersion(page.id, 'user-123');

      expect(version.content).to.have.property('sections');
      expect((version.content as any).sections).to.be.Array();
      expect((version.content as any).sections).to.have.length(2);
    });
  });

  describe('processScheduledPages', () => {
    it('publishes scheduled pages whose time has passed', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const page1 = await createTestPage({
        slug: 'scheduled-1',
        title: 'Scheduled 1',
        status: 'scheduled',
        scheduledAt: pastDate,
      });

      const page2 = await createTestPage({
        slug: 'scheduled-2',
        title: 'Scheduled 2',
        status: 'scheduled',
        scheduledAt: pastDate,
      });

      const published = await cmsService.processScheduledPages();

      expect(published).to.have.length(2);
      expect(published.map(p => p.id)).to.containDeep([page1.id, page2.id]);
      expect(published.every(p => p.status === 'published')).to.be.true();
    });

    it('does not publish scheduled pages whose time has not passed', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      await createTestPage({
        slug: 'scheduled-future',
        title: 'Scheduled Future',
        status: 'scheduled',
        scheduledAt: futureDate,
      });

      const published = await cmsService.processScheduledPages();

      expect(published).to.have.length(0);
    });

    it('continues processing even if one page fails', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      // Create a page that will fail (already published)
      await createTestPage({
        slug: 'already-published',
        title: 'Already Published',
        status: 'published',
        scheduledAt: pastDate,
      });

      // Create a valid scheduled page
      const validPage = await createTestPage({
        slug: 'valid-scheduled',
        title: 'Valid Scheduled',
        status: 'scheduled',
        scheduledAt: pastDate,
      });

      const published = await cmsService.processScheduledPages();

      // Should publish the valid page despite the first one failing
      expect(published).to.have.length(1);
      expect(published[0].id).to.equal(validPage.id);
    });
  });

  describe('validateStatusTransition', () => {
    it('allows draft to published transition', () => {
      const isValid = cmsService.validateStatusTransition('draft', 'published');
      expect(isValid).to.be.true();
    });

    it('allows draft to scheduled transition', () => {
      const isValid = cmsService.validateStatusTransition('draft', 'scheduled');
      expect(isValid).to.be.true();
    });

    it('allows draft to archived transition', () => {
      const isValid = cmsService.validateStatusTransition('draft', 'archived');
      expect(isValid).to.be.true();
    });

    it('allows published to draft transition', () => {
      const isValid = cmsService.validateStatusTransition('published', 'draft');
      expect(isValid).to.be.true();
    });

    it('allows published to archived transition', () => {
      const isValid = cmsService.validateStatusTransition(
        'published',
        'archived',
      );
      expect(isValid).to.be.true();
    });

    it('allows scheduled to draft transition', () => {
      const isValid = cmsService.validateStatusTransition('scheduled', 'draft');
      expect(isValid).to.be.true();
    });

    it('allows scheduled to published transition', () => {
      const isValid = cmsService.validateStatusTransition(
        'scheduled',
        'published',
      );
      expect(isValid).to.be.true();
    });

    it('allows scheduled to archived transition', () => {
      const isValid = cmsService.validateStatusTransition(
        'scheduled',
        'archived',
      );
      expect(isValid).to.be.true();
    });

    it('allows archived to draft transition', () => {
      const isValid = cmsService.validateStatusTransition('archived', 'draft');
      expect(isValid).to.be.true();
    });

    it('disallows draft to draft transition', () => {
      const isValid = cmsService.validateStatusTransition('draft', 'draft');
      expect(isValid).to.be.false();
    });

    it('disallows published to scheduled transition', () => {
      const isValid = cmsService.validateStatusTransition(
        'published',
        'scheduled',
      );
      expect(isValid).to.be.false();
    });

    it('disallows archived to published transition', () => {
      const isValid = cmsService.validateStatusTransition(
        'archived',
        'published',
      );
      expect(isValid).to.be.false();
    });

    it('disallows archived to scheduled transition', () => {
      const isValid = cmsService.validateStatusTransition(
        'archived',
        'scheduled',
      );
      expect(isValid).to.be.false();
    });
  });

  // Helper functions
  async function createTestPage(data: Partial<Page>): Promise<Page> {
    const page = new Page({
      id: uuidv4(),
      slug: data.slug || 'test-slug',
      title: data.title || 'Test Title',
      status: data.status || 'draft',
      version: data.version || 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    });
    return pageRepository.create(page);
  }

  async function createTestSection(data: {
    pageId: string;
    name: string;
    type: string;
    order: number;
  }): Promise<Section> {
    return sectionRepository.create({
      id: uuidv4(),
      pageId: data.pageId,
      name: data.name,
      type: data.type as any,
      order: data.order,
      enabled: true,
      content: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
});
