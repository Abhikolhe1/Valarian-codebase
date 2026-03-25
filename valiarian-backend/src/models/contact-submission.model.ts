import {Entity, model, property} from '@loopback/repository';

@model({
  settings: {
    postgresql: {
      schema: 'cms',
      table: 'contact_submissions',
    },
    indexes: {
      contactSubmissionsCreatedAtIdx: {
        keys: {createdAt: -1},
      },
      contactSubmissionsStatusIdx: {
        keys: {status: 1},
      },
      contactSubmissionsEmailIdx: {
        keys: {email: 1},
      },
    },
  },
})
export class ContactSubmission extends Entity {
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
    required: true,
  })
  name: string;

  @property({
    type: 'string',
    required: true,
  })
  email: string;


@property({
  type: 'string',
  required: false,
  default: 'general',
})
issueType?: string;

  @property({
    type: 'string',
    postgresql: {
      columnName: 'custom_issue_type',
    },
  })
  customIssueType?: string;

  @property({
    type: 'string',
    postgresql: {
      columnName: 'contact_token_id',
    },
  })
  contactTokenId?: string;

  @property({
    type: 'string',
  })
  phoneNumber?: string;

  @property({
    type: 'string',
    required: true,
  })
  subject: string;

  @property({
    type: 'string',
    required: true,
  })
  message: string;

  @property({
    type: 'string',
    required: true,
    default: 'new',
    jsonSchema: {
      enum: ['new', 'in_progress', 'resolved', 'spam'],
    },
  })
  status: 'new' | 'in_progress' | 'resolved' | 'spam';

  @property({
    type: 'boolean',
    default: false,
  })
  isRead?: boolean;

  @property({
    type: 'string',
  })
  sourcePage?: string;

  @property({
    type: 'string',
  })
  adminNotes?: string;

  @property({
    type: 'string',
    postgresql: {
      columnName: 'reply_subject',
    },
  })
  replySubject?: string;

  @property({
    type: 'string',
    postgresql: {
      columnName: 'reply_message',
    },
  })
  replyMessage?: string;

  @property({
    type: 'string',
    postgresql: {
      columnName: 'replied_by_email',
    },
  })
  repliedByEmail?: string;

  @property({
    type: 'date',
    postgresql: {
      columnName: 'replied_at',
    },
  })
  repliedAt?: Date;

  @property({
    type: 'string',
  })
  ipAddress?: string;

  @property({
    type: 'string',
  })
  userAgent?: string;

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

  constructor(data?: Partial<ContactSubmission>) {
    super(data);
  }
}

export interface ContactSubmissionRelations {
  // No relations defined yet
}

export type ContactSubmissionWithRelations =
  ContactSubmission & ContactSubmissionRelations;
