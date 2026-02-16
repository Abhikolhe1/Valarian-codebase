import {repository} from '@loopback/repository';
import {Request} from '@loopback/rest';
import {v4 as uuidv4} from 'uuid';
import {AuditLog} from '../models';
import {AuditLogRepository} from '../repositories';

export class AuditService {
  constructor(
    @repository(AuditLogRepository)
    public auditLogRepository: AuditLogRepository,
  ) { }

  /**
   * Log an audit event
   * @param params - Audit log parameters
   * @returns Created audit log
   */
  async log(params: {
    userId: string;
    userEmail?: string;
    action: AuditLog['action'];
    entityType: AuditLog['entityType'];
    entityId: string;
    entityName?: string;
    changes?: object;
    metadata?: object;
    request?: Request;
  }): Promise<AuditLog> {
    const auditLog = new AuditLog({
      id: uuidv4(),
      userId: params.userId,
      userEmail: params.userEmail,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      entityName: params.entityName,
      changes: params.changes,
      metadata: params.metadata,
      ipAddress: params.request ? this.getIpAddress(params.request) : undefined,
      userAgent: params.request?.headers['user-agent'],
      createdAt: new Date(),
    });

    return this.auditLogRepository.create(auditLog);
  }

  /**
   * Log a create action
   */
  async logCreate(
    userId: string,
    userEmail: string | undefined,
    entityType: AuditLog['entityType'],
    entityId: string,
    entityName: string | undefined,
    data: object,
    request?: Request,
  ): Promise<AuditLog> {
    return this.log({
      userId,
      userEmail,
      action: 'create',
      entityType,
      entityId,
      entityName,
      changes: {created: data},
      request,
    });
  }

  /**
   * Log an update action
   */
  async logUpdate(
    userId: string,
    userEmail: string | undefined,
    entityType: AuditLog['entityType'],
    entityId: string,
    entityName: string | undefined,
    oldData: object,
    newData: object,
    request?: Request,
  ): Promise<AuditLog> {
    return this.log({
      userId,
      userEmail,
      action: 'update',
      entityType,
      entityId,
      entityName,
      changes: {
        before: oldData,
        after: newData,
      },
      request,
    });
  }

  /**
   * Log a delete action
   */
  async logDelete(
    userId: string,
    userEmail: string | undefined,
    entityType: AuditLog['entityType'],
    entityId: string,
    entityName: string | undefined,
    data: object,
    request?: Request,
  ): Promise<AuditLog> {
    return this.log({
      userId,
      userEmail,
      action: 'delete',
      entityType,
      entityId,
      entityName,
      changes: {deleted: data},
      request,
    });
  }

  /**
   * Log a publish action
   */
  async logPublish(
    userId: string,
    userEmail: string | undefined,
    entityType: AuditLog['entityType'],
    entityId: string,
    entityName: string | undefined,
    metadata?: object,
    request?: Request,
  ): Promise<AuditLog> {
    return this.log({
      userId,
      userEmail,
      action: 'publish',
      entityType,
      entityId,
      entityName,
      metadata,
      request,
    });
  }

  /**
   * Log a duplicate action
   */
  async logDuplicate(
    userId: string,
    userEmail: string | undefined,
    entityType: AuditLog['entityType'],
    originalId: string,
    newId: string,
    entityName: string | undefined,
    request?: Request,
  ): Promise<AuditLog> {
    return this.log({
      userId,
      userEmail,
      action: 'duplicate',
      entityType,
      entityId: newId,
      entityName,
      metadata: {originalId},
      request,
    });
  }

  /**
   * Log a revert action
   */
  async logRevert(
    userId: string,
    userEmail: string | undefined,
    entityType: AuditLog['entityType'],
    entityId: string,
    entityName: string | undefined,
    versionNumber: number,
    request?: Request,
  ): Promise<AuditLog> {
    return this.log({
      userId,
      userEmail,
      action: 'revert',
      entityType,
      entityId,
      entityName,
      metadata: {versionNumber},
      request,
    });
  }

  /**
   * Log a reorder action
   */
  async logReorder(
    userId: string,
    userEmail: string | undefined,
    entityType: AuditLog['entityType'],
    entityId: string,
    oldOrder: number,
    newOrder: number,
    request?: Request,
  ): Promise<AuditLog> {
    return this.log({
      userId,
      userEmail,
      action: 'reorder',
      entityType,
      entityId,
      changes: {
        before: {order: oldOrder},
        after: {order: newOrder},
      },
      request,
    });
  }

  /**
   * Log a bulk delete action
   */
  async logBulkDelete(
    userId: string,
    userEmail: string | undefined,
    entityType: AuditLog['entityType'],
    entityIds: string[],
    request?: Request,
  ): Promise<AuditLog> {
    return this.log({
      userId,
      userEmail,
      action: 'bulk_delete',
      entityType,
      entityId: 'bulk',
      metadata: {entityIds, count: entityIds.length},
      request,
    });
  }

  /**
   * Get audit logs for an entity
   */
  async getEntityLogs(
    entityType: AuditLog['entityType'],
    entityId: string,
  ): Promise<AuditLog[]> {
    return this.auditLogRepository.findByEntity(entityType, entityId);
  }

  /**
   * Get audit logs for a user
   */
  async getUserLogs(userId: string, limit?: number): Promise<AuditLog[]> {
    return this.auditLogRepository.findByUser(userId, limit);
  }

  /**
   * Get recent audit logs
   */
  async getRecentLogs(limit?: number): Promise<AuditLog[]> {
    return this.auditLogRepository.findRecent(limit);
  }

  /**
   * Extract IP address from request
   */
  private getIpAddress(request: Request): string | undefined {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return request.ip || request.connection?.remoteAddress;
  }
}
