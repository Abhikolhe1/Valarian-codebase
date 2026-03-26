import PropTypes from 'prop-types';
import { useCallback, useEffect } from 'react';
// routes
import { useRouter } from 'src/routes/hook';
//
import { useAuthContext } from '../hooks';
import { getDefaultDashboardPath } from '../utils/role';

// ----------------------------------------------------------------------

export default function GuestGuard({ children }) {
  const router = useRouter();

  const { authenticated, user } = useAuthContext();

  const check = useCallback(() => {
    if (authenticated) {
      router.replace(getDefaultDashboardPath(user));
    }
  }, [authenticated, router, user]);

  useEffect(() => {
    check();
  }, [check]);

  return <>{children}</>;
}

GuestGuard.propTypes = {
  children: PropTypes.node,
};
