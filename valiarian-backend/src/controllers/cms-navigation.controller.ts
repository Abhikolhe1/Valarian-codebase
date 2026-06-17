import {authenticate, AuthenticationBindings} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {
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
import {v4 as uuid} from 'uuid';
import {authorize} from '../authorization';
import {NavigationMenu} from '../models';
import {NavigationMenuRepository} from '../repositories';

export class CMSNavigationController {
  constructor(
    @repository(NavigationMenuRepository)
    public navigationMenuRepository: NavigationMenuRepository,
  ) { }

  @get('/api/cms/navigation/{location}')
  @response(200, {
    description: 'NavigationMenu model instance by location',
    content: {
      'application/json': {
        schema: getModelSchemaRef(NavigationMenu),
      },
    },
  })
  async findByLocation(
    @param.path.string('location') location: string,
  ): Promise<NavigationMenu> {
    // Validate location
    const validLocations = ['header', 'footer', 'sidebar', 'mobile'];
    if (!validLocations.includes(location)) {
      throw new HttpErrors.BadRequest(
        `Invalid location. Must be one of: ${validLocations.join(', ')}`,
      );
    }

    const menu = await this.navigationMenuRepository.findByLocation(
      location as NavigationMenu['location'],
    );

    if (!menu) {
      throw new HttpErrors.NotFound(
        `Navigation menu for location "${location}" not found`,
      );
    }

    return menu;
  }

  @get('/api/cms/navigation')
  @response(200, {
    description: 'Array of all enabled NavigationMenu instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(NavigationMenu),
        },
      },
    },
  })
  async findAll(): Promise<NavigationMenu[]> {
    return this.navigationMenuRepository.findEnabled();
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin', 'editor']})
  @post('/api/cms/navigation')
  @response(201, {
    description: 'NavigationMenu model instance created',
    content: {
      'application/json': {
        schema: getModelSchemaRef(NavigationMenu),
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
            required: ['name', 'location'],
            properties: {
              name: {type: 'string'},
              location: {
                type: 'string',
                enum: ['header', 'footer', 'sidebar', 'mobile'],
              },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    label: {type: 'string'},
                    url: {type: 'string'},
                    icon: {type: 'string'},
                    order: {type: 'number'},
                    parentId: {type: 'string'},
                    openInNewTab: {type: 'boolean'},
                    children: {type: 'array'},
                  },
                },
              },
              enabled: {type: 'boolean'},
            },
          },
        },
      },
    })
    menuData: Omit<NavigationMenu, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<NavigationMenu> {
    // Check if a menu already exists for this location
    const existingMenu = await this.navigationMenuRepository.findByLocation(
      menuData.location,
    );
    if (existingMenu) {
      throw new HttpErrors.BadRequest(
        `A navigation menu already exists for location "${menuData.location}"`,
      );
    }

    const now = new Date();
    const newMenu = await this.navigationMenuRepository.create({
      id: uuid(),
      ...menuData,
      enabled: menuData.enabled ?? true,
      items: menuData.items || [],
      createdAt: now,
      updatedAt: now,
    });

    return newMenu;
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin', 'editor']})
  @patch('/api/cms/navigation/{id}')
  @response(200, {
    description: 'NavigationMenu model instance updated',
    content: {
      'application/json': {
        schema: getModelSchemaRef(NavigationMenu),
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
              name: {type: 'string'},
              location: {
                type: 'string',
                enum: ['header', 'footer', 'sidebar', 'mobile'],
              },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    label: {type: 'string'},
                    url: {type: 'string'},
                    icon: {type: 'string'},
                    order: {type: 'number'},
                    parentId: {type: 'string'},
                    openInNewTab: {type: 'boolean'},
                    children: {type: 'array'},
                  },
                },
              },
              enabled: {type: 'boolean'},
            },
          },
        },
      },
    })
    menuData: Partial<NavigationMenu>,
  ): Promise<NavigationMenu> {
    const existingMenu = await this.navigationMenuRepository.findById(id);
    if (!existingMenu) {
      throw new HttpErrors.NotFound(
        `Navigation menu with id "${id}" not found`,
      );
    }

    // If location is being changed, check if another menu already exists for that location
    if (menuData.location && menuData.location !== existingMenu.location) {
      const existingLocationMenu =
        await this.navigationMenuRepository.findByLocation(menuData.location);
      if (existingLocationMenu && existingLocationMenu.id !== id) {
        throw new HttpErrors.BadRequest(
          `A navigation menu already exists for location "${menuData.location}"`,
        );
      }
    }

    const now = new Date();
    await this.navigationMenuRepository.updateById(id, {
      ...menuData,
      updatedAt: now,
    });

    return this.navigationMenuRepository.findById(id);
  }
}
