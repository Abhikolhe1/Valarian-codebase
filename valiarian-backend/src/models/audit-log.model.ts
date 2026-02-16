import {Entity, model, property} from '@loopback/repository';

@model({
  settings: {
    postgresql: {
      schema: 'cms',
      table: 'audit_logs',
    },
    indexes: {
      userIdIdx: {
        keys: {userId: 1},
      },
      entityTypeIdx: {
        keys: {entityType: 1},
      },
      entityIdIdx: {
        keys: {entityId: 1},
      },
      actionIdx: {
        keys: {action: 1},
      },
      createdAtIdx: {
        keys: {createdAt: -1},
      },
    },
  },
})
export class AuditLog extends Entity {
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
    postgresql: {
      dataType: 'uuid',
    },
  })
  userId: string;

  @property({
    type: 'string',
  })
  userEmail?: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      enum: [
        'create',
        'update',
        'delete',
        'publish',
        'unpublish',
        'duplicate',
        'revert',
        'reorder',
        'upload',
        'bulk_delete',
      ],
    },
  })
  action:
    | 'create'
    | 'update'
    | 'delete'
    | 'publish'
    | 'unpublish'
    | 'duplicate'
    | 'revert'
    | 'reorder'
    | 'upload'
    | 'bulk_delete';

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      enum: [
        'page',
        'section',
        'media',
        'template',
        'navigation',
        'settings',
      ],
    },
  })
  entityType:
    | 'page'
    | 'section'
    | 'media'
    | 'template'
    | 'navigation'
    | 'settings';

  @property({
    type: 'string',
    required: true,
  })
  entityId: string;

  @property({
    type: 'string',
  })
  entityName?: string;

  @property({
    type: 'object',
    postgresql: {
      dataType: 'jsonb',
    },
  })
  changes?: object;

  @property({
    type: 'object',
    postgresql: {
      dataType: 'jsonb',
    },
  })
  metadata?: object;

  @property({
    type: 'string',
  })
  ipAddress?: string;

  @property({
    type: 'string',
  })
  userAgent?: string;

  @property({
    type: 'date',
    defaultFn: 'now',
  })
  createdAt?: Date;

  constructor(data?: Partial<AuditLog>) {
    super(data);
  }
}

export interface AuditLogRelations {
  // describe navigational properties here
}

export type AuditLogWithRelations = AuditLog & AuditLogRelations;
