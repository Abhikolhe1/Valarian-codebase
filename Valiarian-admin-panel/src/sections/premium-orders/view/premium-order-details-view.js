import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import Label from 'src/components/label';
import { useSettingsContext } from 'src/components/settings';
import { useSnackbar } from 'src/components/snackbar';
import { paths } from 'src/routes/paths';
import axios from 'src/utils/axios';
import { fCurrency } from 'src/utils/format-number';
import { fDate, fDateTime } from 'src/utils/format-time';
import { formatOrderStatusLabel } from 'src/utils/order-status';

const FALLBACK_STATUS_OPTIONS = [
  'initiated',
  'paid',
  'failed',
  'payment_failed',
  'payment_review',
  'reserved',
  'ready_to_fulfill',
  'fulfilled',
  'cancelled',
  'refunded',
];

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

export default function PremiumOrderDetailsView() {
  const settings = useSettingsContext();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { id } = useParams();

  const [preorder, setPreorder] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [availableStatusOptions, setAvailableStatusOptions] = useState([]);
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [expectedDispatchDate, setExpectedDispatchDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadPreorder = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/admin/premium-preorders/${id}`);
      const nextPreorder = response.data.preorder;
      setPreorder(nextPreorder);
      setTimeline(response.data.timeline || []);
      setAvailableStatusOptions(response.data.availableStatusOptions || []);
      setStatus(nextPreorder?.status || '');
      setNotes(nextPreorder?.notes || '');
      setExpectedDispatchDate(
        nextPreorder?.expectedDispatchDate
          ? new Date(nextPreorder.expectedDispatchDate).toISOString().slice(0, 10)
          : ''
      );
    } catch (error) {
      console.error('Failed to load premium preorder details:', error);
      enqueueSnackbar(error?.response?.data?.message || 'Failed to load premium preorder.', {
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar, id]);

  useEffect(() => {
    if (id) {
      loadPreorder();
    }
  }, [id, loadPreorder]);

  const productName = useMemo(
    () => preorder?.productSnapshot?.name || preorder?.product?.name || 'Premium Product',
    [preorder]
  );

  const productImage = useMemo(
    () => preorder?.productSnapshot?.coverImage || preorder?.product?.coverImage || '/assets/placeholder.svg',
    [preorder]
  );

  const variantLabel = useMemo(
    () =>
      [preorder?.selectedColor, preorder?.selectedSize].filter(Boolean).join(' / ') ||
      preorder?.productSnapshot?.variantLabel ||
      '-',
    [preorder]
  );

  const showSeparatePaymentStatus = preorder?.paymentStatus && preorder?.paymentStatus !== preorder?.status;

  const statusOptions = useMemo(() => {
    const options = new Set([
      preorder?.status,
      ...availableStatusOptions,
      ...FALLBACK_STATUS_OPTIONS,
    ]);

    return Array.from(options).filter(Boolean);
  }, [availableStatusOptions, preorder?.status]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await axios.patch(`/api/admin/premium-preorders/${id}/status`, {
        status,
        notes,
        expectedDispatchDate: expectedDispatchDate || undefined,
      });
      setPreorder(response.data.preorder);
      setTimeline(response.data.timeline || []);
      setAvailableStatusOptions(response.data.availableStatusOptions || []);
      enqueueSnackbar('Premium preorder updated successfully.', { variant: 'success' });
    } catch (error) {
      console.error('Failed to update premium preorder:', error);
      enqueueSnackbar(error?.response?.data?.message || 'Failed to update premium preorder.', {
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth={settings.themeStretch ? false : 'lg'}>
        <Typography>Loading premium preorder...</Typography>
      </Container>
    );
  }

  if (!preorder) {
    return (
      <Container maxWidth={settings.themeStretch ? false : 'lg'}>
        <Alert severity="error" sx={{ mb: 3 }}>
          Premium preorder was not found.
        </Alert>
        <Button variant="contained" onClick={() => navigate(paths.dashboard.premiumOrder.root)}>
          Back to Premium Orders
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'}>
      <CustomBreadcrumbs
        heading={`Premium Order #${preorder.preorderNumber}`}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Premium Orders', href: paths.dashboard.premiumOrder.root },
          { name: preorder.preorderNumber },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
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
                <Typography variant="h6">Order Information</Typography>
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
                    Preorder Number
                  </Typography>
                  <Typography variant="body2">#{preorder.preorderNumber}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Order Date
                  </Typography>
                  <Typography variant="body2">{fDateTime(preorder.createdAt)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Payment Method
                  </Typography>
                  <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                    {preorder.paymentMethod || 'razorpay'}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Quantity
                  </Typography>
                  <Typography variant="body2">{preorder.quantity || 1}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Variant
                  </Typography>
                  <Typography variant="body2">{variantLabel}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Review Required
                  </Typography>
                  <Typography variant="body2">
                    {preorder.reviewRequired ? 'Yes' : 'No'}
                  </Typography>
                </Stack>
                {preorder.expectedDispatchDate && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Expected Dispatch
                    </Typography>
                    <Typography variant="body2">{fDate(preorder.expectedDispatchDate)}</Typography>
                  </Stack>
                )}
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Razorpay Order ID
                  </Typography>
                  <Typography variant="body2">{preorder.razorpayOrderId || '-'}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Razorpay Payment ID
                  </Typography>
                  <Typography variant="body2">{preorder.razorpayPaymentId || '-'}</Typography>
                </Stack>
                {preorder.failureReason && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Failure Reason
                    </Typography>
                    <Typography variant="body2">{preorder.failureReason}</Typography>
                  </Stack>
                )}
              </Stack>
            </Card>

            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Product Summary
              </Typography>

              <Stack direction="row" spacing={2}>
                <Box
                  component="img"
                  src={productImage}
                  alt={productName}
                  sx={{ width: 88, height: 88, borderRadius: 1.5, objectFit: 'cover', flexShrink: 0 }}
                />

                <Stack spacing={0.75} sx={{ flex: 1 }}>
                  <Typography variant="subtitle1">{productName}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    SKU: {preorder.productSnapshot?.sku || preorder.product?.sku || '-'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Variant: {variantLabel}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Quantity: {preorder.quantity || 1}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Unit Price: {fCurrency(preorder.productSnapshot?.price || preorder.total || 0)}
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
                  <Typography variant="body2">Discount</Typography>
                  <Typography variant="body2">
                    {preorder.discount ? `-${fCurrency(preorder.discount)}` : fCurrency(0)}
                  </Typography>
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
                Activity Timeline
              </Typography>

              <Stack spacing={2}>
                {timeline.length ? (
                  timeline.map((entry, index) => (
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
                    No activity recorded yet.
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
                Customer
              </Typography>

              <Stack spacing={1.5}>
                <Typography variant="subtitle2">
                  {preorder.user?.fullName || preorder.billingAddress?.fullName || 'N/A'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {preorder.user?.email || preorder.billingAddress?.email || '-'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {preorder.user?.phone || preorder.billingAddress?.phone || '-'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  User ID: {preorder.userId}
                </Typography>
              </Stack>
            </Card>

            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Addresses
              </Typography>

              <Stack spacing={2}>
                <Stack spacing={0.5}>
                  <Typography variant="subtitle2">Billing Address</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {renderAddress(preorder.billingAddress)}
                  </Typography>
                </Stack>
                <Stack spacing={0.5}>
                  <Typography variant="subtitle2">Shipping Address</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {renderAddress(preorder.shippingAddress)}
                  </Typography>
                </Stack>
              </Stack>
            </Card>

            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Admin Actions
              </Typography>

              <Stack spacing={2}>
                <TextField
                  select
                  label="Status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  {statusOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {formatOrderStatusLabel(option)}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Expected Dispatch Date"
                  type="date"
                  value={expectedDispatchDate}
                  onChange={(event) => setExpectedDispatchDate(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                />

                <TextField
                  label="Internal Notes"
                  multiline
                  minRows={5}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />

                <Button
                  variant="contained"
                  color="secondary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>

                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => navigate(paths.dashboard.premiumOrder.root)}
                >
                  Back to List
                </Button>
              </Stack>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Container>
  );
}
