import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {v4 as uuidv4} from 'uuid';
import {ContentVersion, Page, Section} from '../models';
import {
  ContentVersionRepository,
  PageRepository,
  SectionRepository,
} from '../repositories';


export class CMSService {
  constructor(
    @repository(PageRepository)
    public pageRepository: PageRepository,
    @repository(SectionRepository)
    public sectionRepository: SectionRepository,
    @repository(ContentVersionRepository)
    public contentVersionRepository: ContentVersionRepository,
  ) { }

  /**
   * Publish a page - transitions from draft/scheduled to published
   * Creates a version snapshot before publishing
   * @param pageId - The page ID to publish
   * @param userId - The user performing the action
   * @param comment - Optional comment for the version
   * @returns The published page
   */
  async publishPage(
    pageId: string,
    userId?: string,
    comment?: string,
  ): Promise<Page> {
    const page = await this.pageRepository.findById(pageId);

    // Validate status transition
    if (page.status === 'published') {
      throw new HttpErrors.BadRequest('Page is already published');
    }

    if (page.status === 'archived') {
      throw new HttpErrors.BadRequest(
        'Cannot publish an archived page. Please restore it first.',
      );
    }

    // Create version snapshot before publishing
    await this.createVersion(pageId, userId, comment || 'Published page');

    // Update page status
    const now = new Date();
    page.status = 'published';
    page.publishedAt = now;
    page.updatedAt = now;
    if (userId) {
      page.updatedBy = userId;
    }

    await this.pageRepository.updateById(pageId, page);
    return this.pageRepository.findById(pageId);
  }

  /**
   * Unpublish a page - transitions from published to draft
   * Creates a version snapshot before unpublishing
   * @param pageId - The page ID to unpublish
   * @param userId - The user performing the action
   * @param comment - Optional comment for the version
   * @returns The unpublished page
   */
  async unpublishPage(
    pageId: string,
    userId?: string,
    comment?: string,
  ): Promise<Page> {
    const page = await this.pageRepository.findById(pageId);

    // Validate status transition
    if (page.status !== 'published') {
      throw new HttpErrors.BadRequest('Only published pages can be unpublished');
    }

    // Create version snapshot before unpublishing
    await this.createVersion(pageId, userId, comment || 'Unpublished page');

    // Update page status
    const now = new Date();
    page.status = 'draft';
    page.updatedAt = now;
    if (userId) {
      page.updatedBy = userId;
    }

    await this.pageRepository.updateById(pageId, page);
    return this.pageRepository.findById(pageId);
  }

  /**
   * Schedule a page for future publishing
   * Creates a version snapshot before scheduling
   * @param pageId - The page ID to schedule
   * @param scheduledAt - The date/time to publish
   * @param userId - The user performing the action
   * @param comment - Optional comment for the version
   * @returns The scheduled page
   */
  async schedulePage(
    pageId: string,
    scheduledAt: Date,
    userId?: string,
    comment?: string,
  ): Promise<Page> {
    const page = await this.pageRepository.findById(pageId);

    // Validate scheduled date is in the future
    const now = new Date();
    if (scheduledAt <= now) {
      throw new HttpErrors.BadRequest(
        'Scheduled date must be in the future',
      );
    }

    // Validate status transition
    if (page.status === 'archived') {
      throw new HttpErrors.BadRequest(
        'Cannot schedule an archived page. Please restore it first.',
      );
    }

    // Create version snapshot before scheduling
    await this.createVersion(
      pageId,
      userId,
      comment || `Scheduled for ${scheduledAt.toISOString()}`,
    );

    // Update page status
    page.status = 'scheduled';
    page.scheduledAt = scheduledAt;
    page.updatedAt = now;
    if (userId) {
      page.updatedBy = userId;
    }

    await this.pageRepository.updateById(pageId, page);
    return this.pageRepository.findById(pageId);
  }

  /**
   * Archive a page - transitions to archived status
   * Creates a version snapshot before archiving
   * @param pageId - The page ID to archive
   * @param userId - The user performing the action
   * @param comment - Optional comment for the version
   * @returns The archived page
   */
  async archivePage(
    pageId: string,
    userId?: string,
    comment?: string,
  ): Promise<Page> {
    const page = await this.pageRepository.findById(pageId);

    // Create version snapshot before archiving
    await this.createVersion(pageId, userId, comment || 'Archived page');

    // Update page status
    const now = new Date();
    page.status = 'archived';
    page.updatedAt = now;
    if (userId) {
      page.updatedBy = userId;
    }

    await this.pageRepository.updateById(pageId, page);
    return this.pageRepository.findById(pageId);
  }

