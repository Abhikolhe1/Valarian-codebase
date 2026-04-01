import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import Label from 'src/components/label';
import { useSettingsContext } from 'src/components/settings';
import { useSnackbar } from 'src/components/snackbar';
import { paths } from 'src/routes/paths';
import axios from 'src/utils/axios';
import { fCurrency } from 'src/utils/format-number';
import { fDateTime } from 'src/utils/format-time';

const STATUS_OPTIONS = [
  'initiated',
  'paid',
  'payment_failed',
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
    case 'ready_to_fulfill':
    case 'reserved':
      return 'warning';
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
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadPreorder = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/admin/premium-preorders/${id}`);
      const nextPreorder = response.data.preorder;
      setPreorder(nextPreorder);
      setStatus(nextPreorder?.status || '');
      setNotes(nextPreorder?.notes || '');
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

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await axios.patch(`/api/admin/premium-preorders/${id}/status`, {
        status,
        notes,
      });
      setPreorder(response.data.preorder);
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

  let content = <Typography>Loading premium preorder...</Typography>;

  if (!loading && !preorder) {
    content = <Alert severity="error">Premium preorder was not found.</Alert>;
  } else if (!loading && preorder) {
    content = (
      <Grid container spacing={3}>
        <Grid xs={12} md={8}>
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                    <Typography variant="h5">#{preorder.preorderNumber}</Typography>
                    <Label
                      variant="soft"
                      color={getStatusColor(preorder.status)}
                      sx={{ textTransform: 'capitalize' }}
                    >
                      {String(preorder.status || '').replace(/_/g, ' ')}
                    </Label>
                    <Label
                      variant="soft"
                      color={getStatusColor(preorder.paymentStatus)}
                      sx={{ textTransform: 'capitalize' }}
                    >
                      {String(preorder.paymentStatus || '').replace(/_/g, ' ')}
                    </Label>
                  </Stack>

                  <Typography variant="subtitle1">{productName}</Typography>
                  <Typography color="text.secondary">
                    Variant:{' '}
                    {preorder.selectedSize || preorder.productSnapshot?.variantLabel || '-'}
                  </Typography>
                  <Typography color="text.secondary">
                    Ordered on {fDateTime(preorder.createdAt)}
                  </Typography>
                  <Typography color="text.secondary">
                    Razorpay Order ID: {preorder.razorpayOrderId || '-'}
                  </Typography>
                  <Typography color="text.secondary">
                    Razorpay Payment ID: {preorder.razorpayPaymentId || '-'}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Stack spacing={1.5}>
                  <Typography variant="h6">Customer</Typography>
                  <Typography>
                    {preorder.user?.fullName || preorder.billingAddress?.fullName || 'N/A'}
                  </Typography>
                  <Typography color="text.secondary">
                    {preorder.user?.email || preorder.billingAddress?.email || '-'}
                  </Typography>
                  <Typography color="text.secondary">
                    {preorder.user?.phone || preorder.billingAddress?.phone || '-'}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">Addresses</Typography>
                  <Typography color="text.secondary">
                    Billing: {renderAddress(preorder.billingAddress)}
                  </Typography>
                  <Typography color="text.secondary">
                    Shipping: {renderAddress(preorder.shippingAddress)}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        <Grid xs={12} md={4}>
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">Amount</Typography>
                  <Typography variant="h4" color="secondary.main">
                    {fCurrency(preorder.total)}
                  </Typography>
                  <Typography color="text.secondary">
                    Currency: {preorder.currency || 'INR'}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">Fulfillment</Typography>
                  <TextField
                    select
                    label="Status"
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option.replace(/_/g, ' ')}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Notes"
                    multiline
                    minRows={4}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    Save Changes
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => navigate(paths.dashboard.premiumOrder.root)}
                  >
                    Back to List
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    );
  }

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'}>
      <CustomBreadcrumbs
        heading="Premium Order Details"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Premium Orders', href: paths.dashboard.premiumOrder.root },
          { name: preorder?.preorderNumber || 'Details' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {content}
    </Container>
  );
}
