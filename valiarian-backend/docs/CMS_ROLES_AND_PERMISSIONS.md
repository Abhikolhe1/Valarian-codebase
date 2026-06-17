# CMS Roles and Permissions

## Overview
This document defines the role-based access control (RBAC) system for the CMS. The system uses a combination of roles and permissions to control access to CMS features and content.

## Roles

### 1. Super Admin (`super_admin`)
- **Description**: Full system access with no restrictions
- **Permissions**: All permissions (bypasses all permission checks)
- **Use Case**: System administrators, developers
- **Access Level**: Complete control over all CMS features, users, and settings

### 2. Admin (`admin`)
- **Description**: Full content management access
- **Permissions**:
  - `cms:pages:create` - Create new pages
  - `cms:pages:read` - View all pages (including drafts)
  - `cms:pages:update` - Edit all pages
  - `cms:pages:delete` - Delete pages
  - `cms:pages:publish` - Publish pages
  - `cms:sections:create` - Create sections
  - `cms:sections:read` - View sections
  - `cms:sections:update` - Edit sections
  - `cms:sections:delete` - Delete sections
  - `cms:media:create` - Upload media
  - `cms:media:read` - View media library
  - `cms:media:update` - Edit media metadata
  - `cms:media:delete` - Delete media
  - `cms:templates:create` - Create section templates
  - `cms:templates:read` - View templates
  - `cms:navigation:read` - View navigation menus
  - `cms:navigation:update` - Edit navigation menus
  - `cms:settings:read` - View site settings
  - `cms:settings:update` - Edit site settings
  - `cms:audit:read` - View audit logs
- **Use Case**: Content managers, marketing team leads
- **Access Level**: Full content management, cannot manage users or system settings

### 3. Editor (`editor`)
- **Description**: Content editing access with limited publishing rights
- **Permissions**:
  - `cms:pages:create` - Create new pages (as drafts)
  - `cms:pages:read` - View all pages
  - `cms:pages:update` - Edit pages (own drafts and published pages)
  - `cms:sections:create` - Create sections
  - `cms:sections:read` - View sections
  - `cms:sections:update` - Edit sections
  - `cms:sections:delete` - Delete sections
  - `cms:media:create` - Upload media
  - `cms:media:read` - View media library
  - `cms:media:update` - Edit media metadata
  - `cms:templates:read` - View templates
  - `cms:navigation:read` - View navigation menus
  - `cms:navigation:update` - Edit navigation menus
  - `cms:settings:read` - View site settings
- **Use Case**: Content creators, copywriters
- **Access Level**: Can create and edit content, cannot publish or delete pages, limited settings access

### 4. Viewer (`viewer`)
- **Description**: Read-only access to CMS content
- **Permissions**:
  - `cms:pages:read` - View all pages
  - `cms:sections:read` - View sections
  - `cms:media:read` - View media library
  - `cms:templates:read` - View templates
  - `cms:navigation:read` - View navigation menus
  - `cms:settings:read` - View site settings
- **Use Case**: Stakeholders, reviewers, clients
- **Access Level**: Read-only access to all content, no editing capabilities

## Permission Matrix

| Permission | Super Admin | Admin | Editor | Viewer |
|-----------|-------------|-------|--------|--------|
| **Pages** |
| cms:pages:create | ✓ | ✓ | ✓ (draft only) | ✗ |
| cms:pages:read | ✓ | ✓ | ✓ | ✓ |
| cms:pages:update | ✓ | ✓ | ✓ (limited) | ✗ |
| cms:pages:delete | ✓ | ✓ | ✗ | ✗ |
| cms:pages:publish | ✓ | ✓ | ✗ | ✗ |
| cms:pages:duplicate | ✓ | ✓ | ✗ | ✗ |
| **Sections** |
| cms:sections:create | ✓ | ✓ | ✓ | ✗ |
| cms:sections:read | ✓ | ✓ | ✓ | ✓ |
| cms:sections:update | ✓ | ✓ | ✓ | ✗ |
| cms:sections:delete | ✓ | ✓ | ✓ | ✗ |
| cms:sections:reorder | ✓ | ✓ | ✓ | ✗ |
| **Media** |
| cms:media:create | ✓ | ✓ | ✓ | ✗ |
| cms:media:read | ✓ | ✓ | ✓ | ✓ |
| cms:media:update | ✓ | ✓ | ✓ | ✗ |
| cms:media:delete | ✓ | ✓ | ✗ | ✗ |
| **Templates** |
| cms:templates:create | ✓ | ✓ | ✗ | ✗ |
| cms:templates:read | ✓ | ✓ | ✓ | ✓ |
| cms:templates:update | ✓ | ✓ | ✗ | ✗ |
| cms:templates:delete | ✓ | ✓ | ✗ | ✗ |
| **Navigation** |
| cms:navigation:read | ✓ | ✓ | ✓ | ✓ |
| cms:navigation:update | ✓ | ✓ | ✓ | ✗ |
| **Settings** |
| cms:settings:read | ✓ | ✓ | ✓ | ✓ |
| cms:settings:update | ✓ | ✓ | ✗ | ✗ |
| **Audit Logs** |
| cms:audit:read | ✓ | ✓ | ✗ | ✗ |
| **Users** |
| cms:users:create | ✓ | ✗ | ✗ | ✗ |
| cms:users:read | ✓ | ✗ | ✗ | ✗ |
| cms:users:update | ✓ | ✗ | ✗ | ✗ |
| cms:users:delete | ✓ | ✗ | ✗ | ✗ |

