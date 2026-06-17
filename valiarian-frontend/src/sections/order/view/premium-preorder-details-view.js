import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Label from 'src/components/label';
import { useSettingsContext } from 'src/components/settings';
import { useParams } from 'src/routes/hook';
import { paths } from 'src/routes/paths';
import axios, { endpoints } from 'src/utils/axios';
import { fCurrency } from 'src/utils/format-number';
import { fDate, fDateTime } from 'src/utils/format-time';
import { formatOrderStatusLabel } from 'src/utils/order-status';
import OrderDetailsToolbar from '../order-details-toolbar';

const getStatusColor = (status) => {
  switch (status) {
    case 'paid':
    case 'fulfilled':
      return 'success';
    case 'payment_review':
    case 'reserved':
    case 'ready_to_fulfill':
    case 'pending':
      return 'warning';
    case 'failed':
    case 'payment_failed':
    case 'cancelled':
      return 'error';
    case 'refunded':
      return 'info';
    default:
      return 'default';
  }
};

const renderAddress = (address) =>
  [
    address?.fullName,
    address?.phone,
    address?.email,
    address?.address,
    address?.city,
    address?.state,
    address?.zipCode,
    address?.country,
  ]
    .filter(Boolean)
    .join(', ');

export default function PremiumPreorderDetailsView() {
  const settings = useSettingsContext();
  const navigate = useNavigate();
  const { id } = useParams();

  const [preorder, setPreorder] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPreorderDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(endpoints.premiumPreorders.details(id));
      setPreorder(response.data.preorder);
      setTimeline(response.data.timeline || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching premium preorder details:', err);
      setError(err.response?.data?.message || 'Failed to load premium preorder details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchPreorderDetails();
    }
  }, [fetchPreorderDetails, id]);

  const productName = useMemo(
    () => preorder?.productSnapshot?.name || preorder?.product?.name || 'Premium Product',
    [preorder]
  );

  const variantLabel = useMemo(
    () =>
      [preorder?.selectedColor, preorder?.selectedSize].filter(Boolean).join(' / ') ||
      preorder?.productSnapshot?.variantLabel ||
      '-',
    [preorder]
  );

  const showSeparatePaymentStatus =
    preorder?.paymentStatus && preorder?.paymentStatus !== preorder?.status;
  const reversedTimeline = useMemo(() => [...timeline].reverse(), [timeline]);

  if (loading) {
    return (
      <Container maxWidth={settings.themeStretch ? false : 'lg'}>
        <Typography>Loading premium preorder details...</Typography>
      </Container>
    );
  }

  if (error || !preorder) {
    return (
      <Container maxWidth={settings.themeStretch ? false : 'lg'}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || 'Premium preorder not found'}
        </Alert>
        <Button variant="contained" onClick={() => navigate(paths.order.history)}>
          Back to Orders
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'} sx={{ mt: { xs: 0, md: 5 } }}>
      <Stack spacing={3}>
        <OrderDetailsToolbar
          backLink={paths.order.history}
          orderNumber={preorder.preorderNumber}
          createdAt={preorder.createdAt}
          status={preorder.status}
        />

        <Grid container spacing={3}>
          <Grid xs={12} md={8}>
            <Stack spacing={3}>
              <Card sx={{ p: 3 }}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                  spacing={2}
                  sx={{ mb: 3 }}
                >
                  <Typography variant="h6">Preorder Information</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Label variant="soft" color={getStatusColor(preorder.status)}>
                      {formatOrderStatusLabel(preorder.status)}
                    </Label>
                    {showSeparatePaymentStatus && (
                      <Label variant="soft" color={getStatusColor(preorder.paymentStatus)}>
                        Payment: {formatOrderStatusLabel(preorder.paymentStatus)}
                      </Label>
                    )}
                  </Stack>
                </Stack>

                <Stack spacing={1.5}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Product
                    </Typography>
                    <Typography variant="body2">{productName}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Variant
                    </Typography>
                    <Typography variant="body2">{variantLabel}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Quantity
                    </Typography>
                    <Typography variant="body2">{preorder.quantity || 1}</Typography>
                  </Stack>
                  {preorder.expectedDispatchDate && (
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Expected Dispatch
                      </Typography>
                      <Typography variant="body2">
                        {fDate(preorder.expectedDispatchDate)}
                      </Typography>
                    </Stack>
                  )}
                  {preorder.notes && (
                    <Stack spacing={0.5}>
                      <Typography variant="body2" color="text.secondary">
                        Notes
                      </Typography>
                      <Typography variant="body2">{preorder.notes}</Typography>
                    </Stack>
                  )}
                </Stack>
              </Card>

              <Card sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Item Summary
                </Typography>

                <Stack direction="row" spacing={2}>
                  <Box
                    component="img"
                    src={preorder.productSnapshot?.coverImage || '/assets/placeholder.svg'}
                    alt={productName}
                    sx={{
                      width: 88,
                      height: 88,
                      borderRadius: 1.5,
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />
                  <Stack spacing={0.75} sx={{ flex: 1 }}>
                    <Typography variant="subtitle1">{productName}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      SKU: {preorder.productSnapshot?.sku || '-'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Variant: {variantLabel}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Qty: {preorder.quantity || 1}
                    </Typography>
                  </Stack>
                  <Typography variant="subtitle1">{fCurrency(preorder.total || 0)}</Typography>
                </Stack>

                <Divider sx={{ my: 3 }} />

                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">Subtotal</Typography>
                    <Typography variant="body2">{fCurrency(preorder.subtotal || 0)}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">Shipping</Typography>
                    <Typography variant="body2">{fCurrency(preorder.shipping || 0)}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">Tax</Typography>
                    <Typography variant="body2">{fCurrency(preorder.tax || 0)}</Typography>
                  </Stack>
                  <Divider />
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="subtitle1">Total</Typography>
                    <Typography variant="subtitle1" color="primary">
                      {fCurrency(preorder.total || 0)}
                    </Typography>
                  </Stack>
                </Stack>
              </Card>

              <Card sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Timeline
                </Typography>

                <Stack spacing={2}>
                  {reversedTimeline.length ? (
                    reversedTimeline.map((entry, index) => (
                      <Stack key={`${entry.status}-${index}`} spacing={0.5}>
                        <Stack direction="row" justifyContent="space-between" spacing={2}>
                          <Typography variant="subtitle2">
                            {formatOrderStatusLabel(entry.status)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {fDateTime(entry.createdAt)}
                          </Typography>
                        </Stack>
                        {entry.comment && (
                          <Typography variant="body2" color="text.secondary">
                            {entry.comment}
                          </Typography>
                        )}
                      </Stack>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No updates available yet.
                    </Typography>
                  )}
                </Stack>
              </Card>
            </Stack>
          </Grid>

          <Grid xs={12} md={4}>
            <Stack spacing={3}>
              <Card sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Tracking
                </Typography>

                <Stack spacing={1.5}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Current Status
                    </Typography>
                    <Label variant="soft" color={getStatusColor(preorder.status)}>
                      {formatOrderStatusLabel(preorder.status)}
                    </Label>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Payment
                    </Typography>
                    <Label variant="soft" color={getStatusColor(preorder.paymentStatus)}>
                      {formatOrderStatusLabel(preorder.paymentStatus)}
                    </Label>
                  </Stack>
                  {preorder.expectedDispatchDate && (
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Expected Dispatch
                      </Typography>
                      <Typography variant="body2">
                        {fDate(preorder.expectedDispatchDate)}
                      </Typography>
                    </Stack>
                  )}
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Last Updated
                    </Typography>
                    <Typography variant="body2">
                      {fDateTime(preorder.updatedAt || preorder.createdAt)}
                    </Typography>
                  </Stack>
                  <Divider />
                  <Typography variant="body2" color="text.secondary">
                    Premium preorders don&apos;t use courier tracking numbers yet. This section
                    shows the fulfillment progress for your preorder.
                  </Typography>
                </Stack>
              </Card>

              <Card sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Payment
                </Typography>

                <Stack spacing={1.5}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Method
                    </Typography>
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                      {preorder.paymentMethod || 'razorpay'}
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Payment Status
                    </Typography>
                    {showSeparatePaymentStatus ? (
                      <Label variant="soft" color={getStatusColor(preorder.paymentStatus)}>
                        {formatOrderStatusLabel(preorder.paymentStatus)}
                      </Label>
                    ) : (
                      <Typography variant="body2">
                        {formatOrderStatusLabel(preorder.paymentStatus)}
                      </Typography>
                    )}
                  </Stack>
                  {preorder.razorpayOrderId && (
                    <Typography variant="body2" color="text.secondary">
                      Razorpay Order ID: {preorder.razorpayOrderId}
                    </Typography>
                  )}
                  {preorder.razorpayPaymentId && (
                    <Typography variant="body2" color="text.secondary">
                      Razorpay Payment ID: {preorder.razorpayPaymentId}
                    </Typography>
                  )}
                  {preorder.failureReason && (
                    <Typography variant="body2" color="error.main">
                      Failure Reason: {preorder.failureReason}
                    </Typography>
                  )}
                </Stack>
              </Card>

              <Card sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Shipping Address
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {renderAddress(preorder.shippingAddress)}
                </Typography>
              </Card>

              <Card sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Billing Address
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {renderAddress(preorder.billingAddress)}
                </Typography>
              </Card>
            </Stack>
          </Grid>
        </Grid>
      </Stack>
    </Container>
  );
}
