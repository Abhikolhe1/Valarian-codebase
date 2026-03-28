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
// components
import { useSettingsContext } from 'src/components/settings';
import { useParams } from 'src/routes/hook';
//
import { returnPackagingInstructions } from 'src/utils/order-status';
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
  const { id } = params;

  const [order, setOrder] = useState(null);
  const [statusHistory, setStatusHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  const fetchOrderDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/orders/${id}`);
      setOrder(response.data.order);
      setStatusHistory(response.data.statusHistory || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching order details:', err);
      setError(err.response?.data?.message || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchOrderDetails();
    }
  }, [id, fetchOrderDetails]);

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      setActionError('Please provide a cancellation reason');
      return;
    }

    try {
      setActionLoading(true);
      setActionError(null);
      await axios.post(`/api/orders/${id}/cancel`, { reason: cancelReason });
      setCancelDialogOpen(false);
      setCancelReason('');
      await fetchOrderDetails();
    } catch (err) {
      console.error('Error cancelling order:', err);
      setActionError(err.response?.data?.message || 'Failed to cancel order');
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

      {order.returnStatus === 'approved' && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <AlertTitle>Return Approved</AlertTitle>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Your return request has been approved. Please pack the item using the instructions
            below so the pickup can happen smoothly.
          </Typography>
          <Stack component="ul" spacing={0.5} sx={{ pl: 2.5, mb: 0 }}>
            {returnPackagingInstructions.map((instruction) => (
              <Typography key={instruction} component="li" variant="body2">
                {instruction}
              </Typography>
            ))}
          </Stack>
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

            <OrderDetailsHistory history={statusHistory} />
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
          {actionError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {actionError}
            </Alert>
          )}
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
          <Button onClick={() => setCancelDialogOpen(false)} disabled={actionLoading}>
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