## Implementation

### Authorization Decorator
Controllers use the `@authorize` decorator to protect endpoints:

```typescript
@authenticate('jwt')
@authorize({roles: ['super_admin', 'admin']})
@post('/api/cms/pages')
async create(...) { }
```

### Authorization Interceptor
The `AuthorizeInterceptor` automatically checks user roles and permissions:
- Super Admin role bypasses all permission checks
- Role-based access: User must have at least one of the required roles
- Permission-based access: User must have at least one of the required permissions

### Current User
The current user object includes:
```typescript
interface CurrentUser {
  id: string;
  email: string;
  phoneNumber: string;
  roles: string[];
  permissions: string[];
}
```

## Database Schema

### Roles Table
- `id` (UUID, PK)
- `label` (string) - Display name
- `value` (string, unique) - Role identifier (e.g., 'admin')
- `description` (text)
- `isActive` (boolean)
- `isDeleted` (boolean)
- `createdAt`, `updatedAt`, `deletedAt` (timestamps)

### Permissions Table
- `id` (UUID, PK)
- `permission` (string, unique) - Permission identifier (e.g., 'cms:pages:create')
- `description` (text)
- `isActive` (boolean)
- `isDeleted` (boolean)
- `createdAt`, `updatedAt`, `deletedAt` (timestamps)

### Role_Permissions Table (Junction)
- `id` (UUID, PK)
- `rolesId` (UUID, FK)
- `permissionsId` (UUID, FK)
- `isActive` (boolean)
- `isDeleted` (boolean)
- `createdAt`, `updatedAt`, `deletedAt` (timestamps)

## Usage Examples

### Protecting an Endpoint
```typescript
// Only Super Admin and Admin can access
@authenticate('jwt')
@authorize({roles: ['super_admin', 'admin']})
@post('/api/cms/pages')
async create() { }

// Multiple roles allowed
@authenticate('jwt')
@authorize({roles: ['super_admin', 'admin', 'editor']})
@put('/api/cms/pages/:id')
async update() { }

// Permission-based access
@authenticate('jwt')
@authorize({permissions: ['cms:pages:publish']})
@post('/api/cms/pages/:id/publish')
async publish() { }
```

### Checking Permissions in Service Methods
```typescript
async publishPage(pageId: string, currentUser: CurrentUser) {
  // Super admin bypass
  if (currentUser.roles.includes('super_admin')) {
    return this.doPublish(pageId);
  }

  // Check permission
  if (!currentUser.permissions.includes('cms:pages:publish')) {
    throw new HttpErrors.Forbidden('Cannot publish pages');
  }

  return this.doPublish(pageId);
}
```

## Security Considerations

1. **Principle of Least Privilege**: Users should only have the minimum permissions needed for their role
2. **Super Admin Protection**: Super admin role should be assigned sparingly
3. **Permission Granularity**: Permissions are granular to allow fine-tuned access control
4. **Audit Trail**: All CMS operations are logged for security and compliance
5. **Role Hierarchy**: Roles are not hierarchical - each role has explicit permissions

## Future Enhancements

1. **Custom Roles**: Allow creation of custom roles with specific permission sets
2. **Resource-Level Permissions**: Permissions tied to specific pages or content items
3. **Time-Based Access**: Temporary role assignments with expiration
4. **IP Restrictions**: Limit access based on IP address or location
5. **Two-Factor Authentication**: Additional security layer for sensitive operations
