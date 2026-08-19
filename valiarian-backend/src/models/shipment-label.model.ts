import {Entity, model, property} from '@loopback/repository';

@model({
  settings: {
    postgresql: {schema: 'public', table: 'shipment_labels'},
    indexes: {
      shipmentLabelsShipmentIdx: {keys: {shipmentId: 1}},
    },
  },
})
export class ShipmentLabel extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: false,
    defaultFn: 'uuidv4',
    postgresql: {dataType: 'uuid'},
  })
  id: string;

  @property({
    type: 'string',
    required: true,
    postgresql: {columnName: 'shipmentid', dataType: 'uuid'},
  })
  shipmentId: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {enum: ['awb_label', 'manifest']},
    postgresql: {columnName: 'labeltype'},
  })
  labelType: 'awb_label' | 'manifest';

  @property({
    type: 'string',
    required: true,
    postgresql: {columnName: 'fileurl'},
  })
  fileUrl: string; // Path or S3 URL to PDF

  @property({
    type: 'date',
    defaultFn: 'now',
    postgresql: {columnName: 'generatedat'},
  })
  generatedAt: Date;

  @property({
    type: 'string',
    postgresql: {columnName: 'generatedby'},
  })
  generatedBy?: string; // Admin user ID

  constructor(data?: Partial<ShipmentLabel>) {
    super(data);
  }
}

export interface ShipmentLabelRelations {}
export type ShipmentLabelWithRelations = ShipmentLabel & ShipmentLabelRelations;
