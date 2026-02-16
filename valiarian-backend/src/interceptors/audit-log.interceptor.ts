import {AuthenticationBindings} from '@loopback/authentication';
import {
  Getter,
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  ValueOrPromise,
  globalInterceptor,
  inject,
} from '@loopback/core';
import {Request, RestBindings} from '@loopback/rest';
import {AuditLog} from '../models';
import {AuditService} from '../services/audit.service';
import {CurrentUser} from '../types';

/**
 * Interceptor to automatically log CMS operations
 */
@globalInterceptor('audit', {tags: {name: 'auditLog'}})
export class AuditLogInterceptor implements Provider<Interceptor> {
  constructor(
    @inject('services.audit')
    private auditService: AuditService,
    @inject.getter(AuthenticationBindings.CURRENT_USER)
    private getCurrentUser: Getter<CurrentUser | undefined>,
    @inject(RestBindings.Http.REQUEST, {optional: true})
    private request?: Request,
  ) { }

  value(): Interceptor {
    return this.intercept.bind(this);
  }

  async intercept(
    context: InvocationContext,
    next: () => ValueOrPromise<InvocationResult>,
  ) {
    // Only log CMS controller operations
    const controllerName = context.target?.constructor.name;
    if (!controllerName?.startsWith('CMS')) {
      return next();
    }

    // Get current user
    const currentUser = await this.getCurrentUser();
    if (!currentUser) {
      return next();
    }

    // Execute the method
    const result = await next();

    // Determine action and entity type from method name and controller
    const methodName = context.methodName;
    const auditInfo = this.getAuditInfo(
      controllerName,
      methodName,
      context.args,
      result,
    );

    if (auditInfo) {
      try {
        await this.auditService.log({
          userId: currentUser.id,
          userEmail: currentUser.email,
          action: auditInfo.action,
          entityType: auditInfo.entityType,
          entityId: auditInfo.entityId,
          entityName: auditInfo.entityName,
          changes: auditInfo.changes,
          metadata: auditInfo.metadata,
          request: this.request,
        });
      } catch (error) {
        // Log error but don't fail the request
        console.error('Failed to create audit log:', error);
      }
    }

    return result;
  }

  /**
   * Extract audit information from controller method
   */
  private getAuditInfo(
    controllerName: string,
    methodName: string,
    args: any[],
    result: any,
  ): {
    action: AuditLog['action'];
    entityType: AuditLog['entityType'];
    entityId: string;
    entityName?: string;
    changes?: object;
    metadata?: object;
  } | null {
    // Determine entity type from controller name
    const entityType = this.getEntityType(controllerName);
    if (!entityType) return null;

    // Determine action from method name
    const action = this.getAction(methodName);
    if (!action) return null;

    // Extract entity ID and other info
    let entityId: string | undefined;
    let entityName: string | undefined;
    let changes: object | undefined;
    let metadata: object | undefined;

    // Handle different method patterns
    if (methodName === 'create' && result?.id) {
      entityId = result.id;
      entityName = result.title || result.name || result.slug;
      changes = {created: result};
    } else if (
      (methodName === 'updateById' || methodName === 'update') &&
      args[0]
    ) {
      entityId = args[0];
      entityName = result?.title || result?.name || result?.slug;
      changes = {
        before: args[1], // Old data might not be available
        after: result,
      };
    } else if (methodName === 'deleteById' && args[0]) {
      entityId = args[0];
    } else if (methodName === 'publish' && args[0]) {
      entityId = args[0];
      entityName = result?.title || result?.name;
    } else if (methodName === 'duplicate' && result?.id) {
      entityId = result.id;
      entityName = result.title || result.name;
      metadata = {originalId: args[0]};
    } else if (methodName === 'revertToVersion' && args[0]) {
      entityId = args[0];
      metadata = {versionNumber: args[1]};
    } else if (methodName === 'reorder' && args[0]) {
      entityId = 'bulk';
      metadata = {sections: args[0]};
    } else if (methodName === 'bulkDelete' && args[0]) {
      entityId = 'bulk';
      metadata = {entityIds: args[0], count: args[0]?.length};
    } else if (result?.id) {
      entityId = result.id;
      entityName = result.title || result.name || result.slug;
    }

    if (!entityId) return null;

    return {
      action,
      entityType,
      entityId,
      entityName,
      changes,
      metadata,
    };
  }

  /**
   * Get entity type from controller name
   */
  private getEntityType(
    controllerName: string,
  ): AuditLog['entityType'] | null {
    if (controllerName.includes('Page')) return 'page';
    if (controllerName.includes('Section')) return 'section';
    if (controllerName.includes('Media')) return 'media';
    if (controllerName.includes('Template')) return 'template';
    if (controllerName.includes('Navigation')) return 'navigation';
    if (controllerName.includes('Settings')) return 'settings';
    return null;
  }

  /**
   * Get action from method name
   */
  private getAction(methodName: string): AuditLog['action'] | null {
    if (methodName === 'create') return 'create';
    if (methodName.includes('update') || methodName.includes('Update'))
      return 'update';
    if (methodName.includes('delete') || methodName.includes('Delete'))
      return 'delete';
    if (methodName === 'publish') return 'publish';
    if (methodName === 'unpublish') return 'unpublish';
    if (methodName === 'duplicate') return 'duplicate';
    if (methodName.includes('revert') || methodName.includes('Revert'))
      return 'revert';
    if (methodName === 'reorder') return 'reorder';
    if (methodName === 'upload') return 'upload';
    if (methodName === 'bulkDelete') return 'bulk_delete';
    return null;
  }
}
