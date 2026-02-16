import {authenticate, AuthenticationBindings} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {Filter, repository} from '@loopback/repository';
import {
  get,
  getModelSchemaRef,
  HttpErrors,
  param,
  post,
  requestBody,
  response,
} from '@loopback/rest';
import {UserProfile} from '@loopback/security';
import {v4 as uuidv4} from 'uuid';
import {authorize} from '../authorization';
import {SectionTemplate} from '../models';
import {SectionTemplateRepository} from '../repositories';

export class CMSTemplateController {
  constructor(
    @repository(SectionTemplateRepository)
    public sectionTemplateRepository: SectionTemplateRepository,
  ) { }

  @get('/api/cms/templates')
  @response(200, {
    description: 'Array of SectionTemplate model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(SectionTemplate),
        },
      },
    },
  })
  async find(
    @param.filter(SectionTemplate) filter?: Filter<SectionTemplate>,
    @param.query.string('type') type?: string,
    @param.query.boolean('grouped') grouped: boolean = false,
  ): Promise<SectionTemplate[] | {[key: string]: SectionTemplate[]}> {
    // If type is provided, filter by type
    if (type) {
      return this.sectionTemplateRepository.findByType(
        type as SectionTemplate['type'],
      );
    }

    // If grouped is requested, return templates grouped by type
    if (grouped) {
      return this.sectionTemplateRepository.findGroupedByType();
    }

    // Default: return all templates
    return this.sectionTemplateRepository.find({
      ...filter,
      order: filter?.order || ['type ASC', 'name ASC'],
    });
  }

  @get('/api/cms/templates/{id}')
  @response(200, {
    description: 'SectionTemplate model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(SectionTemplate),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
  ): Promise<SectionTemplate> {
    const template = await this.sectionTemplateRepository.findById(id);
    if (!template) {
      throw new HttpErrors.NotFound(
        `Template with id "${id}" not found`,
      );
    }
    return template;
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  @post('/api/cms/templates')
  @response(201, {
    description: 'SectionTemplate model instance created',
    content: {
      'application/json': {
        schema: getModelSchemaRef(SectionTemplate),
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
            required: ['name', 'type', 'defaultContent'],
            properties: {
              name: {type: 'string', minLength: 1, maxLength: 255},
              type: {
                type: 'string',
                enum: [
                  'hero',
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
              description: {type: 'string'},
              thumbnail: {type: 'string'},
              defaultContent: {type: 'object'},
              schema: {type: 'object'},
            },
          },
        },
      },
    })
    templateData: Omit<
      SectionTemplate,
      'id' | 'createdAt' | 'createdBy'
    >,
  ): Promise<SectionTemplate> {
    // Check if template with same name already exists
    const existingTemplate = await this.sectionTemplateRepository.findOne({
      where: {name: templateData.name},
    });

    if (existingTemplate) {
      throw new HttpErrors.BadRequest(
        `Template with name "${templateData.name}" already exists`,
      );
    }

    const now = new Date();
    const newTemplate = new SectionTemplate({
      id: uuidv4(),
      ...templateData,
      createdAt: now,
      createdBy: currentUser.id,
    });

    return this.sectionTemplateRepository.create(newTemplate);
  }
}
