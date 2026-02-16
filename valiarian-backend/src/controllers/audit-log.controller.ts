import {authenticate} from '@loopback/authentication';
import {Filter, repository} from '@loopback/repository';
import {
  get,
  getModelSchemaRef,
  param,
  response,
} from '@loopback/rest';
import {authorize} from '../authorization';
import {AuditLog} from '../models';
import {AuditLogRepository} from '../repositories';

export class AuditLogController {
  constructor(
    @repository(AuditLogRepository)
    public auditLogRepository: AuditLogRepository,
  ) { }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  @get('/api/cms/audit-logs')
  @response(200, {
    description: 'Array of AuditLog model instances',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: getModelSchemaRef(AuditLog),
            },
            total: {type: 'number'},
            page: {type: 'number'},
            pageSize: {type: 'number'},
          },
        },
      },
    },
  })
  async find(
    @param.filter(AuditLog) filter?: Filter<AuditLog>,
    @param.query.string('userId') userId?: string,
    @param.query.string('entityType') entityType?: string,
    @param.query.string('entityId') entityId?: string,
    @param.query.string('action') action?: string,
    @param.query.number('page') page: number = 1,
    @param.query.number('pageSize') pageSize: number = 50,
  ): Promise<{
    data: AuditLog[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const where: any = filter?.where || {};

    // Apply filters
    if (userId) {
      where.userId = userId;
    }
    if (entityType) {
      where.entityType = entityType;
    }
    if (entityId) {
      where.entityId = entityId;
    }
    if (action) {
      where.action = action;
    }

    const skip = (page - 1) * pageSize;
    const limit = pageSize;

    const finalFilter: Filter<AuditLog> = {
      ...filter,
      where,
      skip,
      limit,
      order: filter?.order || ['createdAt DESC'],
    };

    const total = await this.auditLogRepository.count(where);
    const logs = await this.auditLogRepository.find(finalFilter);

    return {
      data: logs,
      total: total.count,
      page,
      pageSize,
    };
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  @get('/api/cms/audit-logs/{id}')
  @response(200, {
    description: 'AuditLog model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(AuditLog),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
  ): Promise<AuditLog> {
    return this.auditLogRepository.findById(id);
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  @get('/api/cms/audit-logs/entity/{entityType}/{entityId}')
  @response(200, {
    description: 'Array of AuditLog model instances for an entity',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(AuditLog),
        },
      },
    },
  })
  async findByEntity(
    @param.path.string('entityType') entityType: string,
    @param.path.string('entityId') entityId: string,
  ): Promise<AuditLog[]> {
    return this.auditLogRepository.findByEntity(
      entityType as AuditLog['entityType'],
      entityId,
    );
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  @get('/api/cms/audit-logs/user/{userId}')
  @response(200, {
    description: 'Array of AuditLog model instances for a user',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(AuditLog),
        },
      },
    },
  })
  async findByUser(
    @param.path.string('userId') userId: string,
    @param.query.number('limit') limit: number = 100,
  ): Promise<AuditLog[]> {
    return this.auditLogRepository.findByUser(userId, limit);
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  @get('/api/cms/audit-logs/recent')
  @response(200, {
    description: 'Array of recent AuditLog model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(AuditLog),
        },
      },
    },
  })
  async findRecent(
    @param.query.number('limit') limit: number = 100,
  ): Promise<AuditLog[]> {
    return this.auditLogRepository.findRecent(limit);
  }
}
