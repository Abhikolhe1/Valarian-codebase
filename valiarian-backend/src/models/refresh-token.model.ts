import {Entity, model, property} from '@loopback/repository';

@model({
  settings: {
    postgresql: {
      table: 'refresh_tokens',
      schema: 'public',
    },
    indexes: {
      userIdIndex: {
        keys: {userId: 1},
      },
      tokenIndex: {
        keys: {token: 1},
      },
    },
  },
})
export class RefreshToken extends Entity {
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
    required: true,
  })
  token: string;

  @property({
    type: 'string',
  })
  deviceInfo?: string;

  @property({
    type: 'string',
  })
  ipAddress?: string;

  @property({
    type: 'date',
    required: true,
  })
  expiresAt: Date;

  @property({
    type: 'boolean',
    default: false,
  })
  isRevoked?: boolean;

  

  

  
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

  constructor(data?: Partial<RefreshToken>) {
    super(data);
  }
}

export interface RefreshTokenRelations {
  // describe navigational properties here
}

export type RefreshTokenWithRelations = RefreshToken & RefreshTokenRelations;
