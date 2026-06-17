import PropTypes from 'prop-types';
// @mui
import Button from '@mui/material/Button';
// routes
import { RouterLink } from 'src/routes/components';
import { paths } from 'src/routes/paths';
// utils
import { buildAuthRouteWithReturnTo, setStoredReturnPath } from 'src/utils/auth-redirect';

// ----------------------------------------------------------------------

export default function LoginButton({ sx }) {
  const currentPath =
    typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : '/';

  const loginPath = buildAuthRouteWithReturnTo(paths.auth.jwt.login, currentPath);

  return (
    <Button
      component={RouterLink}
      href={loginPath}
      variant="outlined"
      sx={{ mr: 1, ...sx }}
      onClick={() => setStoredReturnPath(currentPath)}
    >
      Login
    </Button>
  );
}

LoginButton.propTypes = {
  sx: PropTypes.object,
};
