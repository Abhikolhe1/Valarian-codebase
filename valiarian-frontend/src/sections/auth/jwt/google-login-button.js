import PropTypes from 'prop-types';
// @mui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
// config

// ----------------------------------------------------------------------

export default function GoogleLoginButton({ sx, ...other }) {
  const handleGoogleLogin = () => {
    // Redirect to backend Google OAuth endpoint
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3035';
    window.location.href = `${apiUrl}/api/auth/google`;
  };

  return (
    <Button
      fullWidth
      size="large"
      variant="outlined"
      onClick={handleGoogleLogin}
      sx={{
        borderColor: 'divider',
        color: 'text.primary',
        '&:hover': {
          borderColor: 'text.primary',
          bgcolor: 'action.hover',
        },
        ...sx,
      }}
      startIcon={
        <Box
          component="img"
          src="/assets/icons/auth/ic_google.svg"
          sx={{ width: 20, height: 20 }}
        />
      }
      {...other}
    >
      Continue with Google
    </Button>
  );
}

GoogleLoginButton.propTypes = {
  sx: PropTypes.object,
};
