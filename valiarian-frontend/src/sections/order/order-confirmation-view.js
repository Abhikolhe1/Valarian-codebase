import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
// @mui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
// routes
import { paths } from 'src/routes/paths';
// utils
import axios from 'src/utils/axios';
import { fCurrency } from 'src/utils/format-number';
import { fDateTime } from 'src/utils/format-time';
// components
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';

// ----------------------------------------------------------------------

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.data?.message || error?.message || 'Failed to load order';

export default function OrderConfirmationView() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const settings = useSettingsContext();

  const [order, setOrder] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`/api/orders/${orderId}`);
      setOrder(response.data.order);
      setInvoice(response.data.invoice || null);
    } catch (fetchError) {
      console.error('Error fetching confirmed order:', fetchError);
      setError(getErrorMessage(fetchError));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId, fetchOrder]);

  const themeStretch = settings.themeStretch;

  if (loading) {
    return (
      <Container maxWidth={themeStretch ? false : 'lg'} sx={{ py: 10 }}>
        <Typography>Loading order details...</Typography>
      </Container>
    );
  }

  if (error || !order) {
    return (
      <Container maxWidth={themeStretch ? false : 'lg'} sx={{ py: 10 }}>
        <Card sx={{ p: 4 }}>
          <Stack spacing={2}>
            <Typography variant="h5">We couldn&apos;t load this order</Typography>
            <Typography color="text.secondary">{error || 'Order not found'}</Typography>
            <Stack direction="row" spacing={2}>
              <Button variant="contained" onClick={() => navigate(paths.order.history)}>
                Go to Order History
              </Button>
              <Button variant="outlined" onClick={() => navigate(paths.product.root)}>
                Continue Shopping
              </Button>
            </Stack>
          </Stack>
        </Card>
      </Container>
    );
  }

  const paymentLabel =
    order.paymentMethod === 'razorpay' ? 'Online Payment' : 'Cash on Delivery';
  const actualPrice = (order.items || []).reduce(
    (sum, item) =>
      sum + Math.max(Number(item.originalPrice || item.price || 0), Number(item.price || 0)) * Number(item.quantity || 0),
    0
  );
  const salePrice = Number(order.subtotal || 0);
  const productDiscount = Math.max(actualPrice - salePrice, 0);

  return (
    <Container maxWidth={themeStretch ? false : 'lg'} sx={{ py: { xs: 5, md: 8 } }}>
      <Stack spacing={3}>
        <Card sx={{ p: { xs: 3, md: 5 }, textAlign: 'center' }}>
          <Iconify icon="solar:check-circle-bold-duotone" width={72} height={72} sx={{ color: 'success.main', mb: 2 }} />
          <Typography variant="h3" gutterBottom>
            Order placed successfully
          </Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 560, mx: 'auto', mb: 2 }}>
            Your order has been received and is now in our system. You can track progress from
            your order history at any time.
          </Typography>
          <Typography variant="h6" color="primary.main">
            Order #{order.orderNumber}
          </Typography>
        </Card>

        <Grid container spacing={3}>
          <Grid xs={12} md={8}>
            <Card sx={{ p: 3 }}>
              <Stack spacing={2.5}>
                <Typography variant="h6">Order snapshot</Typography>
                <Divider />

                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Placed on</Typography>
                  <Typography>{fDateTime(order.createdAt)}</Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Order status</Typography>
                  <Typography sx={{ textTransform: 'capitalize' }}>{order.status}</Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Payment method</Typography>
                  <Typography>{paymentLabel}</Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Payment status</Typography>
                  <Typography sx={{ textTransform: 'capitalize' }}>
                    {order.paymentStatus}
                  </Typography>
                </Stack>
              </Stack>
            </Card>

            <Card sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Items
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Stack spacing={2.5}>
                {order.items?.map((item) => (
                  <Stack key={item.id} direction="row" spacing={2} alignItems="center">
                    <Box
                      component="img"
                      src={item.image || '/assets/placeholder.svg'}
                      alt={item.name}
                      sx={{
                        width: 72,
                        height: 72,
                        borderRadius: 1.5,
                        objectFit: 'cover',
                        flexShrink: 0,
                      }}
                    />

                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2">{item.name}</Typography>
                      {(item.colorName || item.size) && (
                        <Typography variant="body2" color="text.secondary">
                          {[item.colorName, item.size].filter(Boolean).join(' • ')}
                        </Typography>
                      )}
                      <Typography variant="body2" color="text.secondary">
                        Qty: {item.quantity}
                      </Typography>
                    </Box>

                    <Typography variant="subtitle2">{fCurrency(item.subtotal)}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Card>
          </Grid>

          <Grid xs={12} md={4}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Order summary
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Actual Price</Typography>
                  <Typography>{fCurrency(actualPrice || salePrice)}</Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Sale Price</Typography>
                  <Typography>{fCurrency(salePrice)}</Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Product Discount</Typography>
                  <Typography color={productDiscount ? 'error.main' : 'text.primary'}>
                    {productDiscount ? `- ${fCurrency(productDiscount)}` : '-'}
                  </Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Coupon Discount</Typography>
                  <Typography color={order.discount ? 'error.main' : 'text.primary'}>
                    {order.discount ? `- ${fCurrency(order.discount)}` : '-'}
                  </Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Delivery Charge</Typography>
                  <Typography sx={{ minWidth: 140, textAlign: 'right' }}>
                    {order.shipping ? `${fCurrency(order.shipping)} included` : 'Included'}
                  </Typography>
                </Stack>

                {order.tax > 0 && (
                  <>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography color="text.secondary">Tax</Typography>
                      <Typography>{fCurrency(order.tax)}</Typography>
                    </Stack>

                    {invoice?.taxation?.cgst > 0 && (
                      <Stack direction="row" justifyContent="space-between">
                        <Typography color="text.secondary">
                          CGST
                          {invoice?.taxation?.cgstRate
                            ? ` (${invoice.taxation.cgstRate}%)`
                            : ''}
                        </Typography>
                        <Typography>{fCurrency(invoice.taxation.cgst)}</Typography>
                      </Stack>
                    )}

                    {invoice?.taxation?.sgst > 0 && (
                      <Stack direction="row" justifyContent="space-between">
                        <Typography color="text.secondary">
                          SGST
                          {invoice?.taxation?.sgstRate
                            ? ` (${invoice.taxation.sgstRate}%)`
                            : ''}
                        </Typography>
                        <Typography>{fCurrency(invoice.taxation.sgst)}</Typography>
                      </Stack>
                    )}

                    {invoice?.taxation?.igst > 0 && (
                      <Stack direction="row" justifyContent="space-between">
                        <Typography color="text.secondary">
                          IGST
                          {invoice?.taxation?.igstRate
                            ? ` (${invoice.taxation.igstRate}%)`
                            : ''}
                        </Typography>
                        <Typography>{fCurrency(invoice.taxation.igst)}</Typography>
                      </Stack>
                    )}
                  </>
                )}

                <Divider />

                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="subtitle1">Total</Typography>
                  <Typography variant="subtitle1" color="primary.main">
                    {fCurrency(order.total)}
                  </Typography>
                </Stack>
              </Stack>
            </Card>

            <Card sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Delivery address
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Stack spacing={0.75}>
                <Typography variant="subtitle2">{order.shippingAddress?.fullName}</Typography>
                <Typography color="text.secondary">{order.shippingAddress?.address}</Typography>
                <Typography color="text.secondary">
                  {order.shippingAddress?.city}, {order.shippingAddress?.state}{' '}
                  {order.shippingAddress?.zipCode}
                </Typography>
                <Typography color="text.secondary">{order.shippingAddress?.country}</Typography>
                <Typography color="text.secondary">
                  Phone: {order.shippingAddress?.phone || '-'}
                </Typography>
              </Stack>
            </Card>

            <Stack spacing={2} sx={{ mt: 3 }}>
              {invoice?.invoiceNumber && (
                <Card sx={{ p: 3 }}>
                  <Stack spacing={1}>
                    <Typography variant="h6">Invoice</Typography>
                    <Typography color="text.secondary">
                      {invoice.invoiceNumber}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      GSTIN: {invoice.seller?.gstNumber}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      HSN/SAC: {invoice.taxation?.hsnSac}
                    </Typography>
                  </Stack>
                </Card>
              )}

              <Button
                fullWidth
                variant="contained"
                startIcon={<Iconify icon="eva:eye-outline" />}
                onClick={() => navigate(paths.order.details(order.id))}
              >
                View Order Details
              </Button>

              <Button
                fullWidth
                variant="outlined"
                startIcon={<Iconify icon="eva:navigation-2-outline" />}
                onClick={() => navigate(paths.order.tracking(order.id))}
              >
                Track Order
              </Button>

              <Button fullWidth variant="text" onClick={() => navigate(paths.product.root)}>
                Continue Shopping
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Stack>
    </Container>
  );
}
