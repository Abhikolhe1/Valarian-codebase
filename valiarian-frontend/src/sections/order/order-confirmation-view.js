import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
// @mui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
// utils
import axios from 'src/utils/axios';
import { fCurrency } from 'src/utils/format-number';
import { fDate } from 'src/utils/format-time';
// components
import Iconify from 'src/components/iconify';
import Image from 'src/components/image';

// ----------------------------------------------------------------------

export default function OrderConfirmationView() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await axios.get(`/api/orders/${orderId}`);
        setOrder(response.data.order);
      } catch (err) {
        console.error('Error fetching order:', err);
        setError(err.response?.data?.message || 'Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  if (loading) {
    return (
      <Container sx={{ py: 10, textAlign: 'center' }}>
        <Typography>Loading order details...</Typography>
      </Container>
    );
  }

  if (error || !order) {
    return (
      <Container sx={{
        py: 10,
        success.main', mb: 2 }} />
          <Typography variant = "h3" gutterBottom>
            Order Placed Successfully!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Thank you for your order. We've received your order and will process it shortly.
          </Typography>
          <Typography variant="h6" color="primary">
            Order #{order.orderNumber}
          </Typography>
        </ Card>

        <Grid container spacing={3}>
          {/* Order Details */}
          <Grid xs={12} md={8}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Order Details
              </Typography>
              <Divider sx={{ my: 2 }} />

              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Order Date
                  </Typography>
                  <Typography variant="body2">
                    {fDate(order.createdAt)}
                  </Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                    {order.status}
                  </Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Payment Method
                  </Typography>
                  <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                    {order.paymentMethod === 'razorpay' ? 'Online Payment' : 'Cash on Delivery'}
                  </Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Payment Status
                  </Typography>
                  <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                    {order.paymentStatus}
                  </Typography>
                </Stack>

                {order.estimatedDelivery && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Estimated Delivery
                    </Typography>
                    <Typography variant="body2">
                      {fDate(order.estimatedDelivery)}
                    </Typography>
                  </Stack>
                )}
              </Stack>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom>
                Order Items
              </Typography>

              <Stack spacing={2} sx={{ mt: 2 }}>
                {order.items.map((item) => (
                  <Stack key={item.id} direction="row" spacing={2}>
                    <Image
                      src={item.image}
                      sx={{ width: 64, height: 64, borderRadius: 1, flexShrink: 0 }}
                    />
                    <Stack spacing={0.5} sx={{ flex: 1 }}>
                      <Typography variant="subtitle2">{item.name}</Typography>
                      {item.colorName && (
                        <Typography variant="caption" color="text.secondary">
                          Color: {item.colorName}
                        </Typography>
                      )}
                      {item.size && (
                        <Typography variant="caption" color="text.secondary">
                          Size: {item.size}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        Qty: {item.quantity}
                      </Typography>
                    </Stack>
                    <Typography variant="subtitle2">
                      {fCurrency(item.subtotal)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Card>

            {/* Shipping Address */}
            <Card sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Shipping Address
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2">{order.shippingAddress.fullName}</Typography>
              <Typography variant="body2" color="text.secondary">
                {order.shippingAddress.address}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                {order.shippingAddress.zipCode}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {order.shippingAddress.country}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Phone: {order.shippingAddress.phone}
              </Typography>
            </Card>
          </Grid>

          {/* Order Summary */}
          <Grid xs={12} md={4}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Order Summary
              </Typography>
              <Divider sx={{ my: 2 }} />

              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Subtotal
                  </Typography>
                  <Typography variant="body2">{fCurrency(order.subtotal)}</Typography>
                </Stack>

                {order.discount > 0 && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Discount
                    </Typography>
                    <Typography variant="body2" color="error.main">
                      -{fCurrency(order.discount)}
                    </Typography>
                  </Stack>
                )}

                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Shipping
                  </Typography>
                  <Typography variant="body2">
                    {order.shipping === 0 ? 'Free' : fCurrency(order.shipping)}
                  </Typography>
                </Stack>

                {order.tax > 0 && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Tax
                    </Typography>
                    <Typography variant="body2">{fCurrency(order.tax)}</Typography>
                  </Stack>
                )}

                <Divider />

                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="subtitle1">Total</Typography>
                  <Typography variant="subtitle1" color="primary">
                    {fCurrency(order.total)}
                  </Typography>
                </Stack>
              </Stack>
            </Card>

            {/* Action Buttons */}
            <Stack spacing={2} sx={{ mt: 3 }}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Iconify icon="eva:eye-outline" />}
                onClick={() => navigate(`/orders/${order.id}`)}
              >
                View Order Details
              </Button>

              <Button
                fullWidth
                variant="outlined"
                startIcon={<Iconify icon="eva:navigation-2-outline" />}
                onClick={() => navigate(`/orders/${order.id}/tracking`)}
              >
                Track Order
              </Button>

              <Button
                fullWidth
                variant="text"
                onClick={() => navigate('/products')}
              >
                Continue Shopping
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Stack>
    </Container >
  );
  }
