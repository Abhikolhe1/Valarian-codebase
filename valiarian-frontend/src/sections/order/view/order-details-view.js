import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// @mui
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
// routes
import { paths } from 'src/routes/paths';
// utils
import axios from 'src/utils/axios';
import { fDateTime } from 'src/utils/format-time';
// components
import { useSettingsContext } from 'src/components/settings';
import { useSnackbar } from 'src/components/snackbar';
import { useParams } from 'src/routes/hook';
//
import {
  returnPackagingInstructions,
  returnStatusDescriptions,
  shouldPollOrderStatus,
} from 'src/utils/order-status';
import OrderDetailsHistory from '../order-details-history';
import OrderDetailsInfo from '../order-details-info';
import OrderDetailsItems from '../order-details-item';
import OrderDetailsToolbar from '../order-details-toolbar';
import ReturnRequestForm from '../return-request-form';

// ----------------------------------------------------------------------

export default function OrderDetailsView() {
  const settings = useSettingsContext();
  const params = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { id } = params;

  const [order, setOrder] = useState(null);
  const [statusHistory, setStatusHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchOrderDetails = useCallback(async (options = {}) => {
    const { silent = false } = options;
    try {
      if (!silent) {
        setLoading(true);
      }
      const response = await axios.get(`/api/orders/${id}`);
      setOrder(response.data.order);
      setStatusHistory(response.data.statusHistory || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching order details:', err);
      setError(err.response?.data?.message || 'Failed to load order details');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchOrderDetails();
    }
  }, [id, fetchOrderDetails]);

  useEffect(() => {
    if (!id || !shouldPollOrderStatus(order?.status, order?.returnStatus)) {
      return undefined;
    }

    const interval = setInterval(() => {
      fetchOrderDetails({ silent: true });
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchOrderDetails, id, order?.returnStatus, order?.status]);

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      enqueueSnackbar('Please provide a cancellation reason', { variant: 'error' });
      return;
    }

    try {
      setActionLoading(true);
      await axios.post(`/api/orders/${id}/cancel`, { reason: cancelReason });
      setCancelDialogOpen(false);
      setCancelReason('');
      enqueueSnackbar('Order cancelled successfully.', { variant: 'success' });
      await fetchOrderDetails();
    } catch (err) {
      console.error('Error cancelling order:', err);
      enqueueSnackbar(err.response?.data?.message || 'Failed to cancel order', {
        variant: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleTrackOrder = () => {
    navigate(`/orders/${id}/tracking`);
  };

  if (loading) {
    return (
      <Container maxWidth={settings.themeStretch ? false : 'lg'}>
        <Typography>Loading order details...</Typography>
      </Container>
    );
  }

  if (error || !order) {
    return (
      <Container maxWidth={settings.themeStretch ? false : 'lg'}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || 'Order not found'}
        </Alert>
        <Button variant="contained" onClick={() => navigate('/orders/history')}>
          Back to Orders
        </Button>
      </Container>
    );
  }

  const canCancel = ['pending', 'confirmed'].includes(order.status);
  const canReturn = order.status === 'delivered' && !order.returnStatus;
  const showReturnReviewMessage =
    order.status === 'return_requested' ||
    order.returnStatus === 'requested' ||
    order.returnStatus === 'approved' ||
    order.status === 'returned';
  const returnStatusTitle =
    (order.status === 'refunded' && 'Refund completed') ||
    (order.status === 'parcel_received' && 'Parcel received at warehouse') ||
    returnStatusDescriptions[order.returnStatus] ||
    'Return status updated';
  let returnSeverity = 'info';

  if (order.returnStatus === 'rejected') {
    returnSeverity = 'error';
  } else if (['parcel_received', 'refunded'].includes(order.status)) {
    returnSeverity = 'success';
  } else if (order.returnStatus === 'requested') {
    returnSeverity = 'warning';
  }

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'}>
      <OrderDetailsToolbar
        backLink={paths.order.history}
        orderNumber={order.orderNumber}
        createdAt={order.createdAt}
        status={order.status}
        returnStatus={order.returnStatus}
        onCancel={canCancel ? () => setCancelDialogOpen(true) : null}
        onReturn={canReturn ? () => setReturnDialogOpen(true) : null}
        onTrack={order.trackingNumber ? handleTrackOrder : null}
      />

      {order.returnStatus && (
        <Alert severity={returnSeverity} sx={{ my: 3 }}>
          <AlertTitle>{returnStatusTitle}</AlertTitle>
          <Stack spacing={0.5}>
            <Typography variant="body2">
              Current order status: {order.status.split('_').join(' ')}
            </Typography>
            {showReturnReviewMessage && (
              <Typography variant="body2">
                Admin is reviewing this order. As soon as possible, you will receive the next
                update about your return request and what happens next.
              </Typography>
            )}
            {order.returnApprovedAt && (
              <Typography variant="body2">
                Return approved on: {fDateTime(order.returnApprovedAt)}
              </Typography>
            )}
            {order.returnPickedAt && (
              <Typography variant="body2">
                Return pickup completed on: {fDateTime(order.returnPickedAt)}
              </Typography>
            )}
            {order.parcelReceivedAt && (
              <Typography variant="body2">
                Parcel received on: {fDateTime(order.parcelReceivedAt)}
              </Typography>
            )}
            {order.refundMethod && (
              <Typography variant="body2">
                Refund method: {order.refundMethod === 'cash' ? 'Cash refund' : 'Original payment'}
              </Typography>
            )}
            {order.deliveryChargeDeducted && (
              <Typography variant="body2">
                Delivery charges deducted: {order.deliveryChargeDeductionAmount}
              </Typography>
            )}
            {order.returnStatus === 'approved' && (
              <>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  Please pack the item using the instructions below so the pickup can happen
                  smoothly.
                </Typography>
                <Stack component="ul" spacing={0.5} sx={{ pl: 2.5, mb: 0 }}>
                  {returnPackagingInstructions.map((instruction) => (
                    <Typography key={instruction} component="li" variant="body2">
                      {instruction}
                    </Typography>
                  ))}
                </Stack>
              </>
            )}
          </Stack>
        </Alert>
      )}

      {showReturnReviewMessage && !order.returnStatus && (
        <Alert severity="info" sx={{ my: 3 }}>
          <AlertTitle>Return request under review</AlertTitle>
          <Typography variant="body2">
            Admin is reviewing this order. As soon as possible, you will receive the next update
            about your return request and what happens next.
          </Typography>
        </Alert>
      )}

      <Grid container spacing={3} mt={2}>
        <Grid xs={12} md={8}>
          <Stack spacing={3} direction={{ xs: 'column-reverse', md: 'column' }}>
            <OrderDetailsItems
              items={order.items}
              taxes={order.tax}
              shipping={order.shipping}
              discount={order.discount}
              subTotal={order.subtotal}
              totalAmount={order.total}
            />

            <OrderDetailsHistory history={statusHistory} order={order} />
          </Stack>
        </Grid>

        <Grid xs={12} md={4}>
          <OrderDetailsInfo
            customer={{
              name: order.billingAddress.fullName,
              email: order.billingAddress.email,
              phone: order.billingAddress.phone,
            }}
            delivery={{
              trackingNumber: order.trackingNumber,
              carrier: order.carrier,
              estimatedDelivery: order.estimatedDelivery,
            }}
            payment={{
              method: order.paymentMethod,
              status: order.paymentStatus,
            }}
            shippingAddress={order.shippingAddress}
          />
        </Grid>
      </Grid>

      {/* Cancel Order Dialog */}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)} maxWidth="sm" fullWidth >
        <DialogTitle>Cancel Order</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Are you sure you want to cancel this order? Please provide a reason for cancellation.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Cancellation Reason"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="e.g., Changed my mind, Found a better deal, etc."
          />
        </DialogContent>
        <DialogActions>
          <Button     variant="outlined" color="secondary" onClick={() => setCancelDialogOpen(false)} disabled={actionLoading}>
            Close
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleCancelOrder}
            disabled={actionLoading || !cancelReason.trim()}
          >
            {actionLoading ? 'Cancelling...' : 'Cancel Order'}
          </Button>
        </DialogActions>
      </Dialog>

      <ReturnRequestForm
        orderId={id}
        open={returnDialogOpen}
        onClose={() => setReturnDialogOpen(false)}
        onSuccess={fetchOrderDetails}
      />
    </Container>
  );
}