  /**
   * Restore an archived page to draft status
   * Creates a version snapshot before restoring
   * @param pageId - The page ID to restore
   * @param userId - The user performing the action
   * @param comment - Optional comment for the version
   * @returns The restored page
   */
  async restorePage(
    pageId: string,
    userId?: string,
    comment?: string,
  ): Promise<Page> {
    const page = await this.pageRepository.findById(pageId);

    // Validate status
    if (page.status !== 'archived') {
      throw new HttpErrors.BadRequest('Only archived pages can be restored');
    }

    // Create version snapshot before restoring
    await this.createVersion(pageId, userId, comment || 'Restored page');

    // Update page status
    const now = new Date();
    page.status = 'draft';
    page.updatedAt = now;
    if (userId) {
      page.updatedBy = userId;
    }

    await this.pageRepository.updateById(pageId, page);
    return this.pageRepository.findById(pageId);
  }

  /**
   * Update a page and create a version snapshot
   * Increments the version number
   * @param pageId - The page ID to update
   * @param pageData - The page data to update
   * @param userId - The user performing the action
   * @param comment - Optional comment for the version
   * @returns The updated page
   */
  async updatePageWithVersion(
    pageId: string,
    pageData: Partial<Page>,
    userId?: string,
    comment?: string,
  ): Promise<Page> {
    const page = await this.pageRepository.findById(pageId);

    // Create version snapshot before updating
    await this.createVersion(
      pageId,
      userId,
      comment || `Updated page to version ${page.version + 1}`,
    );

    // Update page and increment version
    const now = new Date();
    const updatedPage = {
      ...pageData,
      version: page.version + 1,
      updatedAt: now,
    };

    if (userId) {
      updatedPage.updatedBy = userId;
    }

    await this.pageRepository.updateById(pageId, updatedPage);
    return this.pageRepository.findById(pageId);
  }

  /**
   * Create a version snapshot of a page with all its sections
   * @param pageId - The page ID to snapshot
   * @param userId - The user creating the version
   * @param comment - Optional comment for the version
   * @returns The created version
   */
  async createVersion(
    pageId: string,
    userId?: string,
    comment?: string,
  ): Promise<ContentVersion> {
    // Fetch page with sections
    const page = await this.pageRepository.findById(pageId, {
      include: [{relation: 'sections'}],
    });

    // Create snapshot content
    const snapshot = {
      page: {
        id: page.id,
        slug: page.slug,
        title: page.title,
        description: page.description,
        status: page.status,
        publishedAt: page.publishedAt,
        scheduledAt: page.scheduledAt,
        seoTitle: page.seoTitle,
        seoDescription: page.seoDescription,
        seoKeywords: page.seoKeywords,
        ogImage: page.ogImage,
        ogImageAlt: page.ogImageAlt,
        structuredData: page.structuredData,
        version: page.version,
      },
      sections: page.sections || [],
    };

    // Create version record
    const version = new ContentVersion({
      id: uuidv4(),
      pageId: pageId,
      version: page.version,
      content: snapshot,
      createdAt: new Date(),
      createdBy: userId,
      comment: comment,
    });

    return this.contentVersionRepository.create(version);
  }

  /**
   * Check and publish scheduled pages
   * This method should be called periodically (e.g., via cron job)
   * @returns Array of pages that were published
   */
  async processScheduledPages(): Promise<Page[]> {
    const scheduledPages =
      await this.pageRepository.findScheduledForPublishing();

    const publishedPages: Page[] = [];

    for (const page of scheduledPages) {
      try {
        const published = await this.publishPage(
          page.id,
          undefined,
          'Auto-published from schedule',
        );
        publishedPages.push(published);
      } catch (error) {
        // Log error but continue processing other pages
        console.error(
          `Failed to publish scheduled page ${page.id}:`,
          error,
        );
      }
    }

    return publishedPages;
  }

  /**
   * Validate if a status transition is allowed
   * @param currentStatus - Current page status
   * @param newStatus - Desired new status
   * @returns true if transition is allowed
   */
  validateStatusTransition(
    currentStatus: string,
    newStatus: string,
  ): boolean {
    const allowedTransitions: Record<string, string[]> = {
      draft: ['published', 'scheduled', 'archived'],
      published: ['draft', 'archived'],
      scheduled: ['draft', 'published', 'archived'],
      archived: ['draft'],
    };

    return allowedTransitions[currentStatus]?.includes(newStatus) ?? false;
  }

