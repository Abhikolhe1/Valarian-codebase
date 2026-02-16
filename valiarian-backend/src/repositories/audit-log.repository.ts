import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {AuditLog, AuditLogRelations} from '../models';

export class AuditLogRepository extends DefaultCrudRepository<
  AuditLog,
  typeof AuditLog.prototype.id,
  AuditLogRelations
> {
  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
  ) {
    super(AuditLog, dataSource);
  }

  /**
   * Find audit logs by entity
   * @param entityType - Entity type
   * @param entityId - Entity ID
   * @returns Array of audit logs
   */
  async findByEntity(
    entityType: AuditLog['entityType'],
    entityId: string,
  ): Promise<AuditLog[]> {
    return this.find({
      where: {entityType, entityId},
      order: ['createdAt DESC'],
    });
  }

  /**
   * Find audit logs by user
   * @param userId - User ID
   * @param limit - Maximum number of logs to return
   * @returns Array of audit logs
   */
  async findByUser(userId: string, limit: number = 100): Promise<AuditLog[]> {
    return this.find({
      where: {userId},
      order: ['createdAt DESC'],
      limit,
    });
  }

  /**
   * Find recent audit logs
   * @param limit - Maximum number of logs to return
   * @returns Array of audit logs
   */
  async findRecent(limit: number = 100): Promise<AuditLog[]> {
    return this.find({
      order: ['createdAt DESC'],
      limit,
    });
  }
}
