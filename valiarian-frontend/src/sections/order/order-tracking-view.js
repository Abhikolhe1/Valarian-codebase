/* eslint-disable no-nested-ternary */
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
// @mui
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
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
import { formatOrderStatusLabel } from 'src/utils/order-status';
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
    backgroundImage: ownerState.deliveredTheme
      ? 'none'
      : 'linear-gradient( 136deg, rgb(242,113,33) 0%, rgb(233,64,87) 50%, rgb(138,35,135) 100%)',
    backgroundColor: ownerState.deliveredTheme ? theme.palette.success.main : undefined,
    boxShadow: '0 4px 10px 0 rgba(0,0,0,.25)',
  }),
  ...(ownerState.completed && {
    backgroundImage: ownerState.deliveredTheme
      ? 'none'
      : 'linear-gradient( 136deg, rgb(242,113,33) 0%, rgb(233,64,87) 50%, rgb(138,35,135) 100%)',
    backgroundColor: ownerState.deliveredTheme ? theme.palette.success.main : undefined,
  }),
}));

function ColorlibStepIcon(props) {
  const { active, completed, className, icon, deliveredTheme = false } = props;

  const icons = {
    1: <Iconify icon="eva:shopping-cart-fill" width={24} />,
    2: <Iconify icon="eva:checkmark-circle-2-fill" width={24} />,
    3: <Iconify icon="eva:car-fill" width={24} />,
    4: <Iconify icon="eva:home-fill" width={24} />,
  };

  return (
    <ColorlibStepIconRoot ownerState={{ completed, active, deliveredTheme }} className={className}>
      {icons[String(icon)]}
    </ColorlibStepIconRoot>
  );
}

ColorlibStepIcon.propTypes = {
  active: PropTypes.bool,
  completed: PropTypes.bool,
  className: PropTypes.string,
  deliveredTheme: PropTypes.bool,
  icon: PropTypes.node,
};

// ----------------------------------------------------------------------

