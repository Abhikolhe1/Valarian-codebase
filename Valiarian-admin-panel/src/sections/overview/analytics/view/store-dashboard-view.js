import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  LinearProgress,
  Link,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import axios from 'src/utils/axios';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import Chart, { useChart } from 'src/components/chart';
import { useSettingsContext } from 'src/components/settings';

const money = (value, currency = 'INR') => {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(value);
  } catch {
    return `${currency || 'Unknown currency'} ${Number(value).toLocaleString('en-IN')}`;
  }
};
const label = (value) => value.replace(/_/g, ' ');
const shortDate = (value) =>
  new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
const grid = { display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' } };

export default function StoreDashboardView() {
  const settings = useSettingsContext();
  const [days, setDays] = useState(30);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setData(null);
    axios
      .get('/api/dashboard/summary', { params: { days }, signal: controller.signal })
      .then((response) => {
        if (!controller.signal.aborted) setData(response.data);
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(
            reason?.error?.message ||
              reason?.message ||
              (typeof reason === 'string' ? reason : 'Unable to load dashboard.')
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [days, revision]);

  const trend = data
    ? Array.from({ length: data.period.days }, (_, index) => {
        const day = new Date(data.period.start);
        day.setUTCDate(day.getUTCDate() + index);
        const key = day.toISOString().slice(0, 10);
        return { day: key, orders: data.daily.find((item) => item.day === key)?.orders || 0 };
      })
    : [];
  const chartOptions = useChart({
    chart: { toolbar: { show: false }, animations: { enabled: false } },
    colors: ['#00897b'],
    stroke: { curve: 'straight', width: 2 },
    xaxis: { type: 'datetime' },
    yaxis: { min: 0, forceNiceScale: true, labels: { formatter: (value) => Math.round(value) } },
    tooltip: { x: { format: 'dd MMM yyyy' } },
    dataLabels: { enabled: false },
  });

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <Stack spacing={3}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ sm: 'center' }}
        >
          <Box>
            <Typography variant="overline" color="text.secondary">
              VALIARIAN / STORE OVERVIEW
            </Typography>
            <Typography variant="h4">Store dashboard</Typography>
            <Typography variant="body2" color="text.secondary">
              Orders, catalogue and SEO readiness
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <TextField
              select
              size="small"
              label="Order period"
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
              sx={{ minWidth: 160 }}
            >
              {[7, 30, 90].map((value) => (
                <MenuItem key={value} value={value}>
                  Last {value} days
                </MenuItem>
              ))}
            </TextField>
            <Button
              variant="outlined"
              disabled={loading}
              onClick={() => setRevision((value) => value + 1)}
            >
              Refresh
            </Button>
          </Stack>
        </Stack>
        {loading && (
          <Box role="status">
            <LinearProgress />
            <Typography sx={{ mt: 1 }} variant="body2">
              Loading store data…
            </Typography>
          </Box>
        )}
        {error && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" onClick={() => setRevision((value) => value + 1)}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        )}
        {data && (
          <>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                label={`${data.environment} backend`}
                color={data.environment === 'Production' ? 'success' : 'warning'}
              />
              <Typography variant="caption" color="text.secondary">
                Retrieved {new Date(data.generatedAt).toLocaleString('en-IN')} · Refresh to update
              </Typography>
            </Stack>
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
                Order performance · {shortDate(data.period.start)} – {shortDate(data.period.end)}{' '}
                (UTC, today included)
              </Typography>
              <Box sx={grid}>
                {[
                  [
                    'Orders placed',
                    data.orders.total.toLocaleString('en-IN'),
                    'All payment and fulfilment statuses',
                  ],
                  [
                    'Paid order value · INR',
                    money(data.orders.paidValue),
                    'Current paid/success status only; not net revenue',
                  ],
                  [
                    'Paid orders · INR',
                    data.orders.paidOrders.toLocaleString('en-IN'),
                    'Excludes pending, failed and refunded payments',
                  ],
                ].map(([title, value, note]) => (
                  <Card key={title}>
                    <CardContent>
                      <Typography color="text.secondary" variant="subtitle2">
                        {title}
                      </Typography>
                      <Typography variant="h3" sx={{ my: 1, overflowWrap: 'anywhere' }}>
                        {value}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {note}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Box>
            {data.orders.otherCurrencyOrders > 0 && (
              <Alert severity="info">
                {data.orders.otherCurrencyOrders} non-INR or unspecified-currency orders are
                excluded from INR payment metrics, but included in order counts.
              </Alert>
            )}
            <Box
              sx={{
                display: 'grid',
                gap: 3,
                gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
                minWidth: 0,
              }}
            >
              <Card sx={{ minWidth: 0 }}>
                <CardContent>
                  <Typography variant="h6">Orders over time</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Daily orders placed · UTC
                  </Typography>
                  {data.orders.total === 0 ? (
                    <Alert severity="info" sx={{ mt: 3 }}>
                      No orders in this period.
                    </Alert>
                  ) : (
                    <Chart
                      type="area"
                      height={280}
                      options={chartOptions}
                      series={[
                        {
                          name: 'Orders',
                          data: trend.map((item) => ({
                            x: new Date(`${item.day}T00:00:00Z`).getTime(),
                            y: item.orders,
                          })),
                        },
                      ]}
                    />
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Order status mix
                  </Typography>
                  <Stack spacing={1.5}>
                    {data.statuses.map((item) => (
                      <Box key={item.status}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                            {label(item.status)}
                          </Typography>
                          <Typography variant="subtitle2">{item.count}</Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={(item.count / data.orders.total) * 100}
                          sx={{ mt: 0.5 }}
                        />
                      </Box>
                    ))}
                    {!data.statuses.length && (
                      <Typography color="text.secondary">No orders to group.</Typography>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Box>
            <Card>
              <CardContent>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  spacing={1}
                >
                  <Box>
                    <Typography variant="h6">Fulfilment & exceptions</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Current queues · all dates · counts can overlap
                    </Typography>
                  </Box>
                  <Button component={RouterLink} href={paths.dashboard.order.root}>
                    View orders
                  </Button>
                </Stack>
                <Box
                  sx={{
                    ...grid,
                    mt: 2,
                    gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(6, 1fr)' },
                  }}
                >
                  {[
                    ['Awaiting payment', data.operations.awaitingPayment],
                    ['To fulfil', data.operations.toFulfil],
                    ['In transit', data.operations.inTransit],
                    ['Return requests', data.operations.returns],
                    ['Manual shipping', data.operations.manualShipping],
                    ['Refund failures', data.operations.refundFailures],
                  ].map(([title, count]) => (
                    <Box
                      key={title}
                      sx={{ p: 1.5, borderRadius: 1, bgcolor: 'background.neutral' }}
                    >
                      <Typography variant="h4">{count}</Typography>
                      <Typography variant="body2">{title}</Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
            <Box
              sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}
            >
              <Card>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">Catalogue & stock</Typography>
                    <Button component={RouterLink} href={paths.dashboard.product.root}>
                      Products
                    </Button>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Current catalogue · all dates
                  </Typography>
                  <Stack direction="row" gap={1} flexWrap="wrap">
                    <Chip label={`${data.catalog.total} products`} />
                    <Chip
                      color="success"
                      variant="outlined"
                      label={`${data.catalog.published} live`}
                    />
                    <Chip variant="outlined" label={`${data.catalog.draft} drafts`} />
                    <Chip variant="outlined" label={`${data.catalog.archived} archived`} />
                  </Stack>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2">
                    {data.inventory.outOfStock} out-of-stock variants · {data.inventory.lowStock}{' '}
                    low-stock variants
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {data.inventory.trackedVariants} active variants on live, inventory-tracked
                    products. Available = stock minus reservations. Low stock uses each product’s
                    threshold. Legacy product-only stock is not included.
                  </Typography>
                  <Stack spacing={1.5} sx={{ mt: 2 }}>
                    {data.lowStockItems.map((item) => (
                      <Stack
                        key={item.id}
                        direction="row"
                        justifyContent="space-between"
                        spacing={2}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Link
                            component={RouterLink}
                            href={paths.dashboard.product.edit(item.productId)}
                            sx={{ overflowWrap: 'anywhere' }}
                          >
                            {item.name}
                          </Link>
                          <Typography variant="caption" display="block" color="text.secondary">
                            {item.sku || item.size || 'Variant'}
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          color={item.available === 0 ? 'error' : 'warning'}
                          label={`${item.available} left`}
                        />
                      </Stack>
                    ))}
                    {!data.lowStockItems.length && (
                      <Typography variant="body2" color="text.secondary">
                        No low-stock variants in the tracked catalogue.
                      </Typography>
                    )}
                  </Stack>
                  {data.inventory.outOfStock + data.inventory.lowStock > 8 && (
                    <Typography variant="caption">Showing the 8 lowest-stock variants.</Typography>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Typography variant="h6">Product SEO readiness</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Live products · saved metadata, not a ranking score
                  </Typography>
                  <Typography variant="h3">
                    {data.seo.eligible
                      ? `${Math.round((data.seo.complete / data.seo.eligible) * 100)}%`
                      : 'N/A'}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {data.seo.complete} of {data.seo.eligible} live products have a title,
                    description and slug.
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={data.seo.eligible ? (data.seo.complete / data.seo.eligible) * 100 : 0}
                  />
                  <Stack direction="row" gap={1} flexWrap="wrap" sx={{ my: 2 }}>
                    <Chip size="small" label={`${data.seo.missingTitle} missing titles`} />
                    <Chip
                      size="small"
                      label={`${data.seo.missingDescription} missing descriptions`}
                    />
                    <Chip size="small" label={`${data.seo.missingSlug} missing slugs`} />
                  </Stack>
                  <Stack spacing={1}>
                    {data.seoIssues.map((item) => (
                      <Box key={item.id}>
                        <Link component={RouterLink} href={paths.dashboard.product.edit(item.id)}>
                          {item.name}
                        </Link>
                        <Typography variant="caption" display="block" color="text.secondary">
                          Missing:{' '}
                          {[
                            !item.hasTitle && 'SEO title',
                            !item.hasDescription && 'SEO description',
                            !item.hasSlug && 'slug',
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                  {data.seo.eligible - data.seo.complete > 8 && (
                    <Typography variant="caption">
                      Showing the first 8 products needing metadata.
                    </Typography>
                  )}
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Search Console / GA4 reporting is not connected to this dashboard. Organic
                    clicks, impressions, rankings and visits are unavailable. Metadata completeness
                    does not verify indexing or the rendered page.
                  </Alert>
                </CardContent>
              </Card>
            </Box>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Latest orders in selected period
                </Typography>
                <Stack divider={<Divider />} spacing={1.5}>
                  {data.recent.map((order) => (
                    <Stack
                      key={order.id}
                      direction={{ xs: 'column', sm: 'row' }}
                      justifyContent="space-between"
                      spacing={1}
                    >
                      <Box>
                        <Link component={RouterLink} href={paths.dashboard.order.details(order.id)}>
                          {order.orderNumber}
                        </Link>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {shortDate(order.createdAt)} · UTC
                        </Typography>
                      </Box>
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        flexWrap="wrap"
                        useFlexGap
                      >
                        <Chip size="small" label={label(order.status)} />
                        <Typography variant="body2">
                          Payment: {label(order.paymentStatus)}
                        </Typography>
                        <Typography variant="subtitle2">
                          {money(order.total, order.currency)}
                        </Typography>
                      </Stack>
                    </Stack>
                  ))}
                  {!data.recent.length && (
                    <Typography color="text.secondary">No orders in this period.</Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
            <Typography variant="caption" color="text.secondary">
              Source: connected backend orders, products and product variants; deleted records
              excluded. Premium preorders are managed separately and are not included. Order period
              uses creation time. Paid order value includes tax/shipping and excludes fully or
              partially refunded payment statuses; it is not settlement, profit or net revenue.
              Catalogue, stock and operational queues are current snapshots and are not
              date-filtered. No business rules or order data are changed by this dashboard.
            </Typography>
          </>
        )}
      </Stack>
    </Container>
  );
}