  /**
   * Duplicate a page with all its sections
   * Creates a deep copy of the page and all associated sections
   * The duplicated page is created as a draft with a new slug
   * @param pageId - The page ID to duplicate
   * @param newSlug - The slug for the duplicated page
   * @param newTitle - Optional new title (defaults to "Copy of {original title}")
   * @param userId - The user performing the action
   * @returns The duplicated page with sections
   */
  async duplicatePage(
    pageId: string,
    newSlug: string,
    newTitle?: string,
    userId?: string,
  ): Promise<Page> {
    // Fetch the original page with all sections
    const originalPage = await this.pageRepository.findById(pageId, {
      include: [{relation: 'sections'}],
    });

    // Check if the new slug already exists
    const existingPage = await this.pageRepository.findBySlug(newSlug);
    if (existingPage) {
      throw new HttpErrors.BadRequest(
        `A page with slug "${newSlug}" already exists`,
      );
    }

    // Create the duplicated page
    const now = new Date();
    const duplicatedPage = new Page({
      id: uuidv4(),
      slug: newSlug,
      title: newTitle || `Copy of ${originalPage.title}`,
      description: originalPage.description,
      status: 'draft', // Always create as draft
      seoTitle: originalPage.seoTitle,
      seoDescription: originalPage.seoDescription,
      seoKeywords: originalPage.seoKeywords,
      ogImage: originalPage.ogImage,
      ogImageAlt: originalPage.ogImageAlt,
      structuredData: originalPage.structuredData,
      version: 1, // Start at version 1
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    });

    // Save the duplicated page
    const savedPage = await this.pageRepository.create(duplicatedPage);

    // Duplicate all sections
    if (originalPage.sections && originalPage.sections.length > 0) {
      for (const section of originalPage.sections) {
        const duplicatedSection = new Section({
          id: uuidv4(),
          pageId: savedPage.id,
          type: section.type,
          name: section.name,
          order: section.order,
          enabled: section.enabled,
          content: section.content,
          settings: section.settings,
          createdAt: now,
          updatedAt: now,
        });

        await this.sectionRepository.create(duplicatedSection);
      }
    }

    // Create initial version for the duplicated page
    await this.createVersion(
      savedPage.id,
      userId,
      `Duplicated from page: ${originalPage.title}`,
    );

    // Return the duplicated page with sections
    return this.pageRepository.findById(savedPage.id, {
      include: [{relation: 'sections'}],
    });
  }

  /**
   * Delete a page and all CMS records that belong to it.
   * Removes sections first, then version history, then the page record.
   * @param pageId - The page ID to delete
   */
  async deletePage(pageId: string): Promise<void> {
    await this.pageRepository.findById(pageId);

    await this.sectionRepository.deleteAll({pageId});
    await this.contentVersionRepository.deleteAll({pageId});
    await this.pageRepository.deleteById(pageId);
  }

  /**
   * Reorder sections for a page
   * Updates the order field for multiple sections in a single operation
   * @param sectionOrders - Array of objects with sectionId and new order
   * @returns Array of updated sections
   */
  async reorderSections(
    sectionOrders: Array<{sectionId: string; order: number}>,
  ): Promise<Section[]> {
    if (!sectionOrders || sectionOrders.length === 0) {
      throw new HttpErrors.BadRequest('Section orders array cannot be empty');
    }

    // Validate all sections exist and belong to the same page
    const sectionIds = sectionOrders.map(so => so.sectionId);
    const sections = await this.sectionRepository.find({
      where: {id: {inq: sectionIds}},
    });

    if (sections.length !== sectionIds.length) {
      throw new HttpErrors.BadRequest('One or more sections not found');
    }

    // Check all sections belong to the same page
    const pageIds = new Set(sections.map(s => s.pageId));
    if (pageIds.size > 1) {
      throw new HttpErrors.BadRequest(
        'All sections must belong to the same page',
      );
    }

    // Validate order values are unique and non-negative
    const orders = sectionOrders.map(so => so.order);
    const uniqueOrders = new Set(orders);
    if (uniqueOrders.size !== orders.length) {
      throw new HttpErrors.BadRequest('Order values must be unique');
    }

    if (orders.some(order => order < 0)) {
      throw new HttpErrors.BadRequest('Order values must be non-negative');
    }

    // Update each section's order
    const now = new Date();
    const updatedSections: Section[] = [];

    for (const {sectionId, order} of sectionOrders) {
      await this.sectionRepository.updateById(sectionId, {
        order,
        updatedAt: now,
      });

      const updatedSection = await this.sectionRepository.findById(sectionId);
      updatedSections.push(updatedSection);
    }

    // Sort by order before returning
    return updatedSections.sort((a, b) => a.order - b.order);
  }

