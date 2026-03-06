import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
// @mui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Step from '@mui/material/Step';
import StepConnector, { stepConnectorClasses } from '@mui/material/StepConnector';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
// routes
import { useRouter } from 'src/routes/hook';
import { paths } from 'src/routes/paths';
// auth
import { useAuthContext } from 'src/auth/hooks';
// utils
import axios from 'src/utils/axios';
// components
import PropTypes from 'prop-types';
import Iconify from 'src/components/iconify';
import Label from 'src/components/label';
import { useSettingsContext } from 'src/components/settings';

// ----------------------------------------------------------------------

const ColorlibConnector = styled(StepConnector)(({ theme }) => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: {
    top: 22,
  },
  [`&.${stepConnectorClasses.active}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage: 'linear-gradient( 95deg,rgb(242,113,33) 0%,rgb(233,64,87) 50%,rgb(138,35,135) 100%)',
    },
  },
  [`&.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage: 'linear-gradient( 95deg,rgb(242,113,33) 0%,rgb(233,64,87) 50%,rgb(138,35,135) 100%)',
    },
  },
  [`& .${stepConnectorClasses.line}`]: {
    height: 3,
    border: 0,
    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : '#eaeaf0',
    borderRadius: 1,
  },
}));

const ColorlibStepIconRoot = styled('div')(({ theme, ownerState }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[700] : '#ccc',
  zIndex: 1,
  color: '#fff',
  width: 50,
  height: 50,
  display: 'flex',
  borderRadius: '50%',
  justifyContent: 'center',
  alignItems: 'center',
  ...(ownerState.active && {
    backgroundImage: 'linear-gradient( 136deg, rgb(242,113,33) 0%, rgb(233,64,87) 50%, rgb(138,35,135) 100%)',
    boxShadow: '0 4px 10px 0 rgba(0,0,0,.25)',
  }),
  ...(ownerState.completed && {
    backgroundImage: 'linear-gradient( 136deg, rgb(242,113,33) 0%, rgb(233,64,87) 50%, rgb(138,35,135) 100%)',
  }),
}));

function ColorlibStepIcon(props) {
  const { active, completed, className, icon } = props;

  const icons = {
    1: <Iconify icon="eva:shopping-cart-fill" width={24} />,
    2: <Iconify icon="eva:checkmark-circle-2-fill" width={24} />,
    3: <Iconify icon="eva:car-fill" width={24} />,
    4: <Iconify icon="eva:home-fill" width={24} />,
  };

  return (
    <ColorlibStepIconRoot ownerState={{ completed, active }} className={className}>
      {icons[String(icon)]}
    </ColorlibStepIconRoot>
  );
}

// ----------------------------------------------------------------------

