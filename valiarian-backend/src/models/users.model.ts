import {belongsTo, Entity, hasMany, model, property} from '@loopback/repository';
import {Media} from './media.model';
import {Roles} from './roles.model';
import {UserRoles} from './user-roles.model';

@model({
  settings: {
    postgresql: {
      table: 'users',
      schema: 'public',
    },
    indexes: {
      uniqueEmail: {
        keys: {email: 1},
        options: {unique: true},
      },
      uniquePhone: {
        keys: {phone: 1},
        options: {unique: true},
      },
    },
  },
})

export class Users extends Entity {
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
    type: 'string'
  })
  fullName?: string;

  @property({
    type: 'string',
  })
  email?: string;

  @property({
    type: 'string',
  })
  phone?: string;

  @property({
    type: 'string',
  })
  password?: string;

  @property({
    type: 'boolean',
    default: false,
  })
  isEmailVerified?: boolean;

  @property({
    type: 'boolean',
    default: false,
  })
  isMobileVerified?: boolean;

  @property({
    type: 'array',
    itemType: 'string',
    default: [],
  })
  passwordHistory?: string[];

  @property({
    type: 'number',
    default: 0,
  })
  failedLoginAttempts?: number;

  @property({
    type: 'date',
  })
  lockedUntil?: Date;

  @property({
    type: 'date',
  })
  lastLoginAt?: Date;

  @property({
    type: 'date',
  })
  passwordChangedAt?: Date;

  @property({
    type: 'boolean',
    default: true,
  })
  isActive?: boolean;

  @property({
    type: 'boolean',
    default: false,
  })
  isDeleted?: boolean;

  @property({
    type: 'date',
    defaultFn: 'now',
  })
  createdAt?: Date;

  @property({
    type: 'date',
    defaultFn: 'now',
  })
  updatedAt?: Date;

  @property({
    type: 'date',
  })
  deletedAt?: Date;

  @property({
    type: 'string',
  })
  googleId?: string;

  @belongsTo(() => Media, {name: 'avatar'})
  avatarId?: string;

  @property({
    type: 'string',
  })
  profilePicture?: string;

  @property({
    type: 'string',
    default: 'local',
  })
  authProvider?: string;

  @hasMany(() => Roles, {through: {model: () => UserRoles}})
  roles: Roles[];

  constructor(data?: Partial<Users>) {
    super(data);
  }
}

export interface UsersRelations {
  avatar?: Media;
}

export type UsersWithRelations = Users & UsersRelations;
