import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
// @mui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
// routes
import { useRouter } from 'src/routes/hook';
import { paths } from 'src/routes/paths';
// auth
import { useAuthContext } from 'src/auth/hooks';
// redux
import { getCart } from 'src/redux/slices/checkout';
import { useDispatch } from 'src/redux/store';
// utils
import { loadCartOnLogin } from 'src/utils/cart-initialization';
// components
import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------

export default function CheckoutAuthGate({ onNextStep, onBackStep }) {
  const router = useRouter();
  const dispatch = useDispatch();
  const { authenticated, user } = useAuthContext();
  const [isProcessing, setIsProcessing] = useState(false);

  // Auto-skip to next step if already authenticated
  useEffect(() => {
    const handleAuthenticatedUser = async () => {
      if (authenticated && user) {
        setIsProcessing(true);
        try {
          // Load and merge cart on authentication
          await loadCartOnLogin(user.id, dispatch, getCart);

          // Small delay to show processing state
          setTimeout(() => {
            onNextStep();
          }, 500);
        } catch (error) {
          console.error('Error loading cart:', error);
          // Continue to next step even if cart loading fails
          onNextStep();
        }
      }
    };

    handleAuthenticatedUser();
  }, [authenticated, user, onNextStep, dispatch]);

  const handleLogin = () => {
    // Store current path to return after login
    sessionStorage.setItem('returnPath', '/products/checkout');
    router.push(paths.auth.jwt.login);
  };

  const handleSignup = () => {
    // Store current path to return after signup
    sessionStorage.setItem('returnPath', '/products/checkout');
    router.push(paths.auth.jwt.register);
  };

  const handleContinueAsGuest = () => {
    // For now, we require authentication before payment
    // This button can be removed or modified based on requirements
    alert('Authentication is required to proceed with payment');
  };

  if (isProcessing) {
    return (
      <Box sx={{ textAlign: 'center', py: 10 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Loading your cart...
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please wait while we prepare your checkout
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 5 }}>
          <Stack spacing={3} alignItems="center">
            {/* Icon */}
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: 'primary.lighter',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Iconify icon="eva:lock-fill" width={40} sx={{ color: 'primary.main' }} />
            </Box>

            {/* Title */}
            <Typography variant="h4" textAlign="center">
              Sign in to Continue
            </Typography>

            {/* Description */}
            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ maxWidth: 480 }}>
              To proceed with payment and complete your order, please sign in to your account or create a new one.
              Your cart items will be saved and merged with your account.
            </Typography>

            {/* Buttons */}
            <Stack spacing={2} sx={{ width: '100%', maxWidth: 400 }}>
              <Button
                fullWidth
                size="large"
                variant="contained"
                startIcon={<Iconify icon="eva:log-in-fill" />}
                onClick={handleLogin}
              >
                Sign In
              </Button>

              <Button
                fullWidth
                size="large"
                variant="outlined"
                startIcon={<Iconify icon="eva:person-add-fill" />}
                onClick={handleSignup}
              >
                Create Account
              </Button>

              <Divider sx={{ my: 2 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  OR
                </Typography>
              </Divider>

              <Button
                fullWidth
                size="large"
                variant="text"
                color="inherit"
                startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
                onClick={onBackStep}
              >
                Back to Address
              </Button>
            </Stack>

            {/* Info Box */}
            <Box
              sx={{
                mt: 3,
                p: 2,
                borderRadius: 1,
                bgcolor: 'background.neutral',
                width: '100%',
                maxWidth: 480,
              }}
            >
              <Stack direction="row" spacing={2}>
                <Iconify icon="eva:info-fill" width={24} sx={{ color: 'info.main', flexShrink: 0 }} />
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Why do I need to sign in?
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Authentication is required to process payments securely and to track your order. Your cart items
                    will be saved to your account.
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

CheckoutAuthGate.propTypes = {
  onNextStep: PropTypes.func,
  onBackStep: PropTypes.func,
};
