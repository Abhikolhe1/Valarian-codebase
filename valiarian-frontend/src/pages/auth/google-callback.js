import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'src/routes/hook';
// @mui
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { useAuthContext } from 'src/auth/hooks';
// auth
import { resolveAuthRedirect } from 'src/utils/auth-redirect';

// ----------------------------------------------------------------------

export default function GoogleCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const { otpLogin } = useAuthContext();

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      const userParam = searchParams.get('user');
      const errorParam = searchParams.get('error');

      // Handle OAuth errors
      if (errorParam) {
        if (errorParam === 'no_code') {
          setError('No authorization code received. Redirecting...');
        } else if (errorParam === 'auth_failed') {
          setError('Failed to authenticate with Google. Redirecting...');
        } else {
          setError('An error occurred during Google login. Redirecting...');
        }
        setTimeout(() => {
          router.push('/auth/jwt/login');
        }, 3000);
        return;
      }

      if (!token) {
        setError('No authentication token received. Redirecting...');
        setTimeout(() => {
          router.push('/auth/jwt/login');
        }, 3000);
        return;
      }

      try {
        // Parse user data
        const user = userParam ? JSON.parse(decodeURIComponent(userParam)) : null;

        // Update auth context with token and user data
        await otpLogin(token, user);

        // Redirect to the original destination when available
        router.push(resolveAuthRedirect(searchParams));
      } catch (err) {
        console.error('Google OAuth error:', err);
        setError('Failed to process authentication. Redirecting...');
        setTimeout(() => {
          router.push('/auth/jwt/login');
        }, 3000);
      }
    };

    handleCallback();
  }, [searchParams, otpLogin, router]);

  return (
    <Container>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 3,
        }}
      >
        {error ? (
          <>
            <Alert severity="error" sx={{ maxWidth: 500 }}>
              {error}
            </Alert>
            <Typography variant="body2" color="text.secondary">
              Redirecting to login page...
            </Typography>
          </>
        ) : (
          <>
            <CircularProgress size={60} />
            <Typography variant="h6">Signing in with Google...</Typography>
            <Typography variant="body2" color="text.secondary">
              Please wait while we complete your authentication
            </Typography>
          </>
        )}
      </Box>
    </Container>
  );
}
