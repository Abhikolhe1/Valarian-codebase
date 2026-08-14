import { format } from 'date-fns';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LoadingButton from '@mui/lab/LoadingButton';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
import { Link } from '@mui/material';
import EmptyContent from 'src/components/empty-content';
import Iconify from 'src/components/iconify';
import Label from 'src/components/label';
import { useSettingsContext } from 'src/components/settings';
import { useAuthContext } from 'src/auth/hooks';
import { useRouter } from 'src/routes/hook';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import axios, { endpoints } from 'src/utils/axios';
import { fCurrency } from 'src/utils/format-number';
import {
  formatOrderStatusLabel,
  getOrderDisplayColor,
  getOrderDisplayLabel,
  shouldPollOrderStatus,
} from 'src/utils/order-status';

const getPremiumStatusColor = (status) => {
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

const isPremiumFinalState = (status, paymentStatus) =>
  ['fulfilled', 'cancelled', 'refunded', 'failed', 'payment_failed'].includes(status) ||
  ['failed', 'refunded'].includes(paymentStatus);

const shouldPollPremiumPreorderStatus = (status, paymentStatus) =>
  !isPremiumFinalState(status, paymentStatus);

const getErrorMessage = (err) =>
  err?.response?.data?.message || err?.data?.message || err?.message || 'Failed to load orders';

const ORDERS_PAGE_SIZE = 10;

const normalizeStandardOrder = (order) => ({
  id: order.id,
  type: 'standard',
  orderNumber: order.orderNumber,
  createdAt: order.createdAt,
  status: order.status,
  returnStatus: order.returnStatus,
  paymentStatus: order.paymentStatus,
  total: order.total,
  subtotal: order.subtotal,
  shipping: order.shipping,
  discount: order.discount,
  items: Array.isArray(order.items) ? order.items : [],
  detailsPath: paths.order.details(order.id),
  trackingPath: paths.order.tracking(order.id),
  displayLabel: getOrderDisplayLabel(order.status, order.returnStatus),
  displayColor: getOrderDisplayColor(order.status, order.returnStatus),
  shouldPoll: shouldPollOrderStatus(order.status, order.returnStatus),
  badge: null,
});

const normalizePremiumPreorder = (preorder) => {
  const item = {
    id: preorder.id,
    productId: preorder.productId,
    name: preorder.productSnapshot?.name || preorder.product?.name || 'Premium Product',
    image: preorder.productSnapshot?.coverImage || preorder.product?.coverImage || '/assets/placeholder.svg',
    slug: preorder.productSnapshot?.slug || preorder.product?.slug || preorder.productId,
    variantId: preorder.selectedVariantId,
    quantity: preorder.quantity || 1,
    price: preorder.productSnapshot?.price || preorder.total || 0,
  };

  return {
    id: preorder.id,
    type: 'premium',
    orderNumber: preorder.preorderNumber,
    createdAt: preorder.createdAt,
    status: preorder.status,
    paymentStatus: preorder.paymentStatus,
    total: preorder.total,
    subtotal: preorder.subtotal,
    shipping: preorder.shipping,
    discount: preorder.discount,
    items: [item],
    detailsPath: paths.order.premiumDetails(preorder.id),
    trackingPath: null,
    displayLabel: formatOrderStatusLabel(preorder.status),
    displayColor: getPremiumStatusColor(preorder.status),
    shouldPoll: shouldPollPremiumPreorderStatus(preorder.status, preorder.paymentStatus),
    badge: 'Premium Preorder',
  };
};

const normalizeHistoryEntry = (entry) =>
  entry.type === 'premium'
    ? normalizePremiumPreorder(entry.preorder)
    : normalizeStandardOrder(entry.order);

const fetchOrderHistoryPage = async (page, limit) => {
  const response = await axios
    .get(`${endpoints.orders.history}?page=${page}&limit=${limit}`)
    .catch((err) => {
      if ([404].includes(err?.response?.status || err?.status || err?.statusCode)) {
        return { data: { entries: [], pagination: { hasMore: false, total: 0 } } };
      }
      throw err;
    });

  return {
    orders: (response.data.entries || []).map(normalizeHistoryEntry),
    hasMore: Boolean(response.data.pagination?.hasMore),
    total: response.data.pagination?.total ?? 0,
  };
};

export default function OrderHistoryView() {
  const settings = useSettingsContext();
  const router = useRouter();
  const { authenticated, user } = useAuthContext();

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!authenticated) {
      router.push(paths.auth.jwt.login);
    }
  }, [authenticated, router]);

  useEffect(() => {
    const loadOrders = async () => {
      if (!authenticated || !user?.id) return;

      try {
        setLoading(true);
        setError(null);

        const firstPage = await fetchOrderHistoryPage(1, ORDERS_PAGE_SIZE);

        setOrders(firstPage.orders);
        setHasMore(firstPage.hasMore);
        setTotal(firstPage.total);
        setPage(1);
      } catch (err) {
        console.error('Error loading orders:', err);
        setError(getErrorMessage(err));
        setOrders([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [authenticated, user?.id]);

  const handleShowMore = async () => {
    if (loadingMore || !hasMore) return;

    const nextPage = page + 1;

    try {
      setLoadingMore(true);
      setError(null);

      const { orders: nextOrders, hasMore: more, total: nextTotal } =
        await fetchOrderHistoryPage(nextPage, ORDERS_PAGE_SIZE);

      // Guard against an order shifting pages between calls.
      setOrders((current) => {
        const seen = new Set(current.map((order) => `${order.type}-${order.id}`));
        return [...current, ...nextOrders.filter((o) => !seen.has(`${o.type}-${o.id}`))];
      });
      setHasMore(more);
      setTotal(nextTotal);
      setPage(nextPage);
    } catch (err) {
      console.error('Error loading more orders:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!authenticated || !user?.id) {
      return undefined;
    }

    const hasActiveOrders = orders.some((order) => order.shouldPoll);

    if (!hasActiveOrders) {
      return undefined;
    }

    const interval = setInterval(async () => {
      try {
        // Refresh only what is on screen, as one call rather than page by page.
        const loaded = await fetchOrderHistoryPage(1, page * ORDERS_PAGE_SIZE);

        setOrders(loaded.orders);
        setHasMore(loaded.hasMore);
        setTotal(loaded.total);
      } catch (err) {
        console.error('Error refreshing orders:', err);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [authenticated, orders, page, user?.id]);

  if (!authenticated) {
    return null;
  }

  const empty = !loading && orders.length === 0;

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'} sx={{ py: { xs: 5, md: 10 } }}>
      <Typography variant="h3" sx={{ mb: 1 }}>
        Order History
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 5 }}>
        Your regular orders and premium preorders appear together here.
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
          description="You haven't placed any orders yet. Your regular orders and premium preorders will appear here."
          imgUrl="/assets/icons/empty/ic_cart.svg"
          sx={{ py: 10 }}
          action={
            <Button
              variant="contained"
              startIcon={<Iconify icon="eva:shopping-bag-fill" />}
              onClick={() => router.push(paths.product.root)}
              sx={{ mt: { xs: 2, md: 4 } }}
            >
              Start Shopping
            </Button>
          }
        />
      )}

      {!loading && !empty && (
        <Stack spacing={3}>
          {orders.map((order) => (
            <OrderCard key={`${order.type}-${order.id}`} order={order} />
          ))}

          {hasMore && (
            <Stack alignItems="center" spacing={1} sx={{ pt: 1 }}>
              <LoadingButton
                variant="outlined"
                color="inherit"
                size="large"
                loading={loadingMore}
                onClick={handleShowMore}
                endIcon={<Iconify icon="eva:arrow-ios-downward-fill" />}
              >
                Show more
              </LoadingButton>

              <Typography variant="caption" color="text.secondary">
                Showing {orders.length} of {total}
              </Typography>
            </Stack>
          )}
        </Stack>
      )}
    </Container>
  );
}

function OrderCard({ order }) {
  const router = useRouter();
  const { orderNumber, createdAt, total, items = [], subtotal, shipping, discount, badge, type } = order;

  return (
    <Card>
      <CardContent>
        <Grid container spacing={3}>
          <Grid xs={12}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              spacing={2}
            >
              <Box>
                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                  <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
                    {type === 'premium' ? 'Premium Preorder' : 'Order'} #{orderNumber}
                  </Typography>
                  {badge && <Chip label={badge} color="secondary" size="small" />}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Placed on {format(new Date(createdAt), 'MMM dd, yyyy')} at{' '}
                  {format(new Date(createdAt), 'h:mm a')}
                </Typography>
              </Box>

              <Label variant="soft" color={order.displayColor}>
                {order.displayLabel}
              </Label>
            </Stack>
          </Grid>

          <Grid xs={12}>
            <Divider />
          </Grid>

          <Grid xs={12} md={8}>
            <Typography variant="subtitle2" gutterBottom>
              Items ({items.length})
            </Typography>
            <Stack spacing={2} sx={{ mt: 2 }}>
              {items.slice(0, 3).map((item, index) => {
                const productHref = `${paths.product.details(item.productId || item.slug || item.id)}${
                  item.variantId ? `?variantId=${encodeURIComponent(item.variantId)}` : ''
                }`;

                return (
                  <Stack key={`${item.id || item.productId}-${index}`} direction="row" spacing={2} alignItems="center">
                    <Link component={RouterLink} href={productHref} color="inherit" underline="none">
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
                    </Link>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="body2" noWrap>
                        {item.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Qty: {item.quantity} x {fCurrency(item.price)}
                      </Typography>
                    </Box>
                  </Stack>
                );
              })}
            </Stack>
          </Grid>

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
                  Delivery Charge
                </Typography>
                <Typography variant="body2">
                  {shipping ? `${fCurrency(shipping)} included` : 'Included'}
                </Typography>
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

          <Grid xs={12}>
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<Iconify icon="eva:eye-outline" />}
                onClick={() => router.push(order.detailsPath)}
              >
                View Details
              </Button>
              {order.type === 'standard' && order.trackingPath && (
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<Iconify icon="eva:navigation-2-outline" />}
                  onClick={() => router.push(order.trackingPath)}
                >
                  Track Order
                </Button>
              )}
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
    type: PropTypes.string,
    orderNumber: PropTypes.string,
    createdAt: PropTypes.string,
    total: PropTypes.number,
    subtotal: PropTypes.number,
    shipping: PropTypes.number,
    discount: PropTypes.number,
    items: PropTypes.array,
    detailsPath: PropTypes.string,
    trackingPath: PropTypes.string,
    displayLabel: PropTypes.string,
    displayColor: PropTypes.string,
    badge: PropTypes.string,
  }),
};