export default function OrderTrackingView() {
  const settings = useSettingsContext();
  const router = useRouter();
  const { id } = useParams();
  const { authenticated, user } = useAuthContext();

  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState(null);
  const [error, setError] = useState(null);

  const getErrorMessage = (err) =>
    err?.response?.data?.message ||
    err?.data?.message ||
    err?.message ||
    'Failed to load tracking information';

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authenticated) {
      router.push(paths.auth.jwt.login);
    }
  }, [authenticated, router]);

  // Load tracking information from backend
  useEffect(() => {
    const loadTracking = async () => {
      if (!authenticated || !user?.id || !id) return;

      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(`/api/orders/${id}/tracking`);
        setTracking(response.data.tracking);
      } catch (err) {
        console.error('Error loading tracking information:', err);
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    loadTracking();
  }, [authenticated, user?.id, id]);

  const handleBackToOrders = () => {
    router.push(paths.order.history);
  };

  if (!authenticated) {
    return null;
  }

  const getActiveStep = (status) => {
    switch (status) {
      case 'pending':
        return 0;
      case 'confirmed':
      case 'processing':
      case 'packed':
        return 1;
      case 'shipped':
        return 2;
      case 'delivered':
      case 'completed':
      case 'return_requested':
      case 'returned':
      case 'parcel_received':
      case 'refunded':
        return 3;
      default:
        return 0;
    }
  };

  const steps = ['Order Placed', 'Confirmed', 'Shipped', 'Delivered'];
  const userCancelledSteps = ['Order Placed', 'Cancellation Requested', 'Cancelled'];
  const adminCancelledSteps = ['Order Placed', 'Cancelled'];
  const returnRequestedSteps = ['Delivered', 'Return Requested'];
  const normalizedStatus = String(tracking?.status || '').toLowerCase();
  const isCancelledOrder = ['cancelled', 'canceled'].includes(normalizedStatus);

  const getCancelledBy = () => {
    const directCancelledBy = String(tracking?.cancelledBy || '').toLowerCase();
    if (directCancelledBy === 'admin' || directCancelledBy === 'user') {
      return directCancelledBy;
    }

    const cancelledEvent = tracking?.events
      ?.filter((event) => ['cancelled', 'canceled'].includes(String(event?.status || '').toLowerCase()))
      ?.slice(-1)?.[0];

    const cancelledComment = String(cancelledEvent?.comment || '').toLowerCase();
    if (cancelledComment.includes('by admin')) {
      return 'admin';
    }
    if (cancelledComment.includes('by user')) {
      return 'user';
    }

    const hasCancellationRequestedEvent = Boolean(
      tracking?.events?.some((event) => {
        const eventStatus = String(event?.status || '').toLowerCase();
        return eventStatus.includes('cancel') && eventStatus.includes('request');
      })
    );

    if (hasCancellationRequestedEvent) {
      return 'user';
    }

    // Fallback for admin panel status updates when no explicit metadata is present.
    return 'admin';
  };

  const cancelledBy = isCancelledOrder ? getCancelledBy() : null;
  const getReturnDecision = () => {
    const directReturnStatus = String(tracking?.returnStatus || '').toLowerCase();
    if (directReturnStatus === 'approved') return 'approved';
    if (directReturnStatus === 'rejected') return 'rejected';

    const returnDecisionEvent = tracking?.events
      ?.filter((event) =>
        ['return_approved', 'return_rejected'].includes(String(event?.status || '').toLowerCase())
      )
      ?.slice(-1)?.[0];

    const eventStatus = String(returnDecisionEvent?.status || '').toLowerCase();
    if (eventStatus === 'return_approved') return 'approved';
    if (eventStatus === 'return_rejected') return 'rejected';

    return null;
  };

  const returnDecision = getReturnDecision();
  const hasReturnRequestedState =
    normalizedStatus === 'return_requested' ||
    String(tracking?.returnStatus || '').toLowerCase() === 'requested' ||
    Boolean(
      tracking?.events?.some(
        (event) => String(event?.status || '').toLowerCase() === 'return_requested'
      )
    );
  const isReturnFlow = hasReturnRequestedState || Boolean(returnDecision);

  const getReturnFlowSteps = () => {
    if (returnDecision === 'approved') {
      return [...returnRequestedSteps, 'Return Requested Accepted'];
    }
    if (returnDecision === 'rejected') {
      return [...returnRequestedSteps, 'Return Requested Rejected'];
    }
    return returnRequestedSteps;
  };

  const stepperSteps = isCancelledOrder
    ? cancelledBy === 'admin'
      ? adminCancelledSteps
      : userCancelledSteps
    : isReturnFlow
      ? getReturnFlowSteps()
      : steps;

  const activeStepperStep = isCancelledOrder
    ? Math.max(stepperSteps.length - 1, 0)
    : isReturnFlow
      ? returnDecision
        ? 2
        : 1
      : getActiveStep(tracking?.status);

  const shouldShowTimeline = Boolean(
    tracking?.trackingNumber ||
      tracking?.events?.length ||
      [
        'pending',
        'confirmed',
        'processing',
        'cancelled',
        'packed',
        'shipped',
        'delivered',
        'canceled',
        'completed',
        'return_requested',
        'returned',
        'parcel_received',
        'refunded',
      ].includes(tracking?.status)
  );
  const isDeliveredTheme =
    returnDecision === 'approved' ||
    (['delivered', 'completed'].includes(normalizedStatus) && returnDecision !== 'rejected');
  const showReturnReviewMessage = isReturnFlow && !returnDecision;

  const StepIconComponent = (props) => (
    <ColorlibStepIcon {...props} deliveredTheme={isDeliveredTheme} />
  );

  const getTrackingMessage = () => {
    switch (tracking?.status) {
      case 'delivered':
      case 'completed':
        return 'Your order has been delivered successfully.';
      case 'return_requested':
      case 'returned':
        return 'Your order was delivered and your return request is now under review.';
      case 'return_approved':
        return 'Your return request has been accepted by admin.';
      case 'return_rejected':
        return 'Your return request has been rejected by admin.';
      case 'parcel_received':
        return 'Your returned parcel has been received and is being checked by our team.';
      case 'refunded':
        return 'Your refund has been processed successfully.';
      case 'shipped':
        return 'Your order has been shipped. Tracking number will be updated soon.';
      case 'confirmed':
      case 'processing':
      case 'packed':
        return 'Your order is being prepared for shipment.';
      case 'pending':
      case 'cancelled':
      case 'canceled':
        return 'Your order has been cancelled. Any applicable refund will be processed shortly.';
      default:
        if (returnDecision === 'approved') {
          return 'Your return request has been accepted by admin.';
        }
        if (returnDecision === 'rejected') {
          return 'Your return request has been rejected by admin.';
        }
        return 'Tracking information is not available yet. Your order is being processed and tracking details will be updated soon.';
    }
  };

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'} sx={{ py: { xs: 5, md: 10 } }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 5 }}>
        <Button
        variant="outlined"
        color='secondary'
          startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
          onClick={handleBackToOrders}
        >
          Back to Orders
        </Button>
      </Stack>

      <Typography variant="h3" sx={{ mb: 5 }}>
        Order Tracking
      </Typography>

      {loading && (
        <Card>
          <CardContent>
            <Typography>Loading tracking information...</Typography>
          </CardContent>
        </Card>
      )}

      {!loading && error && (
        <Card>
          <CardContent>
            <Typography color="error">{error}</Typography>
          </CardContent>
        </Card>
      )}

      {!loading && !error && !tracking && (
        <Card>
          <CardContent>
            <Typography>No tracking information available for this order.</Typography>
          </CardContent>
        </Card>
      )}

      {!loading && !error && tracking && (
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
                      (['delivered', 'completed', 'return_requested', 'returned', 'parcel_received', 'refunded'].includes(tracking.status) && 'success') ||
                      (tracking.status === 'shipped' && 'info') ||
                      (tracking.status === 'confirmed' && 'warning') ||
                      (['cancelled', 'canceled'].includes(tracking.status) && 'error') ||
                      'default'
                    }
                  >
                    {formatOrderStatusLabel(tracking.status)}
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

              {showReturnReviewMessage && (
                <Alert severity="info" sx={{ mb: 3 }}>
                  <AlertTitle>Return request under review</AlertTitle>
                  Admin is reviewing this order. As soon as possible, you will receive the next
                  update about your return request and what happens next.
                </Alert>
              )}

              {shouldShowTimeline ? (
                <Stack spacing={3}>
                <Stepper
                  alternativeLabel
                  activeStep={activeStepperStep}
                  connector={<ColorlibConnector />}
                  sx={
                    isDeliveredTheme
                      ? {
                          '& .MuiStepConnector-root.Mui-active .MuiStepConnector-line, & .MuiStepConnector-root.Mui-completed .MuiStepConnector-line': {
                            backgroundImage: 'none',
                            backgroundColor: 'success.main',
                          },
                        }
                      : undefined
                  }
                >
                  {stepperSteps.map((label) => (
                    <Step key={label}>
                    <StepLabel StepIconComponent={StepIconComponent}>{label}</StepLabel>
                  </Step>
                ))}
                </Stepper>

                  {!tracking.trackingNumber && (
                    <Box sx={{ textAlign: 'center', pt: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        {getTrackingMessage()}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              ) : (
                <Box sx={{ textAlign: 'center', py: 5 }}>
                  <Iconify
                    icon="eva:info-outline"
                    width={48}
                    sx={{ color: 'text.disabled', mb: 2 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {getTrackingMessage()}
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
