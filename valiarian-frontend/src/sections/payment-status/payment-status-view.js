import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { clearUserCart } from 'src/api/cart';
import { useAuthContext } from 'src/auth/hooks';
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import { useSnackbar } from 'src/components/snackbar';
import { resetCart } from 'src/redux/slices/checkout';
import { useDispatch } from 'src/redux/store';
import { useRouter, useSearchParams } from 'src/routes/hook';
import { paths } from 'src/routes/paths';
import axios from 'src/utils/axios';
import { fCurrency } from 'src/utils/format-number';
import { fDateTime } from 'src/utils/format-time';
import { getPaymentSession } from 'src/utils/payment-session';

const STATUS_CONFIG = {
  success: {
    title: 'Payment Successful',
    description: 'Your payment has been confirmed and your order is now in progress.',
    icon: 'solar:check-circle-bold-duotone',
    color: 'success.main',
    tone: 'success',
  },
  failed: {
    title: 'Payment Failed',
    description: 'We could not complete your payment. You can retry or return to checkout.',
    icon: 'solar:close-circle-bold-duotone',
    color: 'error.main',
    tone: 'error',
  },
  cancelled: {
    title: 'Payment Cancelled',
    description: 'The checkout window was closed before payment was completed.',
    icon: 'solar:stop-circle-bold-duotone',
    color: 'warning.main',
    tone: 'warning',
  },
  pending: {
    title: 'Payment Pending',
    description: 'We are still waiting for the payment gateway to confirm this transaction.',
    icon: 'solar:clock-circle-bold-duotone',
    color: 'info.main',
    tone: 'info',
  },
};

const getPrimaryLabel = (status) => {
  if (status === 'success') {
    return 'View Orders';
  }

  if (status === 'failed') {
    return 'Retry Payment';
  }

  if (status === 'cancelled') {
    return 'Retry';
  }

  return 'View Orders';
};

const getSecondaryLabel = (status) => {
  if (status === 'success') {
    return 'Continue Shopping';
  }

  if (status === 'failed') {
    return 'Go Back';
  }

  if (status === 'cancelled') {
    return 'Go to Cart';
  }

  return 'Refresh Status';
};

const parseAmount = (value) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return 0;
  }

  return numericValue;
};

