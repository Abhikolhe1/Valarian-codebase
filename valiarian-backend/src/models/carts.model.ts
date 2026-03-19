import {Entity, hasMany, model, property} from '@loopback/repository';
import {CartItems} from './cart-items.model';

@model({
  settings: {
    postgresql: {schema: 'public', table: 'carts'},
  },
})
export class Carts extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: false,
    postgresql: {
      columnName: 'id',
      dataType: 'uuid',
    },
  })
  id?: string;

  @property({
    type: 'string',
    required: true,
    postgresql: {
      columnName: 'user_id',
      dataType: 'uuid',
    },
  })
  userId: string;

  @hasMany(() => CartItems, {keyTo: 'cartId'})
  cartItems: CartItems[];

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

  constructor(data?: Partial<Carts>) {
    super(data);
  }
}

export interface CartsRelations {
  cartItems?: CartItems[];
}

export type CartsWithRelations = Carts & CartsRelations;
