import PropTypes from 'prop-types';
// @mui
import Timeline from '@mui/lab/Timeline';
import TimelineDot from '@mui/lab/TimelineDot';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineItem, { timelineItemClasses } from '@mui/lab/TimelineItem';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
// utils
import { fDateTime } from 'src/utils/format-time';
import { formatOrderStatusLabel } from 'src/utils/order-status';

// ----------------------------------------------------------------------

const CUSTOMER_STATUS_CONTENT = {
  pending: {
    label: 'Order Placed',
    message: 'We have received your order.',
  },
  confirmed: {
    label: 'Confirmed',
    message: 'Your order has been confirmed.',
  },
  processing: {
    label: 'Processing',
    message: 'We are preparing your order.',
  },
  packed: {
    label: 'Packed',
    message: 'Your parcel is packed and ready for dispatch.',
  },
  shipped: {
    label: 'Shipped',
    message: 'Your parcel has been dispatched from our warehouse and handed over to Blue Dart.',
  },
  out_for_delivery: {
    label: 'Out for Delivery',
    message: 'Blue Dart will attempt delivery today, typically between 9:00 AM and 11:00 PM.',
  },
  delivered: {
    label: 'Delivered',
    message: 'Your parcel has been delivered successfully.',
  },
  return_requested: {
    label: 'Return Requested',
    message: 'Your return request has been received and is being reviewed.',
  },
  return_approved: {
    label: 'Return Approved',
    message: 'Your return has been approved. Please keep the parcel ready for pickup.',
  },
  returned: {
    label: 'Return Picked Up',
    message: 'Your return parcel has been collected and is travelling to our warehouse.',
  },
  parcel_received: {
    label: 'Received at Warehouse',
    message: 'Your return parcel has reached our warehouse and will be checked.',
  },
  refunded: {
    label: 'Refunded',
    message: 'Your refund has been processed.',
  },
  cancelled: {
    label: 'Cancelled',
    message: 'Your order has been cancelled.',
  },
};

const getCustomerStatusContent = (item) => {
  const status = String(item?.status || '').toLowerCase();
  return (
    CUSTOMER_STATUS_CONTENT[status] || {
      label: item?.title ? formatOrderStatusLabel(item.title) : formatOrderStatusLabel(status),
      message: 'Your order status has been updated.',
    }
  );
};

export default function OrderDetailsHistory({ history, order }) {
  const historyItems = Array.isArray(history) ? history : history?.timeline || [];
  const hasDeliveredHistory = historyItems.some((item) => item?.status === 'delivered');
  const deliveredTimelineItem =
    order?.deliveredAt && !hasDeliveredHistory
      ? [
          {
            status: 'delivered',
            title: 'Delivered',
            comment: 'Your order was delivered successfully.',
            createdAt: order.deliveredAt,
          },
        ]
      : [];
  const timelineItems = [...historyItems, ...deliveredTimelineItem].sort(
    (left, right) =>
      new Date(right?.createdAt || right?.time || 0).getTime() -
      new Date(left?.createdAt || left?.time || 0).getTime()
  );
  const latestEvent = timelineItems[0];
  const oldestEvent = timelineItems[timelineItems.length - 1];
  const showReturnReviewMessage =
    order?.status === 'return_requested' ||
    order?.returnStatus === 'requested' ||
    order?.returnStatus === 'approved' ||
    order?.status === 'returned';
  const renderSummary = (
    <Stack
      spacing={2}
      component={Paper}
      variant="outlined"
      sx={{
        p: 2.5,
        minWidth: 260,
        flexShrink: 0,
        borderRadius: 2,
        typography: 'body2',
        borderStyle: 'dashed',
      }}
    >
      <Stack spacing={0.5}>
        <Box sx={{ color: 'text.disabled' }}>Order time</Box>
        {fDateTime(oldestEvent?.createdAt || oldestEvent?.time)}
      </Stack>
      <Stack spacing={0.5}>
        <Box sx={{ color: 'text.disabled' }}>Payment time</Box>
        {fDateTime(
          timelineItems.find((item) => ['paid', 'confirmed', 'success'].includes(item?.status))?.createdAt
        )}
      </Stack>
      <Stack spacing={0.5}>
        <Box sx={{ color: 'text.disabled' }}>Dispatched time</Box>
        {fDateTime(
          timelineItems.find((item) => ['shipped', 'packed', 'processing'].includes(item?.status))?.createdAt
        )}
      </Stack>
      <Stack spacing={0.5}>
        <Box sx={{ color: 'text.disabled' }}>Latest update</Box>
        {fDateTime(latestEvent?.createdAt || latestEvent?.time)}
      </Stack>
    </Stack>
  );

  const renderTimeline = (
    <Timeline
      sx={{
        p: 0,
        m: 0,
        [`& .${timelineItemClasses.root}:before`]: {
          flex: 0,
          padding: 0,
        },
      }}
    >
      {timelineItems.length === 0 && (
        <TimelineItem>
          <TimelineSeparator>
            <TimelineDot color="grey" />
          </TimelineSeparator>

          <TimelineContent>
            <Typography variant="subtitle2">No history available yet</Typography>
          </TimelineContent>
        </TimelineItem>
      )}

      {timelineItems.map((item, index) => {
        const firstTimeline = index === 0;

        const lastTimeline = index === timelineItems.length - 1;
        const customerContent = getCustomerStatusContent(item);

        return (
          <TimelineItem key={`${item.status || item.title || 'event'}-${item.createdAt || item.time || index}`}>
            <TimelineSeparator>
              <TimelineDot color={(firstTimeline && 'primary') || 'grey'} />
              {lastTimeline ? null : <TimelineConnector />}
            </TimelineSeparator>

            <TimelineContent>
              <Typography variant="subtitle2">
                {customerContent.label || 'Status Updated'}
              </Typography>

              {customerContent.message && (
                <Box sx={{ color: 'text.secondary', typography: 'body2', mt: 0.5 }}>
                  {customerContent.message}
                </Box>
              )}

              <Box sx={{ color: 'text.disabled', typography: 'caption', mt: 0.5 }}>
                {fDateTime(item.createdAt || item.time)}
              </Box>
            </TimelineContent>
          </TimelineItem>
        );
      })}
    </Timeline>
  );

  return (
    <Card>
      <CardHeader title="Order Updates" />
      <Stack
        spacing={3}
        alignItems={{ md: 'flex-start' }}
        direction={{ xs: 'column-reverse', md: 'row' }}
        sx={{ p: 3 }}
      >
        {renderTimeline}

        {renderSummary}
      </Stack>

      {showReturnReviewMessage && (
        <Alert severity="info" sx={{ mx: 3, mb: 3 }}>
          Your return request is being reviewed. You will receive an update with the next steps
          shortly.
        </Alert>
      )}
    </Card>
  );
}

OrderDetailsHistory.propTypes = {
  history: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  order: PropTypes.object,
};
