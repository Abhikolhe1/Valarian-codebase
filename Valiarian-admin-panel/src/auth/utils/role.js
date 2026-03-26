import { paths } from 'src/routes/paths';

const SUPER_ADMIN_ROLE = 'super_admin';
const ADMIN_ROLE = 'admin';

const normalizeRole = (role) => {
  if (!role) return '';

  const normalized = String(role).trim().toLowerCase().replace(/[\s-]+/g, '_');

  if (normalized === 'superadmin') {
    return SUPER_ADMIN_ROLE;
  }

  return normalized;
};

const extractRoleValues = (user) => {
  if (!user) return [];

  const values = [];

  if (user.role) {
    values.push(user.role);
  }

  if (Array.isArray(user.roles)) {
    user.roles.forEach((role) => {
      if (typeof role === 'string') {
        values.push(role);
        return;
      }

      if (role?.value) {
        values.push(role.value);
        return;
      }

      if (role?.name) {
        values.push(role.name);
      }
    });
  }

  return values.map(normalizeRole).filter(Boolean);
};

export function getUserPrimaryRole(user) {
  const roles = extractRoleValues(user);

  if (roles.includes(SUPER_ADMIN_ROLE)) {
    return SUPER_ADMIN_ROLE;
  }

  if (roles.includes(ADMIN_ROLE)) {
    return ADMIN_ROLE;
  }

  return roles[0] || '';
}

export function hasAnyRole(user, allowedRoles = []) {
  const currentRoles = extractRoleValues(user);
  const normalizedAllowedRoles = allowedRoles.map(normalizeRole);

  return normalizedAllowedRoles.some((role) => currentRoles.includes(role));
}

export function isSuperAdmin(user) {
  return hasAnyRole(user, [SUPER_ADMIN_ROLE]);
}

export function isAdmin(user) {
  return hasAnyRole(user, [ADMIN_ROLE]);
}

export function canAccessDashboard(user) {
  return isSuperAdmin(user) || isAdmin(user);
}

export function getDefaultDashboardPath(user) {
  if (isAdmin(user) && !isSuperAdmin(user)) {
    return paths.dashboard.order.root;
  }

  return paths.dashboard.general.analytics;
}

