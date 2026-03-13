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

  @property({
    type: 'boolean',
    default: true,
    postgresql: {
      columnName: 'is_active',
      dataType: 'boolean',
    },
  })
  isActive?: boolean;

  @property({
    type: 'date',
    default: () => new Date(),
    postgresql: {
      columnName: 'created_at',
      dataType: 'timestamp with time zone',
    },
  })
  createdAt?: Date;

  @property({
    type: 'date',
    default: () => new Date(),
    postgresql: {
      columnName: 'updated_at',
      dataType: 'timestamp with time zone',
    },
  })
  updatedAt?: Date;

  @hasMany(() => CartItems, {keyTo: 'cartId'})
  cartItems: CartItems[];

  constructor(data?: Partial<Carts>) {
    super(data);
  }
}

export interface CartsRelations {
  cartItems?: CartItems[];
}

export type CartsWithRelations = Carts & CartsRelations;