  /**
   * Bulk update section orders for a page
   * Convenience method that takes an array of section IDs in the desired order
   * and automatically assigns sequential order values
   * @param pageId - The page ID
   * @param orderedSectionIds - Array of section IDs in the desired order
   * @returns Array of updated sections
   */
  async bulkReorderSections(
    pageId: string,
    orderedSectionIds: string[],
  ): Promise<Section[]> {
    if (!orderedSectionIds || orderedSectionIds.length === 0) {
      throw new HttpErrors.BadRequest('Section IDs array cannot be empty');
    }

    // Verify all sections exist and belong to the specified page
    const sections = await this.sectionRepository.find({
      where: {
        pageId: pageId,
        id: {inq: orderedSectionIds},
      },
    });

    if (sections.length !== orderedSectionIds.length) {
      throw new HttpErrors.BadRequest(
        'One or more sections not found or do not belong to the specified page',
      );
    }

    // Create section orders with sequential values
    const sectionOrders = orderedSectionIds.map((sectionId, index) => ({
      sectionId,
      order: index,
    }));

    return this.reorderSections(sectionOrders);
  }

  /**
   * Get version history for a page
   * Returns all versions ordered by version number (latest first)
   * @param pageId - The page ID
   * @returns Array of content versions
   */
  async getVersionHistory(pageId: string): Promise<ContentVersion[]> {
    // Verify page exists
    await this.pageRepository.findById(pageId);

    // Fetch all versions for this page, ordered by version descending
    return this.contentVersionRepository.find({
      where: {pageId},
      order: ['version DESC'],
    });
  }

  /**
   * Revert a page to a specific version
   * Restores the page and sections from the version snapshot
   * Creates a new version after reverting
   * @param pageId - The page ID to revert
   * @param versionNumber - The version number to revert to
   * @param userId - The user performing the action
   * @param comment - Optional comment for the new version
   * @returns The reverted page
   */
  async revertToVersion(
    pageId: string,
    versionNumber: number,
    userId?: string,
    comment?: string,
  ): Promise<Page> {
    // Verify page exists
    const currentPage = await this.pageRepository.findById(pageId);

    // Find the version to revert to
    const version = await this.contentVersionRepository.findOne({
      where: {
        pageId,
        version: versionNumber,
      },
    });

    if (!version) {
      throw new HttpErrors.NotFound(
        `Version ${versionNumber} not found for page ${pageId}`,
      );
    }

    // Extract page data from version snapshot
    const versionContent = version.content as any;
    const pageData = versionContent.page;
    const sectionsData = versionContent.sections || [];

    // Create version snapshot of current state before reverting
    await this.createVersion(
      pageId,
      userId,
      comment || `Reverting to version ${versionNumber}`,
    );

    // Update page with data from version
    const now = new Date();
    await this.pageRepository.updateById(pageId, {
      slug: pageData.slug,
      title: pageData.title,
      description: pageData.description,
      status: pageData.status,
      seoTitle: pageData.seoTitle,
      seoDescription: pageData.seoDescription,
      seoKeywords: pageData.seoKeywords,
      ogImage: pageData.ogImage,
      ogImageAlt: pageData.ogImageAlt,
      structuredData: pageData.structuredData,
      version: currentPage.version + 1, // Increment version
      updatedAt: now,
      updatedBy: userId,
    });

    // Delete all current sections
    const currentSections = await this.sectionRepository.find({
      where: {pageId},
    });

    for (const section of currentSections) {
      await this.sectionRepository.deleteById(section.id);
    }

    // Restore sections from version
    for (const sectionData of sectionsData) {
      const restoredSection = new Section({
        id: uuidv4(),
        pageId: pageId,
        type: sectionData.type,
        name: sectionData.name,
        order: sectionData.order,
        enabled: sectionData.enabled,
        content: sectionData.content,
        settings: sectionData.settings,
        createdAt: now,
        updatedAt: now,
      });

      await this.sectionRepository.create(restoredSection);
    }

    // Return the reverted page with sections
    return this.pageRepository.findById(pageId, {
      include: [{relation: 'sections'}],
    });
  }
}
