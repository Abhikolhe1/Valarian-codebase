import {belongsTo, Entity, model, property} from '@loopback/repository';
import {Order} from './order.model';

@model({
  settings: {
    postgresql: {
      schema: 'public',
      table: 'invoices',
    },
    indexes: {
      invoicesOrderIdx: {
        keys: {orderId: 1},
        options: {unique: true},
      },
      invoicesNumberIdx: {
        keys: {invoiceNumber: 1},
        options: {unique: true},
      },
    },
  },
})
export class Invoice extends Entity {
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

  @belongsTo(() => Order, {name: 'order'})
  orderId: string;

  @property({
    type: 'string',
    required: true,
  })
  invoiceNumber: string;

  @property({
    type: 'number',
    required: true,
    jsonSchema: {
      minimum: 0,
    },
    postgresql: {
      dataType: 'decimal',
      precision: 10,
      scale: 2,
    },
  })
  totalAmount: number;

  @property({
    type: 'number',
    default: 0,
    jsonSchema: {
      minimum: 0,
    },
    postgresql: {
      dataType: 'decimal',
      precision: 10,
      scale: 2,
    },
  })
  taxAmount: number;

  @property({
    type: 'string',
  })
  pdfUrl?: string;

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

  constructor(data?: Partial<Invoice>) {
    super(data);
  }
}

export interface InvoiceRelations {
  order?: Order;
}

export type InvoiceWithRelations = Invoice & InvoiceRelations;
