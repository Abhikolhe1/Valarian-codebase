import {belongsTo, Entity, model, property} from '@loopback/repository';
import {Order} from './order.model';
import {Users} from './users.model';

@model({
  settings: {
    postgresql: {
      schema: 'public',
      table: 'order_status_history',
    },
    indexes: {
      orderStatusHistoryOrderIdIdx: {
        keys: {orderId: 1},
      },
      orderStatusHistoryCreatedAtIdx: {
        keys: {createdAt: -1},
      },
    },
  },
})
export class OrderStatusHistory extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: false,
    postgresql: {
      dataType: 'uuid',
    },
  })
  id: string;

  @belongsTo(() => Order, {name: 'order'})
  orderId: string;

  @property({
    type: 'string',
    required: true,
  })
  status: string;

  @property({
    type: 'string',
  })
  comment?: string;

  @belongsTo(() => Users, {name: 'changedByUser'})
  changedBy: string;

  @property({
    type: 'date',
    defaultFn: 'now',
  })
  createdAt?: Date;

  constructor(data?: Partial<OrderStatusHistory>) {
    super(data);
  }
}

export interface OrderStatusHistoryRelations {
  order?: Order;
  changedByUser?: Users;
}

export type OrderStatusHistoryWithRelations = OrderStatusHistory &
  OrderStatusHistoryRelations;
