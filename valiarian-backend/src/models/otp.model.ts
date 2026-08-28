import {Entity, model, property} from '@loopback/repository';
import {OtpIdentifierType, OtpPurpose} from '../types/otp.types';

@model({
  settings: {
    postgresql: {
      table: 'otp',
      schema: 'public',
    },
  },
})
export class Otp extends Entity {
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
    postgresql: {
      dataType: 'uuid',
    },
  })
  userId?: string;

  @property({
    type: 'number',
    required: true
  })
  type: number; // legacy compatibility: 0 => phone, 1 => email

  @property({type: 'string', required: true})
  identifierType: OtpIdentifierType;

  @property({type: 'string', required: true})
  purpose: OtpPurpose;

  @property({
    type: 'string',
    required: true
  })
  identifier: string;

  @property({
    type: 'number',
    required: true
  })
  attempts: number;

  @property({
    type: 'date',
    required: true
  })
  expiresAt: Date;

  @property({
    type: 'string',
    required: true
  })
  otp: string;

  @property({
    type: 'boolean',
    default: false,
  })
  isUsed?: boolean;

  @property({type: 'date'})
  consumedAt?: Date;

  @property({type: 'string'})
  providerMessageId?: string;

  

  
  
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

  constructor(data?: Partial<Otp>) {
    super(data);
  }
}

export interface OtpRelations {
  // describe navigational properties here
}

export type OtpWithRelations = Otp & OtpRelations;
