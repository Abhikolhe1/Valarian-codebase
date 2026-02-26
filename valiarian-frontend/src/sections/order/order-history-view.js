import { format } from 'date-fns';
import { useEffect, useState } from 'react';
// @mui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
// routes
import { useRouter } from 'src/routes/hook';
import { paths } from 'src/routes/paths';
// auth
import { useAuthContext } from 'src/auth/hooks';
// utils
import axios from 'src/utils/axios';
import { fCurrency } from 'src/utils/format-number';
// components
import EmptyContent from 'src/components/empty-content';
import Iconify from 'src/components/iconify';
import Label from 'src/components/label';
import { useSettingsContext } from 'src/components/settings';

// ----------------------------------------------------------------------

export default function OrderHistoryView() {
  const settings = useSettingsContext();
  const router = useRouter();
  const { authenticated, user } = useAuthContext();

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authenticated) {
      router.push(paths.auth.jwt.login);
    }
  }, [authenticated, router]);

  // Load orders from backend
  useEffect(() => {
    const loadOrders = async () => {
      if (!authenticated || !user) return;

      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(`/api/orders/user/${user.id}`);
        const ordersData = response.data.orders || [];

        // Sort orders in reverse chronological order (newest first)
        const sortedOrders = ordersData.sort((a, b) =>
          new Date(b.createdAt) - new Date(a.createdAt)
        );

        setOrders(sortedOrders);
      } catch (err) {
        console.error('Error loading orders:', err);
        setError(err.message || 'Failed to load orders');

        // If 404, just show empty state
        if (err.status === 404 || err.statusCode === 404) {
          setOrders([]);
          setError(null);
        }
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [authenticated, user]);

  const handleViewOrder = (orderId) => {
    router.push(paths.order.details(orderId));
  };

  const handleTrackOrder = (orderId) => {
    router.push(paths.order.tracking(orderId));
  };

  if (!authenticated) {
    return null;
  }

  const empty = !loading && orders.length === 0;

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'} sx={{ py: { xs: 5, md: 10 } }}>
      <Typography variant="h3" sx={{ mb: 5 }}>
        Order History
      </Typography>

      {error && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography color="error">{error}</Typography>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent>
            <Typography>Loading orders...</Typography>
          </CardContent>
        </Card>
      )}

      {!loading && empty && (
        <EmptyContent
          filled
          title="No Orders Yet!"
          description="You haven't placed any orders. Start shopping and your orders will appear here."
          imgUrl="/assets/icons/empty/ic_cart.svg"
          sx={{
            py: 10,
          }}
          action={
            <Button
              variant="contained"
              startIcon={<Iconify icon="eva:shopping-bag-fill" />}
              onClick={() => router.push(paths.product.root)}
            >
              Start Shopping
            </Button>
          }
        />
      )}

      {!loading && !empty && (
        <Stack spacing={3}>
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onViewOrder={() => handleViewOrder(order.id)}
              onTrackOrder={() => handleTrackOrder(order.id)}
            />
          ))}
        </Stack>
      )}
    </Container>
  );
}

// ----------------------------------------------------------------------

function OrderCard({ order, onViewOrder, onTrackOrder }) {
  const {
    orderNumber,
    createdAt,
    status,
    total,
    items = [],
    subtotal,
    shipping,
    discount,
  } = order;

  const getStatusColor = (orderStatus) => {
    switch (orderStatus) {
      case 'completed':
      case 'delivered':
        return 'success';
      case 'pending':
      case 'processing':
        return 'warning';
      case 'cancelled':
      case 'refunded':
        return 'error';
      case 'shipped':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Card>
      <CardContent>
        <Grid container spacing={3}>
          {/* Order Header */}
          <Grid xs={12}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              spacing={2}
            >
              <Box>
                <Typography variant="h6" gutterBottom>
                  Order #{orderNumber}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Placed on {format(new Date(createdAt), 'MMM dd, yyyy')} at{' '}
                  {format(new Date(createdAt), 'h:mm a')}
                </Typography>
              </Box>

              <Label variant="soft" color={getStatusColor(status)}>
                {status}
              </Label>
            </Stack>
          </Grid>

          <Grid xs={12}>
            <Divider />
          </Grid>

          {/* Order Items */}
          <Grid xs={12} md={8}>
            <Typography variant="subtitle2" gutterBottom>
              Items ({items.length})
            </Typography>
            <Stack spacing={2} sx={{ mt: 2 }}>
              {items.slice(0, 3).map((item, index) => (
                <Stack key={index} direction="row" spacing={2} alignItems="center">
                  <Box
                    component="img"
                    src={item.image || '/assets/placeholder.svg'}
                    alt={item.name}
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: 1,
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="body2" noWrap>
                      {item.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Qty: {item.quantity} × {fCurrency(item.price)}
                    </Typography>
                  </Box>
                </Stack>
              ))}
              {items.length > 3 && (
                <Typography variant="caption" color="text.secondary">
                  +{items.length - 3} more items
                </Typography>
              )}
            </Stack>
          </Grid>

          {/* Order Summary */}
          <Grid xs={12} md={4}>
            <Typography variant="subtitle2" gutterBottom>
              Order Summary
            </Typography>
            <Stack spacing={1} sx={{ mt: 2 }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Subtotal
                </Typography>
                <Typography variant="body2">{fCurrency(subtotal || 0)}</Typography>
              </Stack>
              {discount > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Discount
                  </Typography>
                  <Typography variant="body2" color="error.main">
                    -{fCurrency(discount)}
                  </Typography>
                </Stack>
              )}
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Shipping
                </Typography>
                <Typography variant="body2">{fCurrency(shipping || 0)}</Typography>
              </Stack>
              <Divider />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="subtitle1">Total</Typography>
                <Typography variant="subtitle1">{fCurrency(total)}</Typography>
              </Stack>
            </Stack>
          </Grid>

          <Grid xs={12}>
            <Divider />
          </Grid>

          {/* Actions */}
          <Grid xs={12}>
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button
                variant="outlined"
                startIcon={<Iconify icon="eva:eye-outline" />}
                onClick={onViewOrder}
              >
                View Details
              </Button>
              <Button
                variant="contained"
                startIcon={<Iconify icon="eva:navigation-2-outline" />}
                onClick={onTrackOrder}
              >
                Track Order
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

OrderCard.propTypes = {
  order: PropTypes.shape({
    id: PropTypes.string,
    orderNumber: PropTypes.string,
    createdAt: PropTypes.string,
    status: PropTypes.string,
    total: PropTypes.number,
    items: PropTypes.array,
    subtotal: PropTypes.number,
    shipping: PropTypes.number,
    discount: PropTypes.number,
  }),
  onViewOrder: PropTypes.func,
  onTrackOrder: PropTypes.func,
};
