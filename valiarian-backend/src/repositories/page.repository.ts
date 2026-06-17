import {Constructor, Getter, inject} from '@loopback/core';
import {
  DefaultCrudRepository,
  HasManyRepositoryFactory,
  repository,
} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';
import {ContentVersion, Page, PageRelations, Section} from '../models';
import {ContentVersionRepository} from './content-version.repository';
import {SectionRepository} from './section.repository';

export class PageRepository extends TimeStampRepositoryMixin<
  Page,
  typeof Page.prototype.id,
  Constructor<DefaultCrudRepository<Page, typeof Page.prototype.id, PageRelations>>
>(DefaultCrudRepository) {
  public readonly sections: HasManyRepositoryFactory<
    Section,
    typeof Page.prototype.id
  >;

  public readonly versions: HasManyRepositoryFactory<
    ContentVersion,
    typeof Page.prototype.id
  >;

  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
    @repository.getter('SectionRepository')
    protected sectionRepositoryGetter: Getter<SectionRepository>,
    @repository.getter('ContentVersionRepository')
    protected contentVersionRepositoryGetter: Getter<ContentVersionRepository>,
  ) {
    super(Page, dataSource);

    this.sections = this.createHasManyRepositoryFactoryFor(
      'sections',
      sectionRepositoryGetter,
    );
    this.registerInclusionResolver('sections', this.sections.inclusionResolver);

    this.versions = this.createHasManyRepositoryFactoryFor(
      'versions',
      contentVersionRepositoryGetter,
    );
    this.registerInclusionResolver('versions', this.versions.inclusionResolver);
  }

  /**
   * Find a page by its slug
   * @param slug - The page slug
   * @param includeSections - Whether to include sections relation
   * @param includeVersions - Whether to include versions relation
   * @returns Page with optional relations or null if not found
   */
  async findBySlug(
    slug: string,
    includeSections = false,
    includeVersions = false,
  ): Promise<Page | null> {
    const include = [];
    if (includeSections) {
      include.push({relation: 'sections'});
    }
    if (includeVersions) {
      include.push({relation: 'versions'});
    }

    const pages = await this.find({
      where: {slug},
      include: include.length > 0 ? include : undefined,
      limit: 1,
    });

    return pages.length > 0 ? pages[0] : null;
  }

  /**
   * Find all published pages
   * Includes pages with status 'published' and scheduled pages whose scheduledAt date has passed
   * @param includeSections - Whether to include sections relation
   * @param includeVersions - Whether to include versions relation
   * @returns Array of published pages
   */
  async findPublished(
    includeSections = false,
    includeVersions = false,
  ): Promise<Page[]> {
    const now = new Date();
    const include = [];
    if (includeSections) {
      include.push({relation: 'sections'});
    }
    if (includeVersions) {
      include.push({relation: 'versions'});
    }

    // Find pages that are either:
    // 1. Status is 'published'
    // 2. Status is 'scheduled' and scheduledAt is in the past
    const pages = await this.find({
      where: {
        or: [
          {status: 'published'},
          {
            and: [
              {status: 'scheduled'},
              {scheduledAt: {lte: now}},
            ],
          },
        ],
      },
      include: include.length > 0 ? include : undefined,
      order: ['publishedAt DESC'],
    });

    return pages;
  }

  /**
   * Find pages by status
   * @param status - The page status to filter by
   * @param includeSections - Whether to include sections relation
   * @param includeVersions - Whether to include versions relation
   * @returns Array of pages with the specified status
   */
  async findByStatus(
    status: 'draft' | 'published' | 'scheduled' | 'archived',
    includeSections = false,
    includeVersions = false,
  ): Promise<Page[]> {
    const include = [];
    if (includeSections) {
      include.push({relation: 'sections'});
    }
    if (includeVersions) {
      include.push({relation: 'versions'});
    }

    return this.find({
      where: {status},
      include: include.length > 0 ? include : undefined,
      order: ['updatedAt DESC'],
    });
  }

  /**
   * Find scheduled pages that should be published
   * Returns pages with status 'scheduled' whose scheduledAt date has passed
   * @returns Array of pages ready to be published
   */
  async findScheduledForPublishing(): Promise<Page[]> {
    const now = new Date();

    return this.find({
      where: {
        status: 'scheduled',
        scheduledAt: {lte: now},
      },
      order: ['scheduledAt ASC'],
    });
  }
}
