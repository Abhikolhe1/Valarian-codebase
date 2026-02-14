import {expect} from '@loopback/testlab';
import {v4 as uuidv4} from 'uuid';
import {ValiarianBackendApplication} from '../../..';
import {Page, Section} from '../../../models';
import {PageRepository, SectionRepository} from '../../../repositories';
import {setupApplication} from '../../acceptance/test-helper';

describe('SectionRepository (unit)', () => {
  let app: ValiarianBackendApplication;
  let sectionRepository: SectionRepository;
  let pageRepository: PageRepository;

  before('setupApplication', async () => {
    ({app} = await setupApplication());
    sectionRepository = await app.getRepository(SectionRepository);
    pageRepository = await app.getRepository(PageRepository);
  });

  after(async () => {
    await app.stop();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await sectionRepository.deleteAll();
    await pageRepository.deleteAll();
  });

  describe('findByPageId', () => {
    it('finds sections by page ID', async () => {
      const page = await createTestPage({slug: 'test-page'});

      await createTestSection({
        pageId: page.id,
        name: 'Section 1',
        type: 'hero',
        order: 0,
      });

      await createTestSection({
        pageId: page.id,
        name: 'Section 2',
        type: 'text',
        order: 1,
      });

      const sections = await sectionRepository.findByPageId(page.id);

      expect(sections).to.have.length(2);
      expect(sections[0].name).to.equal('Section 1');
      expect(sections[1].name).to.equal('Section 2');
    });

    it('returns empty array when no sections exist', async () => {
      const page = await createTestPage({slug: 'empty-page'});

      const sections = await sectionRepository.findByPageId(page.id);

      expect(sections).to.be.Array();
      expect(sections).to.have.length(0);
    });

    it('orders sections by order field ascending', async () => {
      const page = await createTestPage({slug: 'ordered-page'});

      await createTestSection({
        pageId: page.id,
        name: 'Third',
        type: 'text',
        order: 2,
      });

      await createTestSection({
        pageId: page.id,
        name: 'First',
        type: 'hero',
        order: 0,
      });

      await createTestSection({
        pageId: page.id,
        name: 'Second',
        type: 'features',
        order: 1,
      });

      const sections = await sectionRepository.findByPageId(page.id);

      expect(sections[0].name).to.equal('First');
      expect(sections[1].name).to.equal('Second');
      expect(sections[2].name).to.equal('Third');
    });

    it('includes disabled sections by default', async () => {
      const page = await createTestPage({slug: 'page-with-disabled'});

      await createTestSection({
        pageId: page.id,
        name: 'Enabled',
        type: 'hero',
        order: 0,
        enabled: true,
      });

      await createTestSection({
        pageId: page.id,
        name: 'Disabled',
        type: 'text',
        order: 1,
        enabled: false,
      });

      const sections = await sectionRepository.findByPageId(page.id);

      expect(sections).to.have.length(2);
    });

    it('excludes disabled sections when requested', async () => {
      const page = await createTestPage({slug: 'page-with-disabled'});

      await createTestSection({
        pageId: page.id,
        name: 'Enabled',
        type: 'hero',
        order: 0,
        enabled: true,
      });

      await createTestSection({
        pageId: page.id,
        name: 'Disabled',
        type: 'text',
        order: 1,
        enabled: false,
      });

      const sections = await sectionRepository.findByPageId(page.id, false);

      expect(sections).to.have.length(1);
      expect(sections[0].name).to.equal('Enabled');
    });

    it('filters sections by page ID correctly', async () => {
      const page1 = await createTestPage({slug: 'page-1'});
      const page2 = await createTestPage({slug: 'page-2'});

      await createTestSection({
        pageId: page1.id,
        name: 'Page 1 Section',
        type: 'hero',
        order: 0,
      });

      await createTestSection({
        pageId: page2.id,
        name: 'Page 2 Section',
        type: 'text',
        order: 0,
      });

      const page1Sections = await sectionRepository.findByPageId(page1.id);

      expect(page1Sections).to.have.length(1);
      expect(page1Sections[0].name).to.equal('Page 1 Section');
    });
  });

  describe('findByType', () => {
    it('finds sections by type', async () => {
      const page = await createTestPage({slug: 'test-page'});

      await createTestSection({
        pageId: page.id,
        name: 'Hero 1',
        type: 'hero',
        order: 0,
      });

      await createTestSection({
        pageId: page.id,
        name: 'Text 1',
        type: 'text',
        order: 1,
      });

      await createTestSection({
        pageId: page.id,
        name: 'Hero 2',
        type: 'hero',
        order: 2,
      });

      const heroSections = await sectionRepository.findByType('hero');

      expect(heroSections).to.have.length(2);
      expect(heroSections[0].name).to.equal('Hero 1');
      expect(heroSections[1].name).to.equal('Hero 2');
    });

    it('filters by type and page ID when provided', async () => {
      const page1 = await createTestPage({slug: 'page-1'});
      const page2 = await createTestPage({slug: 'page-2'});

      await createTestSection({
        pageId: page1.id,
        name: 'Page 1 Hero',
        type: 'hero',
        order: 0,
      });

      await createTestSection({
        pageId: page2.id,
        name: 'Page 2 Hero',
        type: 'hero',
        order: 0,
      });

      const page1Heroes = await sectionRepository.findByType('hero', page1.id);

      expect(page1Heroes).to.have.length(1);
      expect(page1Heroes[0].name).to.equal('Page 1 Hero');
    });

    it('returns empty array when no sections of type exist', async () => {
      const page = await createTestPage({slug: 'test-page'});

      await createTestSection({
        pageId: page.id,
        name: 'Hero',
        type: 'hero',
        order: 0,
      });

      const testimonials = await sectionRepository.findByType('testimonials');

      expect(testimonials).to.be.Array();
      expect(testimonials).to.have.length(0);
    });

    it('orders sections by order field', async () => {
      const page = await createTestPage({slug: 'test-page'});

      await createTestSection({
        pageId: page.id,
        name: 'Text 2',
        type: 'text',
        order: 2,
      });

      await createTestSection({
        pageId: page.id,
        name: 'Text 1',
        type: 'text',
        order: 0,
      });

      const textSections = await sectionRepository.findByType('text');

      expect(textSections[0].name).to.equal('Text 1');
      expect(textSections[1].name).to.equal('Text 2');
    });
  });

  describe('findByPageIdAndType', () => {
    it('finds sections by both page ID and type', async () => {
      const page1 = await createTestPage({slug: 'page-1'});
      const page2 = await createTestPage({slug: 'page-2'});

      await createTestSection({
        pageId: page1.id,
        name: 'Page 1 Hero',
        type: 'hero',
        order: 0,
      });

      await createTestSection({
        pageId: page1.id,
        name: 'Page 1 Text',
        type: 'text',
        order: 1,
      });

      await createTestSection({
        pageId: page2.id,
        name: 'Page 2 Hero',
        type: 'hero',
        order: 0,
      });

      const sections = await sectionRepository.findByPageIdAndType(
        page1.id,
        'hero',
      );

      expect(sections).to.have.length(1);
      expect(sections[0].name).to.equal('Page 1 Hero');
    });

    it('returns empty array when no matching sections exist', async () => {
      const page = await createTestPage({slug: 'test-page'});

      await createTestSection({
        pageId: page.id,
        name: 'Hero',
        type: 'hero',
        order: 0,
      });

      const sections = await sectionRepository.findByPageIdAndType(
        page.id,
        'testimonials',
      );

      expect(sections).to.have.length(0);
    });
  });

  describe('bulkUpdateOrder', () => {
    it('updates order for multiple sections', async () => {
      const page = await createTestPage({slug: 'test-page'});

      const section1 = await createTestSection({
        pageId: page.id,
        name: 'Section 1',
        type: 'hero',
        order: 0,
      });

      const section2 = await createTestSection({
        pageId: page.id,
        name: 'Section 2',
        type: 'text',
        order: 1,
      });

      const section3 = await createTestSection({
        pageId: page.id,
        name: 'Section 3',
        type: 'features',
        order: 2,
      });

      const updates = [
        {id: section1.id, order: 2},
        {id: section2.id, order: 0},
        {id: section3.id, order: 1},
      ];

      const count = await sectionRepository.bulkUpdateOrder(updates);

      expect(count).to.equal(3);

      const sections = await sectionRepository.findByPageId(page.id);
      expect(sections[0].id).to.equal(section2.id);
      expect(sections[1].id).to.equal(section3.id);
      expect(sections[2].id).to.equal(section1.id);
    });

    it('returns 0 when no updates provided', async () => {
      const count = await sectionRepository.bulkUpdateOrder([]);

      expect(count).to.equal(0);
    });

    it('updates updatedAt timestamp', async () => {
      const page = await createTestPage({slug: 'test-page'});

      const section = await createTestSection({
        pageId: page.id,
        name: 'Section',
        type: 'hero',
        order: 0,
      });

      const originalUpdatedAt = section.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      await sectionRepository.bulkUpdateOrder([{id: section.id, order: 5}]);

      const updated = await sectionRepository.findById(section.id);
      expect(updated.order).to.equal(5);
      expect(updated.updatedAt?.getTime()).to.be.greaterThan(
        originalUpdatedAt?.getTime() || 0,
      );
    });
  });

  describe('reorderSections', () => {
    it('reorders sections with sequential order values', async () => {
      const page = await createTestPage({slug: 'test-page'});

      const section1 = await createTestSection({
        pageId: page.id,
        name: 'Section 1',
        type: 'hero',
        order: 0,
      });

      const section2 = await createTestSection({
        pageId: page.id,
        name: 'Section 2',
        type: 'text',
        order: 1,
      });

      const section3 = await createTestSection({
        pageId: page.id,
        name: 'Section 3',
        type: 'features',
        order: 2,
      });

      // Reverse the order
      const count = await sectionRepository.reorderSections(page.id, [
        section3.id,
        section2.id,
        section1.id,
      ]);

      expect(count).to.equal(3);

      const sections = await sectionRepository.findByPageId(page.id);
      expect(sections[0].id).to.equal(section3.id);
      expect(sections[0].order).to.equal(0);
      expect(sections[1].id).to.equal(section2.id);
      expect(sections[1].order).to.equal(1);
      expect(sections[2].id).to.equal(section1.id);
      expect(sections[2].order).to.equal(2);
    });

    it('returns 0 when no section IDs provided', async () => {
      const page = await createTestPage({slug: 'test-page'});

      const count = await sectionRepository.reorderSections(page.id, []);

      expect(count).to.equal(0);
    });

    it('throws error when section does not exist', async () => {
      const page = await createTestPage({slug: 'test-page'});

      const section = await createTestSection({
        pageId: page.id,
        name: 'Section',
        type: 'hero',
        order: 0,
      });

      const nonExistentId = uuidv4();

      await expect(
        sectionRepository.reorderSections(page.id, [
          section.id,
          nonExistentId,
        ]),
      ).to.be.rejectedWith(
        'Some sections do not exist or do not belong to the specified page',
      );
    });

    it('throws error when section belongs to different page', async () => {
      const page1 = await createTestPage({slug: 'page-1'});
      const page2 = await createTestPage({slug: 'page-2'});

      const section1 = await createTestSection({
        pageId: page1.id,
        name: 'Section 1',
        type: 'hero',
        order: 0,
      });

      const section2 = await createTestSection({
        pageId: page2.id,
        name: 'Section 2',
        type: 'text',
        order: 0,
      });

      await expect(
        sectionRepository.reorderSections(page1.id, [section1.id, section2.id]),
      ).to.be.rejectedWith(
        'Some sections do not exist or do not belong to the specified page',
      );
    });
  });

  describe('getNextOrder', () => {
    it('returns 0 when no sections exist', async () => {
      const page = await createTestPage({slug: 'empty-page'});

      const nextOrder = await sectionRepository.getNextOrder(page.id);

      expect(nextOrder).to.equal(0);
    });

    it('returns max order + 1 when sections exist', async () => {
      const page = await createTestPage({slug: 'test-page'});

      await createTestSection({
        pageId: page.id,
        name: 'Section 1',
        type: 'hero',
        order: 0,
      });

      await createTestSection({
        pageId: page.id,
        name: 'Section 2',
        type: 'text',
        order: 1,
      });

      await createTestSection({
        pageId: page.id,
        name: 'Section 3',
        type: 'features',
        order: 2,
      });

      const nextOrder = await sectionRepository.getNextOrder(page.id);

      expect(nextOrder).to.equal(3);
    });

    it('handles non-sequential order values', async () => {
      const page = await createTestPage({slug: 'test-page'});

      await createTestSection({
        pageId: page.id,
        name: 'Section 1',
        type: 'hero',
        order: 5,
      });

      await createTestSection({
        pageId: page.id,
        name: 'Section 2',
        type: 'text',
        order: 10,
      });

      const nextOrder = await sectionRepository.getNextOrder(page.id);

      expect(nextOrder).to.equal(11);
    });
  });

  // Helper functions
  async function createTestPage(data: Partial<Page>): Promise<Page> {
    return pageRepository.create({
      id: uuidv4(),
      slug: data.slug || 'test-slug',
      title: data.title || 'Test Title',
      status: 'draft',
      version: 1,
      ...data,
    });
  }

  async function createTestSection(data: {
    pageId: string;
    name: string;
    type: string;
    order: number;
    enabled?: boolean;
  }): Promise<Section> {
    return sectionRepository.create({
      id: uuidv4(),
      pageId: data.pageId,
      name: data.name,
      type: data.type as any,
      order: data.order,
      enabled: data.enabled !== undefined ? data.enabled : true,
      content: {},
    });
  }
});
