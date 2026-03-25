import {
  authenticate,
} from '@loopback/authentication';
import {AuthenticationBindings} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {
  CountSchema,
  repository,
  WhereBuilder,
} from '@loopback/repository';
import {
  get,
  getModelSchemaRef,
  HttpErrors,
  param,
  patch,
  post,
  requestBody,
  Request,
  response,
  RestBindings,
} from '@loopback/rest';
import {UserProfile} from '@loopback/security';
import {authorize} from '../authorization';
import {ContactSubmission} from '../models';
import {ContactSubmissionRepository} from '../repositories';
import {EmailService} from '../services/email.service';

const CONTACT_SUBMISSION_STATUSES = [
  'new',
  'in_progress',
  'resolved',
  'spam',
] as const;

export class ContactSubmissionController {
  constructor(
    @repository(ContactSubmissionRepository)
    public contactSubmissionRepository: ContactSubmissionRepository,
    @inject('services.email')
    public emailService: EmailService,
  ) {}

  private normalizeContactTokenId(token?: string): string {
    return `${token || ''}`.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  }

  private generateContactTokenId(): string {
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
    return this.normalizeContactTokenId(`CT${timestamp}${randomPart}`);
  }

  private async ensureContactTokenIds(): Promise<void> {
    const submissions = await this.contactSubmissionRepository.find({
      where: {
        isDeleted: false,
      },
      fields: {id: true, contactTokenId: true},
      limit: 500,
    });

    await Promise.all(
      submissions
        .filter((submission) => {
          const normalizedToken = this.normalizeContactTokenId(submission.contactTokenId);
          return !normalizedToken || normalizedToken !== submission.contactTokenId;
        })
        .map((submission) => {
          const normalizedToken = this.normalizeContactTokenId(submission.contactTokenId);

          return this.contactSubmissionRepository.updateById(submission.id, {
            contactTokenId: normalizedToken || this.generateContactTokenId(),
          });
        }),
    );
  }