export default function OrderTrackingView() {
  const settings = useSettingsContext();
  const router = useRouter();
  const { id } = useParams();
  const { authenticated, user } = useAuthContext();

  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState(null);
  const [error, setError] = useState(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authenticated) {
      router.push(paths.auth.jwt.login);
    }
  }, [authenticated, router]);

  // Load tracking information from backend
  useEffect(() => {
    const loadTracking = async () => {
      if (!authenticated || !user || !id) return;

      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(`/api/orders/${id}/tracking`);
        setTracking(response.data.tracking);
      } catch (err) {
        console.error('Error loading tracking information:', err);
        setError(err.message || 'Failed to load tracking information');
      } finally {
        setLoading(false);
      }
    };

    loadTracking();
  }, [authenticated, user, id]);

  const handleBackToOrders = () => {
    router.push(paths.order.history);
  };

  if (!authenticated) {
    return null;
  }

  const getActiveStep = (status) => {
    switch (status) {
      case 'pending':
      case 'processing':
        return 0;
      case 'confirmed':
        return 1;
      case 'shipped':
        return 2;
      case 'delivered':
      case 'completed':
        return 3;
      default:
        return 0;
    }
  };

  const steps = ['Order Placed', 'Confirmed', 'Shipped', 'Delivered'];

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'} sx={{ py: { xs: 5, md: 10 } }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 5 }}>
        <Button
          startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
          onClick={handleBackToOrders}
        >
          Back to Orders
        </Button>
      </Stack>

      <Typography variant="h3" sx={{ mb: 5 }}>
        Order Tracking
      </Typography>

      {loading ? (
        <Card>
          <CardContent>
            <Typography>Loading tracking information...</Typography>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent>
            <Typography color="error">{error}</Typography>
          </CardContent>
        </Card>
      ) : !tracking ? (
        <Card>
          <CardContent>
            <Typography>No tracking information available for this order.</Typography>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={3}>
          {/* Order Info Card */}
          <Card>
            <CardContent>
              <Stack spacing={3}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h6">Order #{tracking.orderNumber}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Placed on {tracking.createdAt ? format(new Date(tracking.createdAt), 'MMM dd, yyyy') : 'N/A'}
                    </Typography>
                  </Box>
                  <Label
                    variant="soft"
                    color={
                      (tracking.status === 'delivered' && 'success') ||
                      (tracking.status === 'shipped' && 'info') ||
                      (tracking.status === 'confirmed' && 'warning') ||
                      'default'
                    }
                  >
                    {tracking.status}
                  </Label>
                </Stack>

                {tracking.estimatedDelivery && (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Estimated Delivery
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {format(new Date(tracking.estimatedDelivery), 'EEEE, MMM dd, yyyy')}
                      </Typography>
                    </Box>
                  </>
                )}

                {tracking.trackingNumber && tracking.carrier && (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Tracking Information
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Carrier: {tracking.carrier}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Tracking Number: {tracking.trackingNumber}
                      </Typography>
                    </Box>
                  </>
                )}
              </Stack>
            </CardContent>
          </Card>

          {/* Tracking Timeline */}
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 4 }}>
                Tracking Timeline
              </Typography>

              {tracking.trackingNumber ? (
                <Stepper
                  alternativeLabel
                  activeStep={getActiveStep(tracking.status)}
                  connector={<ColorlibConnector />}
                >
                  {steps.map((label) => (
                    <Step key={label}>
                      <StepLabel StepIconComponent={ColorlibStepIcon}>{label}</StepLabel>
                    </Step>
                  ))}
                </Stepper>
              ) : (
                <Box sx={{ textAlign: 'center', py: 5 }}>
                  <Iconify
                    icon="eva:info-outline"
                    width={48}
                    sx={{ color: 'text.disabled', mb: 2 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Tracking information is not available yet. Your order is being processed and
                    tracking details will be updated soon.
                  </Typography>
                </Box>
              )}

              {/* Tracking Events */}
              {tracking.events && tracking.events.length > 0 && (
                <Box sx={{ mt: 5 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Tracking Events
                  </Typography>
                  <Stack spacing={2} sx={{ mt: 2 }}>
                    {tracking.events.map((event, index) => (
                      <Stack
                        key={index}
                        direction="row"
                        spacing={2}
                        sx={{
                          p: 2,
                          borderRadius: 1,
                          bgcolor: 'background.neutral',
                        }}
                      >
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: 'primary.main',
                            mt: 1,
                            flexShrink: 0,
                          }}
                        />
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                            {event.status} {event.comment && `- ${event.comment}`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {format(new Date(event.timestamp), 'MMM dd, yyyy - h:mm a')}
                          </Typography>
                        </Box>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Shipping Address */}
          {tracking.shippingAddress && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Shipping Address
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {tracking.shippingAddress.fullName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {tracking.shippingAddress.address}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {tracking.shippingAddress.city}, {tracking.shippingAddress.state}{' '}
                  {tracking.shippingAddress.zipCode}
                </Typography>
                {tracking.shippingAddress.phone && (
                  <Typography variant="body2" color="text.secondary">
                    Phone: {tracking.shippingAddress.phone}
                  </Typography>
                )}
              </CardContent>
            </Card>
          )}
        </Stack>
      )
      }
    </Container >
  );
}


OrderTrackingView.propTypes = {
  active: PropTypes.bool,
}
