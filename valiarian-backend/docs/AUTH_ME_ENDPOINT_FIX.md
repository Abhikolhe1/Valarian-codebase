# Auth /me Endpoint Fix

## Issue
The admin panel was getting a 404 error when trying to access the `/api/auth/me` endpoint:
```json
{
  "error": {
    "statusCode": 404,
    "name": "NotFoundError",
    "message": "Endpoint \"GET /api/auth/me\" not found."
  }
}
```

This was causing the login session to be lost on page refresh.

## Root Cause
The auth endpoints in the `auth.controller.ts` were defined without the `/api` prefix, using paths like `/auth/me` instead of `/api/auth/me`.

## Solution

### 1. Updated Auth Controller Endpoints
All auth endpoints have been updated to include the `/api` prefix:

**Before:**
- `GET /auth/me`
- `POST /auth/super-admin`
- `POST /auth/super-admin-login`
- `POST /auth/update-password`
- `POST /auth/send-phone-otp`
- `POST /auth/verify-phone-otp`
- `POST /auth/send-email-otp`
- `POST /auth/verify-email-otp`
- `POST /auth/forget-password/send-email-otp`
- `POST /auth/forget-password/verify-email-otp`

**After:**
- `GET /api/auth/me` ✅
- `POST /api/auth/super-admin` ✅
- `POST /api/auth/super-admin-login` ✅
- `POST /api/auth/update-password` ✅
- `POST /api/auth/send-phone-otp` ✅
- `POST /api/auth/verify-phone-otp` ✅
- `POST /api/auth/send-email-otp` ✅
- `POST /api/auth/verify-email-otp` ✅
- `POST /api/auth/forget-password/send-email-otp` ✅
- `POST /api/auth/forget-password/verify-email-otp` ✅

### 2. Enhanced /me Endpoint
The `/api/auth/me` endpoint has been improved:

**Changes:**
- Added proper error handling for user not found
- Fixed the `_.omit` syntax (was incorrect: `'password, fullName'`)
- Added call to `rbacService.getUserRolesAndPermissions()` to fetch fresh roles and permissions
- Returns complete user data with roles and permissions

**Response Format:**
```json
{
  "id": "user-id",
  "email": "user@example.com",
  "phone": "+1234567890",
  "fullName": "User Name",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "roles": ["super_admin"],
  "permissions": ["manage_users", "manage_content", ...]
}
```

### 3. Added New RbacService Method
Created `getUserRolesAndPermissions()` method in `rbac.service.ts`:

**Purpose:**
- Fetches all roles and permissions for a user
- Does not require a specific role filter
- Returns unique permissions across all user roles

**Method Signature:**
```typescript
async getUserRolesAndPermissions(
  userId: string,
): Promise<{ roles: string[]; permissions: string[] }>
```

**Logic:**
1. Fetches all user-role mappings
2. Gets role details for all assigned roles
3. Fetches all permissions for those roles
4. Returns unique list of roles and permissions

## Files Modified

### 1. `valiarian-backend/src/controllers/auth.controller.ts`
- Updated all endpoint paths to include `/api` prefix
- Enhanced `/api/auth/me` endpoint with better error handling
- Fixed `_.omit()` syntax
- Added fresh role/permission fetching

### 2. `valiarian-backend/src/services/rbac.service.ts`
- Added `getUserRolesAndPermissions()` method
- Supports fetching all roles and permissions for a user

## Testing

### Test the /me Endpoint
```bash
# Login first to get token
curl -X POST http://localhost:3035/api/auth/super-admin-login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123",
    "rememberMe": true
  }'

# Use the returned token
curl -X GET http://localhost:3035/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Expected Response
```json
{
  "id": "...",
  "email": "admin@example.com",
  "phone": "+1234567890",
  "fullName": "Admin User",
  "isActive": true,
  "createdAt": "...",
  "updatedAt": "...",
  "roles": ["super_admin"],
  "permissions": ["manage_users", "manage_content", ...]
}
```

## Impact

### Frontend
The admin panel will now:
- ✅ Successfully fetch user data on page load
- ✅ Maintain login session across page refreshes
- ✅ Display correct user information
- ✅ Have access to user roles and permissions

### Backend
- ✅ All auth endpoints now follow consistent `/api` prefix pattern
- ✅ Better error handling in `/me` endpoint
- ✅ Fresh role/permission data on each request
- ✅ Consistent with other API endpoints (CMS, etc.)

## Migration Notes

### For Frontend Developers
If you have hardcoded auth endpoint URLs, update them:
```javascript
// Old
const response = await fetch('/auth/me');

// New
const response = await fetch('/api/auth/me');
```

### For API Consumers
Update all auth endpoint URLs to include `/api` prefix. The old endpoints without `/api` will no longer work.

## Build Status
✅ Backend builds successfully with no TypeScript errors

## Next Steps
1. Restart the backend server
2. Test login flow in admin panel
3. Verify session persistence on page refresh
4. Update any API documentation with new endpoint paths

## Related Issues
- Login session lost on page refresh
- 404 error on `/api/auth/me`
- User data not loading in admin panel
