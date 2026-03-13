import PropTypes from 'prop-types';
import { useEffect, useRef } from 'react';
// routes
import { useRouter } from 'src/routes/hook';
// config
import { PATH_AFTER_LOGIN } from 'src/config-global';
//
import { useAuthContext } from '../hooks';

// ----------------------------------------------------------------------

export default function GuestGuard({ children }) {
  const router = useRouter();

  const { authenticated, loading } = useAuthContext();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Don't redirect while loading
    if (loading) {
      console.log('GuestGuard: Still loading auth state');
      return;
    }

    // Only redirect once when authenticated
    if (authenticated && !hasRedirected.current) {
      console.log('GuestGuard: User is authenticated, redirecting to', PATH_AFTER_LOGIN);
      hasRedirected.current = true;
      router.replace(PATH_AFTER_LOGIN);
    }

    // Reset redirect flag if user logs out
    if (!authenticated) {
      hasRedirected.current = false;
    }
  }, [authenticated, loading, router]);

  return <>{children}</>;
}

GuestGuard.propTypes = {
  children: PropTypes.node,
};
