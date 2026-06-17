import {belongsTo, Entity, model, property} from '@loopback/repository';
import {Product} from './product.model';
import {Users} from './users.model';

@model({
  settings: {
    postgresql: {
      schema: 'public',
      table: 'reviews',
    },
    indexes: {
      reviewsProductIdx: {
        keys: {productId: 1},
      },
      reviewsUserIdx: {
        keys: {userId: 1},
      },
      reviewsHiddenIdx: {
        keys: {isHidden: 1},
      },
      reviewsUserProductUniqueIdx: {
        keys: {userId: 1, productId: 1},
        options: {unique: true},
      },
    },
  },
})
export class Review extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: false,
    defaultFn: 'uuidv4',
    postgresql: {
      dataType: 'uuid',
    },
  })
  id: string;

  @belongsTo(() => Product, {name: 'product'})
  productId: string;

  @belongsTo(() => Users, {name: 'user'})
  userId: string;

  @property({
    type: 'number',
    required: true,
    jsonSchema: {
      minimum: 1,
      maximum: 5,
    },
  })
  rating: number;

  @property({
    type: 'string',
  })
  title?: string;

  @property({
    type: 'string',
    required: true,
  })
  comment: string;

  @property({
    type: 'array',
    itemType: 'string',
    default: [],
    postgresql: {
      dataType: 'jsonb',
    },
  })
  images?: string[];

  @property({
    type: 'boolean',
    default: false,
  })
  isHidden: boolean;

  @property({
    type: 'string',
  })
  hiddenReason?: string;

  @property({
    type: 'boolean',
    default: false,
  })
  isDeleted: boolean;

  @property({
    type: 'boolean',
    default: true,
  })
  isActive: boolean;

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

  constructor(data?: Partial<Review>) {
    super(data);
  }
}

export interface ReviewRelations {
  product?: Product;
  user?: Users;
}

export type ReviewWithRelations = Review & ReviewRelations;
