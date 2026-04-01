import {authenticate, AuthenticationBindings} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {Filter, repository} from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  HttpErrors,
  param,
  patch,
  post,
  requestBody,
  response
} from '@loopback/rest';
import {UserProfile} from '@loopback/security';
import {v4 as uuidv4} from 'uuid';
import {authorize} from '../authorization';
import {Section} from '../models';
import {PageRepository, SectionRepository} from '../repositories';
import {CacheService} from '../services/cache.service';

export class CMSSectionController {
  constructor(
    @repository(SectionRepository)
    public sectionRepository: SectionRepository,
    @repository(PageRepository)
    public pageRepository: PageRepository,
    @inject('services.cache')
    public cacheService: CacheService,
  ) { }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin', 'editor']})
  @get('/api/cms/sections')
  @response(200, {
    description: 'Array of Section model instances',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            sections: {
              type: 'array',
              items: getModelSchemaRef(Section, {includeRelations: true}),
            },
          },
        },
      },
    },
  })
  async find(
    @param.filter(Section) filter?: Filter<Section>,
    @param.query.string('pageId') pageId?: string,
    @param.query.string('type') type?: string,
    @param.query.boolean('includeDisabled') includeDisabled: boolean = true,
  ): Promise<{sections: Section[]}> {
    let sections: Section[];

    // If pageId is provided, use the repository method
    if (pageId) {
      if (type) {
        sections = await this.sectionRepository.findByPageIdAndType(
          pageId,
          type as Section['type'],
        );
      } else {
        sections = await this.sectionRepository.findByPageId(pageId, includeDisabled);
      }
    }
    // If type is provided without pageId
    else if (type) {
      sections = await this.sectionRepository.findByType(type as Section['type']);
    }
    // Default filter-based query
    else {
      const where: any = filter?.where || {};
      if (!includeDisabled) {
        where.enabled = true;
      }

      sections = await this.sectionRepository.find({
        ...filter,
        where,
        order: filter?.order || ['order ASC'],
      });
    }

    return {sections};
  }

  // Public endpoint to fetch sections by page slug
  @get('/api/cms/pages/slug/{slug}/sections')
  @response(200, {
    description: 'Array of Section model instances for a page by slug',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Section, {includeRelations: true}),
        },
      },
    },
  })
  async findByPageSlug(
    @param.path.string('slug') slug: string,
  ): Promise<Section[]> {
    // Find the page by slug
    const page = await this.pageRepository.findOne({where: {slug}});
    if (!page) {
      throw new HttpErrors.NotFound(`Page with slug "${slug}" not found`);
    }

    // Only return enabled sections for public endpoint
    return this.sectionRepository.findByPageId(page.id, false);
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin', 'editor']})
  @get('/api/cms/sections/{id}')
  @response(200, {
    description: 'Section model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Section, {includeRelations: true}),
      },
    },
  })
  async findById(@param.path.string('id') id: string): Promise<Section> {
    const section = await this.sectionRepository.findById(id);
    if (!section) {
      throw new HttpErrors.NotFound(`Section with id "${id}" not found`);
    }
    return section;
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin', 'editor']})
  @post('/api/cms/sections')
  @response(201, {
    description: 'Section model instance created',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Section),
      },
    },
  })
  async create(
    @inject(AuthenticationBindings.CURRENT_USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['pageId', 'type', 'name', 'content'],
            properties: {
              pageId: {type: 'string'},
              type: {
                type: 'string',
                enum: [
                  'premium-hero',
                  'premium-product-showcase',
                  'premium-fabric-details',
                  'premium-statement',
                  'premium-feature-grid',
                  'premium-confidence',
                  'premium-reserve-cta',
                  'premium-countdown',
                  'hero',
                  'scroll-animated',
                  'new-arrivals',
                  'collection-hero',
                  'best-sellers',
                  'fabric-info',
                  'social-media',
                  'features',
                  'testimonials',
                  'gallery',
                  'cta',
                  'text',
                  'video',
                  'faq',
                  'team',
                  'pricing',
                  'contact',
                  'custom',
                ],
              },
              name: {type: 'string', minLength: 1, maxLength: 255},
              order: {type: 'number'},
              enabled: {type: 'boolean', default: true},
              content: {type: 'object'},
              settings: {type: 'object'},
            },
          },
        },
      },
    })
    sectionData: Omit<Section, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Section> {
    // Verify the page exists
    const page = await this.pageRepository.findById(sectionData.pageId);
    if (!page) {
      throw new HttpErrors.BadRequest(
        `Page with id "${sectionData.pageId}" not found`,
      );
    }

    // If order is not provided, get the next available order
    let order = sectionData.order;
    if (order === undefined || order === null) {
      order = await this.sectionRepository.getNextOrder(sectionData.pageId);
    }

    const now = new Date();
    const newSection = new Section({
      id: uuidv4(),
      ...sectionData,
      order,
      enabled: sectionData.enabled !== undefined ? sectionData.enabled : true,
      createdAt: now,
      updatedAt: now,
    });

    const createdSection = await this.sectionRepository.create(newSection);

    // Invalidate page cache
    await this.cacheService.invalidatePage(page.id, page.slug);

    return createdSection;
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin', 'editor']})
  @patch('/api/cms/sections/{id}')
  @response(200, {
    description: 'Section model instance updated',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Section),
      },
    },
  })
  async updateById(
    @inject(AuthenticationBindings.CURRENT_USER) currentUser: UserProfile,
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: [
                  'premium-hero',
                  'premium-product-showcase',
                  'premium-fabric-details',
                  'premium-statement',
                  'premium-feature-grid',
                  'premium-confidence',
                  'premium-reserve-cta',
                  'premium-countdown',
                  'hero',
                  'scroll-animated',
                  'new-arrivals',
                  'collection-hero',
                  'best-sellers',
                  'fabric-info',
                  'social-media',
                  'features',
                  'testimonials',
                  'gallery',
                  'cta',
                  'text',
                  'video',
                  'faq',
                  'team',
                  'pricing',
                  'contact',
                  'custom',
                ],
              },
              name: {type: 'string', minLength: 1, maxLength: 255},
              order: {type: 'number'},
              enabled: {type: 'boolean'},
              content: {type: 'object'},
              settings: {type: 'object'},
            },
          },
        },
      },
    })
    sectionData: Partial<Section>,
  ): Promise<Section> {
    const existingSection = await this.sectionRepository.findById(id);
    if (!existingSection) {
      throw new HttpErrors.NotFound(`Section with id "${id}" not found`);
    }

    const now = new Date();
    await this.sectionRepository.updateById(id, {
      ...sectionData,
      updatedAt: now,
    });

    // Invalidate page cache
    const page = await this.pageRepository.findById(existingSection.pageId);
    if (page) {
      await this.cacheService.invalidatePage(page.id, page.slug);
    }

    return this.sectionRepository.findById(id);
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin', 'editor']})
  @del('/api/cms/sections/{id}')
  @response(204, {
    description: 'Section DELETE success',
  })
  async deleteById(
    @inject(AuthenticationBindings.CURRENT_USER) currentUser: UserProfile,
    @param.path.string('id') id: string,
  ): Promise<void> {
    const existingSection = await this.sectionRepository.findById(id);
    if (!existingSection) {
      throw new HttpErrors.NotFound(`Section with id "${id}" not found`);
    }

    await this.sectionRepository.deleteById(id);

    // Invalidate page cache
    const page = await this.pageRepository.findById(existingSection.pageId);
    if (page) {
      await this.cacheService.invalidatePage(page.id, page.slug);
    }
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin', 'editor']})
  @patch('/api/cms/sections/reorder')
  @response(200, {
    description: 'Sections reordered successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: {type: 'boolean'},
            message: {type: 'string'},
            updated: {type: 'number'},
          },
        },
      },
    },
  })
  async reorder(
    @inject(AuthenticationBindings.CURRENT_USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['pageId', 'sectionIds'],
            properties: {
              pageId: {type: 'string'},
              sectionIds: {
                type: 'array',
                items: {type: 'string'},
              },
            },
          },
        },
      },
    })
    body: {pageId: string; sectionIds: string[]},
  ): Promise<{success: boolean; message: string; updated: number}> {
    // Verify the page exists
    const page = await this.pageRepository.findById(body.pageId);
    if (!page) {
      throw new HttpErrors.BadRequest(
        `Page with id "${body.pageId}" not found`,
      );
    }

    try {
      const updated = await this.sectionRepository.reorderSections(
        body.pageId,
        body.sectionIds,
      );

      // Invalidate page cache
      await this.cacheService.invalidatePage(page.id, page.slug);

      return {
        success: true,
        message: `Successfully reordered ${updated} sections`,
        updated,
      };
    } catch (error) {
      throw new HttpErrors.BadRequest(
        error instanceof Error ? error.message : 'Failed to reorder sections',
      );
    }
  }
}

