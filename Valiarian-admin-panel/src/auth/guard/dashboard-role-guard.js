import PropTypes from 'prop-types';
import { Navigate, useLocation } from 'react-router-dom';
// routes
import { paths } from 'src/routes/paths';
// components
import { LoadingScreen } from 'src/components/loading-screen';
// auth
import { useAuthContext } from '../hooks';
import { canAccessDashboard, getDefaultDashboardPath, hasAnyRole } from '../utils/role';

// ----------------------------------------------------------------------

export default function DashboardRoleGuard({ roles, children }) {
  const location = useLocation();

  const { user, loading } = useAuthContext();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!canAccessDashboard(user)) {
    return <Navigate to={paths.page403} replace />;
  }

  if (!hasAnyRole(user, roles)) {
    const fallbackPath = getDefaultDashboardPath(user);

    if (location.pathname !== fallbackPath) {
      return <Navigate to={fallbackPath} replace />;
    }

    return <Navigate to={paths.page403} replace />;
  }

  return <>{children}</>;
}

DashboardRoleGuard.propTypes = {
  children: PropTypes.node,
  roles: PropTypes.arrayOf(PropTypes.string).isRequired,
};
