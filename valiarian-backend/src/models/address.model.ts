import {belongsTo, Entity, model, property} from '@loopback/repository';
import {Users} from './users.model';

@model({
  settings: {
    postgresql: {schema: 'public', table: 'addresses'},
    indexes: {
      addressUserIdIdx: {
        keys: {userId: 1},
      },
      addressUserPrimaryIdx: {
        keys: {userId: 1, isPrimary: 1},
      },
    },
  },
})
export class Address extends Entity {
  @property({
    type: 'string',
    id: true,
    defaultFn: 'uuidv4',
    postgresql: {dataType: 'uuid'},
  })
  id?: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      minLength: 1,
      maxLength: 100,
    },
  })
  fullName: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      pattern: '^[0-9]{10}$',
    },
  })
  mobileNumber: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      pattern: '^[0-9]{6}$',
    },
  })
  pincode: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      minLength: 1,
      maxLength: 100,
    },
  })
  state: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      minLength: 1,
      maxLength: 100,
    },
  })
  city: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      minLength: 1,
      maxLength: 255,
    },
  })
  addressLine1: string;

  @property({
    type: 'string',
  })
  addressLine2?: string;

  @property({
    type: 'string',
  })
  landmark?: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      enum: ['home', 'work'],
    },
  })
  addressType: 'home' | 'work';

  @property({
    type: 'boolean',
    default: false,
  })
  isPrimary?: boolean;

  @belongsTo(() => Users, {name: 'user'})
  userId: string;

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

  constructor(data?: Partial<Address>) {
    super(data);
  }
}

export interface AddressRelations {
  // describe navigational properties here
}

export type AddressWithRelations = Address & AddressRelations;
