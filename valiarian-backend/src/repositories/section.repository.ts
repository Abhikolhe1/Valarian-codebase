import {Constructor, inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';
import {Section, SectionRelations} from '../models';

export class SectionRepository extends TimeStampRepositoryMixin<
  Section,
  typeof Section.prototype.id,
  Constructor<
    DefaultCrudRepository<Section, typeof Section.prototype.id, SectionRelations>
  >
>(DefaultCrudRepository) {
  constructor(@inject('datasources.valiarian') dataSource: ValiarianDataSource) {
    super(Section, dataSource);
  }

  /**
   * Find sections by page ID
   * @param pageId - The page ID to filter by
   * @param includeDisabled - Whether to include disabled sections (default: true)
   * @returns Array of sections ordered by their order field
   */
  async findByPageId(pageId: string, includeDisabled = true): Promise<Section[]> {
    const where: {pageId: string; enabled?: boolean} = {pageId};
    if (!includeDisabled) {
      where.enabled = true;
    }

    return this.find({
      where,
      order: ['order ASC'],
    });
  }

  /**
   * Find sections by type
   * @param type - The section type to filter by
   * @param pageId - Optional page ID to further filter results
   * @returns Array of sections of the specified type
   */
  async findByType(
    type: Section['type'],
    pageId?: string,
  ): Promise<Section[]> {
    const where: {type: Section['type']; pageId?: string} = {type};
    if (pageId) {
      where.pageId = pageId;
    }

    return this.find({
      where,
      order: ['order ASC'],
    });
  }

  /**
   * Find sections by page ID and type
   * @param pageId - The page ID to filter by
   * @param type - The section type to filter by
   * @returns Array of sections matching both criteria
   */
  async findByPageIdAndType(
    pageId: string,
    type: Section['type'],
  ): Promise<Section[]> {
    return this.find({
      where: {
        pageId,
        type,
      },
      order: ['order ASC'],
    });
  }

  /**
   * Bulk update section orders
   * Updates the order field for multiple sections in a single transaction
   * @param updates - Array of objects containing section id and new order
   * @returns Number of sections updated
   */
  async bulkUpdateOrder(
    updates: Array<{id: string; order: number}>,
  ): Promise<number> {
    if (updates.length === 0) {
      return 0;
    }

    // Update each section's order
    const updatePromises = updates.map(update =>
      this.updateById(update.id, {
        order: update.order,
        updatedAt: new Date(),
      }),
    );

    await Promise.all(updatePromises);
    return updates.length;
  }

  /**
   * Reorder sections for a specific page
   * Automatically adjusts order values to be sequential starting from 0
   * @param pageId - The page ID whose sections to reorder
   * @param sectionIds - Array of section IDs in the desired order
   * @returns Number of sections reordered
   */
  async reorderSections(pageId: string, sectionIds: string[]): Promise<number> {
    if (sectionIds.length === 0) {
      return 0;
    }

    // Verify all sections belong to the specified page
    const sections = await this.find({
      where: {
        id: {inq: sectionIds},
        pageId,
      },
    });

    if (sections.length !== sectionIds.length) {
      throw new Error(
        'Some sections do not exist or do not belong to the specified page',
      );
    }

    // Create updates with sequential order values
    const updates = sectionIds.map((id, index) => ({
      id,
      order: index,
    }));

    return this.bulkUpdateOrder(updates);
  }

  /**
   * Get the next available order value for a page
   * @param pageId - The page ID to check
   * @returns The next order value (max + 1, or 0 if no sections exist)
   */
  async getNextOrder(pageId: string): Promise<number> {
    const sections = await this.find({
      where: {pageId},
      order: ['order DESC'],
      limit: 1,
    });

    return sections.length > 0 ? sections[0].order + 1 : 0;
  }
}
