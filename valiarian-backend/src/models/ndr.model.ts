import {Entity, model, property} from '@loopback/repository';

export type NdrStatus =
  | 'pending'
  | 'contacted_customer'
  | 'reattempt_requested'
  | 'return_requested'
  | 'closed';

export type NdrClosureReason =
  | 'delivered'
  | 'rto_initiated'
  | 'manual_close';

/**
 * NDR (Non Delivery Report) Model
 *
 * Created when a courier fails to deliver a shipment.
 * Drives a resolution workflow (contact customer → reattempt or RTO).
 * Auto-escalated to return_requested by NdrFollowUpCronJob after NDR_AUTO_ESCALATION_DAYS.
 *
 * One active NDR per shipment at a time (unique index on shipmentId where status != closed).
 */
@model({
  settings: {
    postgresql: {schema: 'public', table: 'ndrs'},
    indexes: {
      ndrsShipmentIdx: {
        keys: {shipmentId: 1},
        // Note: Enforce one active NDR per shipment at application layer.
        // Unique partial index (status != 'closed') is enforced in the raw migration SQL.
      },
      ndrsStatusIdx: {keys: {ndrStatus: 1}},
      ndrsCreatedAtIdx: {keys: {createdAt: -1}},
      ndrsOrderIdx: {keys: {orderId: 1}},
    },
  },
})
export class Ndr extends Entity {
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
    postgresql: {columnName: 'orderid', dataType: 'uuid'},
  })
  orderId: string; // Denormalized for quick queries without joining through shipments

  // ── NDR Status ──────────────────────────────────────────────────────────────
  @property({
    type: 'string',
    required: true,
    default: 'pending',
    jsonSchema: {
      enum: [
        'pending',
        'contacted_customer',
        'reattempt_requested',
        'return_requested',
        'closed',
      ],
    },
    postgresql: {columnName: 'ndrstatus'},
  })
  ndrStatus: NdrStatus;

  // ── Failure Details ─────────────────────────────────────────────────────────
  @property({type: 'string', postgresql: {columnName: 'failurereason'}})
  failureReason?: string; // e.g. "Customer Not Available"

  @property({type: 'string', postgresql: {columnName: 'courierndrcode'}})
  courierNdrCode?: string; // Raw NDR code from courier (debugging only)

  @property({
    type: 'number',
    default: 1,
    postgresql: {columnName: 'attemptnumber', dataType: 'integer'},
  })
  attemptNumber: number; // Which delivery attempt failed (1st, 2nd, 3rd)

  @property({type: 'date', postgresql: {columnName: 'failedat'}})
  failedAt?: Date;

  // ── Admin Actions ───────────────────────────────────────────────────────────
  @property({type: 'date', postgresql: {columnName: 'contactedat'}})
  contactedAt?: Date;

  @property({type: 'string', postgresql: {columnName: 'customerresponse'}})
  customerResponse?: string;

  @property({type: 'date', postgresql: {columnName: 'reattemptrequestedat'}})
  reattemptRequestedAt?: Date;

  @property({type: 'date', postgresql: {columnName: 'reattemptscheduleddate'}})
  reattemptScheduledDate?: Date;

  // ── Resolution ──────────────────────────────────────────────────────────────
  @property({type: 'date', postgresql: {columnName: 'returnrequestedat'}})
  returnRequestedAt?: Date;

  @property({type: 'date', postgresql: {columnName: 'closedat'}})
  closedAt?: Date;

  @property({
    type: 'string',
    jsonSchema: {enum: ['delivered', 'rto_initiated', 'manual_close']},
    postgresql: {columnName: 'closurereason'},
  })
  closureReason?: NdrClosureReason;

  // ── Auto Escalation ─────────────────────────────────────────────────────────
  @property({type: 'date', postgresql: {columnName: 'escaledat'}})
  escalatedAt?: Date; // When NdrFollowUpCronJob auto-escalated this NDR

  // ── Notes ───────────────────────────────────────────────────────────────────
  @property({type: 'string', postgresql: {columnName: 'adminnotes'}})
  adminNotes?: string;

  // ── Soft Delete ─────────────────────────────────────────────────────────────
  @property({type: 'boolean', default: true, postgresql: {columnName: 'isactive'}})
  isActive: boolean;

  @property({type: 'date', defaultFn: 'now', postgresql: {columnName: 'createdat'}})
  createdAt: Date;

  @property({type: 'date', defaultFn: 'now', postgresql: {columnName: 'updatedat'}})
  updatedAt: Date;

  constructor(data?: Partial<Ndr>) {
    super(data);
  }
}

export interface NdrRelations {}
export type NdrWithRelations = Ndr & NdrRelations;

// ── NDR Transition Matrix ─────────────────────────────────────────────────────
export const NDR_ALLOWED_TRANSITIONS: Record<NdrStatus, NdrStatus[]> = {
  pending: ['contacted_customer', 'return_requested'],
  contacted_customer: ['reattempt_requested', 'return_requested'],
  reattempt_requested: ['pending', 'closed'],   // pending = re-attempt also failed
  return_requested: ['closed'],
  closed: [],
};

export function canNdrTransition(from: NdrStatus, to: NdrStatus): boolean {
  return NDR_ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}
