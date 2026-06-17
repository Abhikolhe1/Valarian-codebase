import {Entity, model, property} from '@loopback/repository';

export interface MenuItem {
  label: string;
  url: string;
  icon?: string;
  order: number;
  parentId?: string;
  openInNewTab: boolean;
  children?: MenuItem[];
}

@model({
  settings: {
    postgresql: {
      schema: 'cms',
      table: 'navigation_menus',
    },
    indexes: {
      locationIdx: {
        keys: {location: 1},
      },
      enabledIdx: {
        keys: {enabled: 1},
      },
    },
  },
})
export class NavigationMenu extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: false,
    postgresql: {
      dataType: 'uuid',
    },
  })
  id: string;

  @property({
    type: 'string',
    required: true,
  })
  name: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      enum: ['header', 'footer', 'sidebar', 'mobile'],
    },
  })
  location: 'header' | 'footer' | 'sidebar' | 'mobile';

  @property({
    type: 'array',
    itemType: 'object',
    postgresql: {
      dataType: 'jsonb',
    },
  })
  items?: MenuItem[];

  @property({
    type: 'boolean',
    required: true,
    default: true,
  })
  enabled: boolean;

  

  

  
  @property({
    type: 'boolean',
    default: true,
  })
  isActive: boolean;

  @property({
    type: 'boolean',
    default: false,
  })
  isDeleted: boolean;

  @property({
    type: 'date',
    defaultFn: 'now',
  })
  createdAt: Date;

  @property({
    type: 'date',
    defaultFn: 'now',
  })
  updatedAt: Date;

  @property({
    type: 'date',
  })
  deletedAt: Date;

  constructor(data?: Partial<NavigationMenu>) {
    super(data);
  }
}

export interface NavigationMenuRelations {
  // No relations defined yet
}

export type NavigationMenuWithRelations = NavigationMenu & NavigationMenuRelations;