  @post('/api/public/contact-submissions')
  @response(200, {
    description: 'Contact submission created',
    content: {
      'application/json': {
        schema: getModelSchemaRef(ContactSubmission, {
          exclude: ['adminNotes', 'ipAddress', 'userAgent'],
        }),
      },
    },
  })
  async create(
    @inject(RestBindings.Http.REQUEST) request: Request,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['name', 'email', 'subject', 'message'],
            properties: {
              name: {type: 'string', minLength: 2, maxLength: 100},
              email: {type: 'string', format: 'email', maxLength: 150},
              phoneNumber: {type: 'string', maxLength: 50},
              issueType: {type: 'string', maxLength: 100},
              customIssueType: {type: 'string', maxLength: 150},
              subject: {type: 'string', minLength: 2, maxLength: 150},
              message: {type: 'string', minLength: 10, maxLength: 5000},
              sourcePage: {type: 'string', maxLength: 200},
            },
          },
        },
      },
    })
    payload: Partial<ContactSubmission>,
  ): Promise<ContactSubmission> {
    const customIssueType = payload.customIssueType?.trim();

    if (payload.issueType === 'other' && !customIssueType) {
      throw new HttpErrors.UnprocessableEntity(
        'Custom issue type is required when issue type is Other',
      );
    }

    if (payload.issueType === 'other' && (customIssueType?.length || 0) < 2) {
      throw new HttpErrors.UnprocessableEntity(
        'Custom issue type must be at least 2 characters',
      );
    }

    return this.contactSubmissionRepository.create({
      ...payload,
      customIssueType: payload.issueType === 'other' ? customIssueType : undefined,
      contactTokenId: this.generateContactTokenId(),
      status: 'new',
      isRead: false,
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    });
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  @get('/api/cms/contact-submissions')
  @response(200, {
    description: 'List contact submissions',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: getModelSchemaRef(ContactSubmission),
            },
            total: CountSchema,
            page: {type: 'number'},
            limit: {type: 'number'},
          },
        },
      },
    },
  })
  async find(
    @param.query.number('page') page = 1,
    @param.query.number('limit') limit = 10,
    @param.query.string('status') status?: string,
    @param.query.string('search') search?: string,
  ): Promise<{
    data: ContactSubmission[];
    total: number;
    page: number;
    limit: number;
  }> {
    await this.ensureContactTokenIds();

    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safeLimit =
      Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 10;

    const whereBuilder = new WhereBuilder<ContactSubmission>({
      isDeleted: false,
    });

    if (
      status &&
      status !== 'all' &&
      CONTACT_SUBMISSION_STATUSES.includes(
        status as (typeof CONTACT_SUBMISSION_STATUSES)[number],
      )
    ) {
      whereBuilder.impose({
        status: status as (typeof CONTACT_SUBMISSION_STATUSES)[number],
      });
    }

    if (search?.trim()) {
      const query = search.trim();
      whereBuilder.and({
        or: [
          {name: {ilike: `%${query}%`}},
          {email: {ilike: `%${query}%`}},
          {phoneNumber: {ilike: `%${query}%`}},
          {contactTokenId: {ilike: `%${query}%`}},
          {issueType: {ilike: `%${query}%`}},
          {customIssueType: {ilike: `%${query}%`}},
          {subject: {ilike: `%${query}%`}},
          {message: {ilike: `%${query}%`}},
        ],
      });
    }

    const where = whereBuilder.build();
    const total = await this.contactSubmissionRepository.count(where);
    const data = await this.contactSubmissionRepository.find({
      where,
      order: ['createdAt DESC'],
      limit: safeLimit,
      skip: (safePage - 1) * safeLimit,
    });

    return {
      data,
      total: total.count,
      page: safePage,
      limit: safeLimit,
    };
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  @get('/api/cms/contact-submissions/{id}')
  @response(200, {
    description: 'Contact submission details',
    content: {
      'application/json': {
        schema: getModelSchemaRef(ContactSubmission),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
  ): Promise<ContactSubmission> {
    const submission = await this.contactSubmissionRepository.findById(id);
    const normalizedToken = this.normalizeContactTokenId(submission.contactTokenId);

    if (!normalizedToken || normalizedToken !== submission.contactTokenId) {
      const contactTokenId = normalizedToken || this.generateContactTokenId();
      await this.contactSubmissionRepository.updateById(id, {contactTokenId});
      submission.contactTokenId = contactTokenId;
    }

    return submission;
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  @patch('/api/cms/contact-submissions/{id}')
  @response(200, {
    description: 'Contact submission updated',
    content: {
      'application/json': {
        schema: getModelSchemaRef(ContactSubmission),
      },
    },
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                enum: ['new', 'in_progress', 'resolved', 'spam'],
              },
              isRead: {type: 'boolean'},
              adminNotes: {type: 'string'},
            },
          },
        },
      },
    })
    payload: Partial<ContactSubmission>,
  ): Promise<ContactSubmission> {
    const existing = await this.contactSubmissionRepository.findById(id);

    if (!existing) {
      throw new HttpErrors.NotFound('Contact submission not found');
    }

    await this.contactSubmissionRepository.updateById(id, {
      ...payload,
      adminNotes:
        payload.adminNotes !== undefined
          ? `${payload.adminNotes}`
          : existing.adminNotes,
      isRead: payload.isRead ?? true,
    });

    return this.contactSubmissionRepository.findById(id);
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  @post('/api/cms/contact-submissions/{id}/reply')
  @response(200, {
    description: 'Contact submission replied successfully',
    content: {
      'application/json': {
        schema: getModelSchemaRef(ContactSubmission),
      },
    },
  })
  async replyToSubmission(
    @param.path.string('id') id: string,
    @inject(AuthenticationBindings.CURRENT_USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['subject', 'message'],
            properties: {
              subject: {type: 'string', minLength: 2, maxLength: 200},
              message: {type: 'string', minLength: 2, maxLength: 10000},
            },
          },
        },
      },
    })
    payload: {
      subject: string;
      message: string;
    },
  ): Promise<ContactSubmission> {
    const existing = await this.contactSubmissionRepository.findById(id);

    if (!existing) {
      throw new HttpErrors.NotFound('Contact submission not found');
    }

    if (!existing.email?.trim()) {
      throw new HttpErrors.UnprocessableEntity(
        'Customer email is missing for this contact submission',
      );
    }

    const subject = payload.subject?.trim();
    const message = payload.message?.trim();

    if (!subject || !message) {
      throw new HttpErrors.UnprocessableEntity('Reply subject and message are required');
    }

    const contactTokenId = existing.contactTokenId || this.generateContactTokenId();

    await this.emailService.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: existing.email.trim(),
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <p>Hi ${existing.name || 'Customer'},</p>
          <div>${payload.message}</div>
          <p style="margin-top: 24px;">Reference Token: <strong>${contactTokenId}</strong></p>
        </div>
      `,
    });

    await this.contactSubmissionRepository.updateById(id, {
      contactTokenId,
      replySubject: subject,
      replyMessage: payload.message,
      repliedByEmail:
        ((currentUser as Record<string, unknown>)?.email as string | undefined) ||
        currentUser.name ||
        '',
      repliedAt: new Date(),
      isRead: true,
      status: existing.status === 'new' ? 'in_progress' : existing.status,
    });

    return this.contactSubmissionRepository.findById(id);
  }
}
