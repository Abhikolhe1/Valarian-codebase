import {expect} from '@loopback/testlab';
import {v4 as uuidv4} from 'uuid';
import {ValiarianBackendApplication} from '../../..';
import {Page} from '../../../models';
import {
  ContentVersionRepository,
  PageRepository,
  SectionRepository,
} from '../../../repositories';
import {setupApplication} from '../../acceptance/test-helper';

describe('PageRepository (unit)', () => {
  let app: ValiarianBackendApplication;
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

  describe('findBySlug', () => {
    it('finds a page by slug', async () => {
      const page = await createTestPage({
        slug: 'test-page',
        title: 'Test Page',
      });

      const found = await pageRepository.findBySlug('test-page');

      expect(found).to.not.be.null();
      expect(found?.id).to.equal(page.id);
      expect(found?.slug).to.equal('test-page');
    });

    it('returns null when page not found', async () => {
      const found = await pageRepository.findBySlug('non-existent');

      expect(found).to.be.null();
    });

    it('includes sections when requested', async () => {
      const page = await createTestPage({
        slug: 'page-with-sections',
        title: 'Page with Sections',
      });

      await createTestSection({
        pageId: page.id,
        name: 'Hero Section',
        type: 'hero',
      });

      const found = await pageRepository.findBySlug(
        'page-with-sections',
        true,
        false,
      );

      expect(found).to.not.be.null();
      expect(found?.sections).to.be.Array();
      expect(found?.sections).to.have.length(1);
      expect(found?.sections[0].name).to.equal('Hero Section');
    });

    it('includes versions when requested', async () => {
      const page = await createTestPage({
        slug: 'page-with-versions',
        title: 'Page with Versions',
      });

      await createTestVersion({
        pageId: page.id,
        version: 1,
      });

      const found = await pageRepository.findBySlug(
        'page-with-versions',
        false,
        true,
      );

      expect(found).to.not.be.null();
      expect(found?.versions).to.be.Array();
      expect(found?.versions).to.have.length(1);
    });

    it('includes both sections and versions when requested', async () => {
      const page = await createTestPage({
        slug: 'page-with-all',
        title: 'Page with All',
      });

      await createTestSection({
        pageId: page.id,
        name: 'Test Section',
        type: 'text',
      });

      await createTestVersion({
        pageId: page.id,
        version: 1,
      });

      const found = await pageRepository.findBySlug('page-with-all', true, true);

      expect(found).to.not.be.null();
      expect(found?.sections).to.have.length(1);
      expect(found?.versions).to.have.length(1);
    });
  });

  describe('findPublished', () => {
    it('finds pages with published status', async () => {
      await createTestPage({
        slug: 'published-page',
        title: 'Published Page',
        status: 'published',
        publishedAt: new Date(),
      });

      await createTestPage({
        slug: 'draft-page',
        title: 'Draft Page',
        status: 'draft',
      });

      const published = await pageRepository.findPublished();

      expect(published).to.have.length(1);
      expect(published[0].slug).to.equal('published-page');
    });

    it('finds scheduled pages whose time has passed', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      await createTestPage({
        slug: 'scheduled-past',
        title: 'Scheduled Past',
        status: 'scheduled',
        scheduledAt: pastDate,
      });

      const published = await pageRepository.findPublished();

      expect(published).to.have.length(1);
      expect(published[0].slug).to.equal('scheduled-past');
    });

    it('excludes scheduled pages whose time has not passed', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      await createTestPage({
        slug: 'scheduled-future',
        title: 'Scheduled Future',
        status: 'scheduled',
        scheduledAt: futureDate,
      });

      const published = await pageRepository.findPublished();

      expect(published).to.have.length(0);
    });

    it('excludes draft and archived pages', async () => {
      await createTestPage({
        slug: 'draft',
        title: 'Draft',
        status: 'draft',
      });

      await createTestPage({
        slug: 'archived',
        title: 'Archived',
        status: 'archived',
      });

      const published = await pageRepository.findPublished();

      expect(published).to.have.length(0);
    });

    it('includes sections when requested', async () => {
      const page = await createTestPage({
        slug: 'published-with-sections',
        title: 'Published with Sections',
        status: 'published',
        publishedAt: new Date(),
      });

      await createTestSection({
        pageId: page.id,
        name: 'Section 1',
        type: 'hero',
      });

      const published = await pageRepository.findPublished(true);

      expect(published).to.have.length(1);
      expect(published[0].sections).to.have.length(1);
    });

    it('orders by publishedAt descending', async () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-02');
      const date3 = new Date('2024-01-03');

      await createTestPage({
        slug: 'page-1',
        title: 'Page 1',
        status: 'published',
        publishedAt: date1,
      });

      await createTestPage({
        slug: 'page-3',
        title: 'Page 3',
        status: 'published',
        publishedAt: date3,
      });

      await createTestPage({
        slug: 'page-2',
        title: 'Page 2',
        status: 'published',
        publishedAt: date2,
      });

      const published = await pageRepository.findPublished();

      expect(published).to.have.length(3);
      expect(published[0].slug).to.equal('page-3');
      expect(published[1].slug).to.equal('page-2');
      expect(published[2].slug).to.equal('page-1');
    });
  });

  describe('findByStatus', () => {
    it('finds pages by draft status', async () => {
      await createTestPage({
        slug: 'draft-1',
        title: 'Draft 1',
        status: 'draft',
      });

      await createTestPage({
        slug: 'published-1',
        title: 'Published 1',
        status: 'published',
      });

      const drafts = await pageRepository.findByStatus('draft');

      expect(drafts).to.have.length(1);
      expect(drafts[0].status).to.equal('draft');
    });

    it('finds pages by published status', async () => {
      await createTestPage({
        slug: 'published-1',
        title: 'Published 1',
        status: 'published',
      });

      await createTestPage({
        slug: 'published-2',
        title: 'Published 2',
        status: 'published',
      });

      const published = await pageRepository.findByStatus('published');

      expect(published).to.have.length(2);
    });

    it('finds pages by scheduled status', async () => {
      await createTestPage({
        slug: 'scheduled-1',
        title: 'Scheduled 1',
        status: 'scheduled',
      });

      const scheduled = await pageRepository.findByStatus('scheduled');

      expect(scheduled).to.have.length(1);
      expect(scheduled[0].status).to.equal('scheduled');
    });

    it('finds pages by archived status', async () => {
      await createTestPage({
        slug: 'archived-1',
        title: 'Archived 1',
        status: 'archived',
      });

      const archived = await pageRepository.findByStatus('archived');

      expect(archived).to.have.length(1);
      expect(archived[0].status).to.equal('archived');
    });

    it('includes sections when requested', async () => {
      const page = await createTestPage({
        slug: 'draft-with-sections',
        title: 'Draft with Sections',
        status: 'draft',
      });

      await createTestSection({
        pageId: page.id,
        name: 'Section 1',
        type: 'text',
      });

      const drafts = await pageRepository.findByStatus('draft', true);

      expect(drafts[0].sections).to.have.length(1);
    });

    it('orders by updatedAt descending', async () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-02');

      await createTestPage({
        slug: 'draft-1',
        title: 'Draft 1',
        status: 'draft',
        updatedAt: date1,
      });

      await createTestPage({
        slug: 'draft-2',
        title: 'Draft 2',
        status: 'draft',
        updatedAt: date2,
      });

      const drafts = await pageRepository.findByStatus('draft');

      expect(drafts[0].slug).to.equal('draft-2');
      expect(drafts[1].slug).to.equal('draft-1');
    });
  });

  describe('findScheduledForPublishing', () => {
    it('finds scheduled pages whose time has passed', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      await createTestPage({
        slug: 'scheduled-ready',
        title: 'Scheduled Ready',
        status: 'scheduled',
        scheduledAt: pastDate,
      });

      const ready = await pageRepository.findScheduledForPublishing();

      expect(ready).to.have.length(1);
      expect(ready[0].slug).to.equal('scheduled-ready');
    });

    it('excludes scheduled pages whose time has not passed', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      await createTestPage({
        slug: 'scheduled-future',
        title: 'Scheduled Future',
        status: 'scheduled',
        scheduledAt: futureDate,
      });

      const ready = await pageRepository.findScheduledForPublishing();

      expect(ready).to.have.length(0);
    });

    it('excludes pages with other statuses', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      await createTestPage({
        slug: 'published',
        title: 'Published',
        status: 'published',
        scheduledAt: pastDate,
      });

      await createTestPage({
        slug: 'draft',
        title: 'Draft',
        status: 'draft',
        scheduledAt: pastDate,
      });

      const ready = await pageRepository.findScheduledForPublishing();

      expect(ready).to.have.length(0);
    });

    it('orders by scheduledAt ascending', async () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-02');
      const date3 = new Date('2024-01-03');

      await createTestPage({
        slug: 'scheduled-3',
        title: 'Scheduled 3',
        status: 'scheduled',
        scheduledAt: date3,
      });

      await createTestPage({
        slug: 'scheduled-1',
        title: 'Scheduled 1',
        status: 'scheduled',
        scheduledAt: date1,
      });

      await createTestPage({
        slug: 'scheduled-2',
        title: 'Scheduled 2',
        status: 'scheduled',
        scheduledAt: date2,
      });

      const ready = await pageRepository.findScheduledForPublishing();

      expect(ready).to.have.length(3);
      expect(ready[0].slug).to.equal('scheduled-1');
      expect(ready[1].slug).to.equal('scheduled-2');
      expect(ready[2].slug).to.equal('scheduled-3');
    });
  });

  // Helper functions
  async function createTestPage(data: Partial<Page>): Promise<Page> {
    const page = new Page({
      id: uuidv4(),
      slug: data.slug || 'test-slug',
      title: data.title || 'Test Title',
      status: data.status || 'draft',
      version: 1,
      ...data,
    });
    return pageRepository.create(page);
  }

  async function createTestSection(data: {
    pageId: string;
    name: string;
    type: string;
  }) {
    return sectionRepository.create({
      id: uuidv4(),
      pageId: data.pageId,
      name: data.name,
      type: data.type as any,
      order: 0,
      enabled: true,
      content: {},
    });
  }

  async function createTestVersion(data: {pageId: string; version: number}) {
    return contentVersionRepository.create({
      id: uuidv4(),
      pageId: data.pageId,
      version: data.version,
      content: {},
    });
  }
});
