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

// ----------------------------------------------------------------------

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
  const getChangedByLabel = (item) =>
    item?.changedByUser?.fullName ||
    item?.changedByUser?.email ||
    item?.changedBy ||
    '';
  const getDisplayComment = (item) => {
    if (!item?.comment) {
      return '';
    }

    const changedByLabel = getChangedByLabel(item);

    if (!changedByLabel) {
      return item.comment;
    }

    return item.comment.replace(/\bby admin\b/gi, `by ${changedByLabel}`);
  };

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
        <Box sx={{ color: 'text.disabled' }}>Delivery time for the carrier</Box>
        {fDateTime(
          timelineItems.find((item) => ['shipped', 'packed', 'processing'].includes(item?.status))?.createdAt
        )}
      </Stack>
      <Stack spacing={0.5}>
        <Box sx={{ color: 'text.disabled' }}>Completion time</Box>
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

        return (
          <TimelineItem key={`${item.status || item.title || 'event'}-${item.createdAt || item.time || index}`}>
            <TimelineSeparator>
              <TimelineDot color={(firstTimeline && 'primary') || 'grey'} />
              {lastTimeline ? null : <TimelineConnector />}
            </TimelineSeparator>

            <TimelineContent>
              <Typography variant="subtitle2">
                {item.title || item.status || 'Status Updated'}
              </Typography>

              {getDisplayComment(item) && (
                <Box sx={{ color: 'text.secondary', typography: 'body2', mt: 0.5 }}>
                  {getDisplayComment(item)}
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
      <CardHeader title="History" />
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
          Admin is reviewing your return request. As soon as possible, you will receive the next
          update about the return process and what happens next.
        </Alert>
      )}
    </Card>
  );
}

OrderDetailsHistory.propTypes = {
  history: PropTypes.object,
  order: PropTypes.object,
};