export default function PaymentStatusView({ status }) {
  const settings = useSettingsContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();
  const { authenticated, user } = useAuthContext();
  const dispatch = useDispatch();
  const paymentSession = useSelector((state) => state.checkout.paymentSession);

  const [checkingStatus, setCheckingStatus] = useState(status === 'pending');
  const [pollingError, setPollingError] = useState('');

  const session = useMemo(() => {
    const storedSession = getPaymentSession();
    const mergedSession = {
      ...(storedSession || {}),
      ...(paymentSession || {}),
    };

    return {
      ...mergedSession,
      orderId: searchParams.get('orderId') || mergedSession.orderId || '',
      orderNumber: searchParams.get('orderNumber') || mergedSession.orderNumber || '',
      amount: parseAmount(searchParams.get('amount') || mergedSession.amount),
      createdAt: searchParams.get('date') || mergedSession.createdAt || mergedSession.updatedAt,
    };
  }, [paymentSession, searchParams]);

  useEffect(() => {
    if (!authenticated) {
      return;
    }

    if (status === 'success') {
      dispatch(resetCart());

      if (user?.id) {
        clearUserCart(user.id).catch((error) => {
          console.error('Failed to clear cart after successful payment:', error);
        });
      }

      enqueueSnackbar('Order placed successfully', { variant: 'success' });
    }
  }, [authenticated, dispatch, enqueueSnackbar, status, user?.id]);

  useEffect(() => {
    if (status !== 'pending' || !session.orderId) {
      return undefined;
    }

    let active = true;

    const checkPaymentStatus = async () => {
      try {
        setCheckingStatus(true);
        setPollingError('');

        const response = await axios.get(`/api/orders/${session.orderId}`);
        const order = response.data?.order;

        if (!active || !order) {
          return;
        }

        if (order.paymentStatus === 'paid') {
          router.replace(
            `${paths.payment.success}?orderId=${order.id}&orderNumber=${order.orderNumber}&amount=${
              order.total
            }&date=${encodeURIComponent(order.createdAt)}`
          );
          return;
        }

        if (order.paymentStatus === 'failed') {
          router.replace(
            `${paths.payment.failed}?orderId=${order.id}&orderNumber=${order.orderNumber}&amount=${
              order.total
            }&date=${encodeURIComponent(order.createdAt)}`
          );
        }
      } catch (error) {
        if (active) {
          setPollingError(
            error?.message || 'We could not refresh payment status right now. Please try again.'
          );
        }
      } finally {
        if (active) {
          setCheckingStatus(false);
        }
      }
    };

    checkPaymentStatus();
    const intervalId = window.setInterval(checkPaymentStatus, 5000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [router, session.orderId, status]);

  const config = STATUS_CONFIG[status];

  const primaryAction = () => {
    if (status === 'success') {
      router.push(paths.order.history);
      return;
    }

    if (status === 'failed') {
      router.push(paths.product.checkout);
      return;
    }

    if (status === 'cancelled') {
      router.push(paths.product.checkout);
      return;
    }

    router.push(paths.order.history);
  };

  const secondaryAction = () => {
    if (status === 'success') {
      router.push(paths.product.root);
      return;
    }

    if (status === 'failed') {
      router.back();
      return;
    }

    if (status === 'cancelled') {
      router.push(paths.product.checkout);
      return;
    }

    window.location.reload();
  };

  const primaryLabel = getPrimaryLabel(status);
  const secondaryLabel = getSecondaryLabel(status);

  return (
    <Container maxWidth={settings.themeStretch ? false : 'sm'} sx={{ py: { xs: 4, md: 8 } }}>
      <Card
        sx={{
          p: { xs: 3, sm: 4 },
          borderRadius: 3,
          background: (theme) =>
            `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.98)}, ${alpha(
              theme.palette.grey[500],
              0.04
            )})`,
          boxShadow: (theme) => theme.customShadows.z24,
        }}
      >
        <Stack spacing={3}>
          <Stack spacing={2} alignItems="center" textAlign="center">
            <Box
              sx={{
                width: 88,
                height: 88,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                color: config.color,
                bgcolor: (theme) => alpha(theme.palette[config.tone].main, 0.12),
              }}
            >
              <Iconify icon={config.icon} width={46} />
            </Box>

            <Box>
              <Typography variant="h4" sx={{ mb: 1 }}>
                {config.title}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {config.description}
              </Typography>
            </Box>
          </Stack>

          {pollingError && <Alert severity="warning">{pollingError}</Alert>}

          <Box
            sx={{
              borderRadius: 2,
              p: 2.5,
              bgcolor: (theme) => alpha(theme.palette.grey[500], 0.05),
            }}
          >
            <Grid container spacing={2}>
              <Grid xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  Order ID
                </Typography>
                <Typography variant="subtitle2">
                  {session.orderNumber || session.orderId || 'N/A'}
                </Typography>
              </Grid>
              <Grid xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  Amount
                </Typography>
                <Typography variant="subtitle2">
                  {session.amount ? fCurrency(session.amount) : 'N/A'}
                </Typography>
              </Grid>
              <Grid xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  Date
                </Typography>
                <Typography variant="subtitle2">
                  {session.createdAt ? fDateTime(session.createdAt) : 'N/A'}
                </Typography>
              </Grid>
            </Grid>
          </Box>

          {status === 'pending' && (
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              justifyContent="center"
              sx={{ py: 1 }}
            >
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                {checkingStatus
                  ? 'Checking payment status...'
                  : 'Waiting for the latest payment update'}
              </Typography>
            </Stack>
          )}

          <Stack spacing={1.5}>
            <Button fullWidth size="large" variant="contained" onClick={primaryAction}>
              {primaryLabel}
            </Button>
            <Button fullWidth size="large" variant="outlined" onClick={secondaryAction}>
              {secondaryLabel}
            </Button>
          </Stack>
        </Stack>
      </Card>
    </Container>
  );
}

PaymentStatusView.propTypes = {
  status: PropTypes.oneOf(['success', 'failed', 'cancelled', 'pending']).isRequired,
};
