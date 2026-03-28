import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
// @mui
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Container from '@mui/material/Container';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
// routes
import { paths } from 'src/routes/paths';
// utils
import axios from 'src/utils/axios';
import { fCurrency } from 'src/utils/format-number';
import { fDateTime } from 'src/utils/format-time';
// components
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import Iconify from 'src/components/iconify';
import Label from 'src/components/label';
import { useSettingsContext } from 'src/components/settings';
import {
  formatOrderStatusLabel,
  getOrderStatusColor,
  getPaymentStatusColor,
  getReturnStatusColor,
} from 'src/utils/order-status';

// ----------------------------------------------------------------------

const STATUS_OPTIONS = [
  'pending',
  'confirmed',
  'processing',
  'packed',
  'shipped',
  'delivered',
  'return_requested',
  'cancelled',
  'returned',
  'refunded',
  'parcel_received',
];

export default function OrderDetailsView() {
  const settings = useSettingsContext();
  const params = useParams();
  const navigate = useNavigate();
  const { id } = params;

  const [order, setOrder] = useState(null);
  const [statusHistory, setStatusHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Status Update Dialog
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusComment, setStatusComment] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [updating, setUpdating] = useState(false);

  // Return Dialog
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnAction, setReturnAction] = useState('');
  const [returnComment, setReturnComment] = useState('');

  // Refund Dialog
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  // Notes Dialog
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [newNote, setNewNote] = useState('');

  const fetchOrderDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/admin/orders/${id}`);
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

  const handleUpdateStatus = async () => {
    try {
      setUpdating(true);

      const payload = {
        status: newStatus,
        comment: statusComment,
        trackingNumber: trackingNumber || undefined,
        carrier: carrier || undefined,
        estimatedDelivery: estimatedDelivery || undefined,
      };

      console.log('📤 Updating order status:', payload);

      const response = await axios.patch(`/api/admin/orders/${id}/status`, payload);

      console.log('✅ Status updated successfully:', response.data);

      setStatusDialogOpen(false);
      setNewStatus('');
      setStatusComment('');
      setTrackingNumber('');
      setCarrier('');
      setEstimatedDelivery('');
      await fetchOrderDetails();
    } catch (err) {
      console.error('❌ Error updating status:', err);
      console.error('❌ Error response:', err.response?.data);
      console.error('❌ Error status:', err.response?.status);
      console.error('❌ Full error:', JSON.stringify(err.response?.data, null, 2));

      const errorMessage = err?.error?.message
        || err.response?.data?.message
        || err.message
        || 'Failed to update status';

      console.error('❌ Showing alert:', errorMessage);
      alert(errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  const handleProcessReturn = async () => {
    try {
      setUpdating(true);
      await axios.patch(`/api/admin/orders/${id}/return`, {
        action: returnAction,
        comment: returnComment,
      });
      setReturnDialogOpen(false);
      setReturnAction('');
      setReturnComment('');
      await fetchOrderDetails();
    } catch (err) {
      console.error('Error processing return:', err);
      alert(err.response?.data?.message || 'Failed to process return');
    } finally {
      setUpdating(false);
    }
  };

  const handleInitiateRefund = async () => {
    try {
      setUpdating(true);
      await axios.post(`/api/admin/orders/${id}/refund`, {
        amount: parseFloat(refundAmount),
        reason: refundReason,
      });
      setRefundDialogOpen(false);
      setRefundAmount('');
      setRefundReason('');
      await fetchOrderDetails();
    } catch (err) {
      console.error('Error initiating refund:', err);
      alert(err.response?.data?.message || 'Failed to initiate refund');
    } finally {
      setUpdating(false);
    }
  };

  const handleAddNote = async () => {
    try {
      setUpdating(true);
      await axios.post(`/api/admin/orders/${id}/notes`, {
        note: newNote,
      });
      setNotesDialogOpen(false);
      setNewNote('');
      await fetchOrderDetails();
    } catch (err) {
      console.error('Error adding note:', err);
      alert(err.response?.data?.message || 'Failed to add note');
    } finally {
      setUpdating(false);
    }
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
        <Button variant="contained" onClick={() => navigate(paths.dashboard.order.root)}>
          Back to Orders
        </Button>
      </Container>
    );
  }
  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'}>
      <CustomBreadcrumbs
        heading={`Order #${order.orderNumber}`}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Orders', href: paths.dashboard.order.root },
          { name: order.orderNumber },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Grid container spacing={3}>
        {/* Main Content */}
        <Grid xs={12} md={8}>
          <Stack spacing={3}>
            {/* Order Info */}
            <Card sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h6">Order Information</Typography>
                <Label variant="soft" color={getOrderStatusColor(order.status)} sx={{ textTransform: 'capitalize' }}>
                  {formatOrderStatusLabel(order.status)}
                </Label>
              </Stack>

              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Order Date</Typography>
                  <Typography variant="body2">{fDateTime(order.createdAt)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Payment Method</Typography>
                  <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                    {order.paymentMethod}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Payment Status</Typography>
                  <Label
                    variant="soft"
                    color={getPaymentStatusColor(order.paymentStatus)}
                    sx={{ textTransform: 'capitalize' }}
                  >
                    {formatOrderStatusLabel(order.paymentStatus)}
                  </Label>
                </Stack>
                {order.returnStatus && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Return Status</Typography>
                    <Label
                      variant="soft"
                      color={getReturnStatusColor(order.returnStatus)}
                      sx={{ textTransform: 'capitalize' }}
                    >
                      {formatOrderStatusLabel(order.returnStatus)}
                    </Label>
                  </Stack>
                )}
                {order.trackingNumber && (
                  <>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Tracking Number</Typography>
                      <Typography variant="body2">{order.trackingNumber}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Carrier</Typography>
                      <Typography variant="body2">{order.carrier}</Typography>
                    </Stack>
                  </>
                )}
              </Stack>
            </Card>

            {/* Order Items */}
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>Order Items</Typography>
              <Stack spacing={2}>
                {order.items.map((item, index) => (
                  <Stack key={index} direction="row" spacing={2}>
                    <Box
                      component="img"
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
                        Qty: {item.quantity} × {fCurrency(item.price)}
                      </Typography>
                    </Stack>
                    <Typography variant="subtitle2">{fCurrency(item.subtotal)}</Typography>
                  </Stack>
                ))}
              </Stack>

              <Divider sx={{ my: 3 }} />

              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">Subtotal</Typography>
                  <Typography variant="body2">{fCurrency(order.subtotal)}</Typography>
                </Stack>
                {order.discount > 0 && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">Discount</Typography>
                    <Typography variant="body2" color="error.main">-{fCurrency(order.discount)}</Typography>
                  </Stack>
                )}
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">Shipping</Typography>
                  <Typography variant="body2">{fCurrency(order.shipping)}</Typography>
                </Stack>
                {order.tax > 0 && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">Tax</Typography>
                    <Typography variant="body2">{fCurrency(order.tax)}</Typography>
                  </Stack>
                )}
                <Divider />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="subtitle1">Total</Typography>
                  <Typography variant="subtitle1" color="primary">{fCurrency(order.total)}</Typography>
                </Stack>
              </Stack>
            </Card>

            {/* Status History */}
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>Status History</Typography>
              <Stack spacing={2}>
                {statusHistory.map((history, index) => (
                  <Stack key={index} spacing={0.5}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
                        {formatOrderStatusLabel(history.status)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {fDateTime(history.createdAt)}
                      </Typography>
                    </Stack>
                    {history.comment && (
                      <Typography variant="body2" color="text.secondary">
                        {history.comment}
                      </Typography>
                    )}
                  </Stack>
                ))}
              </Stack>
            </Card>

            {/* Notes */}
            {order.notes && (
              <Card sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Notes</Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {order.notes}
                </Typography>
              </Card>
            )}

            {order.returnStatus && (
              <Card sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="h6">Return Request</Typography>
                  <Label variant="soft" color={getReturnStatusColor(order.returnStatus)}>
                    {formatOrderStatusLabel(order.returnStatus)}
                  </Label>
                </Stack>

                <Stack spacing={2}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Reason</Typography>
                    <Typography variant="body2">{order.returnReason || '-'}</Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">Comment</Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {order.returnComment || '-'}
                    </Typography>
                  </Box>

                  {!!order.returnImages && (
                    <Stack spacing={1.5}>
                      <Typography variant="caption" color="text.secondary">
                        Customer proof images
                      </Typography>

                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        {order.returnImages.frontImage && (
                          <Box
                            component="img"
                            src={order.returnImages.frontImage}
                            alt="Front proof"
                            sx={{ width: { xs: 1, sm: 160 }, height: 160, objectFit: 'cover', borderRadius: 1.5 }}
                          />
                        )}
                        {order.returnImages.backImage && (
                          <Box
                            component="img"
                            src={order.returnImages.backImage}
                            alt="Back proof"
                            sx={{ width: { xs: 1, sm: 160 }, height: 160, objectFit: 'cover', borderRadius: 1.5 }}
                          />
                        )}
                        {order.returnImages.sealImage && (
                          <Box
                            component="img"
                            src={order.returnImages.sealImage}
                            alt="Seal proof"
                            sx={{ width: { xs: 1, sm: 160 }, height: 160, objectFit: 'cover', borderRadius: 1.5 }}
                          />
                        )}
                      </Stack>

                      {!!order.returnImages.additionalImages?.length && (
                        <Stack direction="row" spacing={1.5} flexWrap="wrap">
                          {order.returnImages.additionalImages.map((image, index) => (
                            <Box
                              key={`${image}-${index}`}
                              component="img"
                              src={image}
                              alt={`Additional proof ${index + 1}`}
                              sx={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 1.5 }}
                            />
                          ))}
                        </Stack>
                      )}
                    </Stack>
                  )}
                </Stack>
              </Card>
            )}
          </Stack>
        </Grid>

        {/* Sidebar */}
        <Grid xs={12} md={4}>
          <Stack spacing={3}>
            {/* Actions */}
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Actions</Typography>
              <Stack spacing={2}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<Iconify icon="eva:edit-fill" />}
                  onClick={() => {
                    setNewStatus(order.status);
                    setStatusDialogOpen(true);
                  }}
                >
                  Update Status
                </Button>

                {order.returnStatus === 'requested' && (
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Iconify icon="eva:checkmark-circle-2-fill" />}
                    onClick={() => setReturnDialogOpen(true)}
                  >
                    Process Return
                  </Button>
                )}

                {/* Only show refund button if order is cancelled/returned AND payment was actually paid */}
                {['cancelled', 'returned'].includes(order.status) && order.paymentStatus === 'paid' && (
                  <Button
                    fullWidth
                    variant="outlined"
                    color="warning"
                    startIcon={<Iconify icon="eva:credit-card-fill" />}
                    onClick={() => {
                      console.log('Refund button clicked. Order status:', order.status, 'Payment status:', order.paymentStatus);
                      setRefundAmount(order.total.toString());
                      setRefundDialogOpen(true);
                    }}
                  >
                    Initiate Refund
                  </Button>
                )}

                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Iconify icon="eva:file-text-fill" />}
                  onClick={() => setNotesDialogOpen(true)}
                >
                  Add Note
                </Button>
              </Stack>
            </Card>

            {/* Customer Info */}
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Customer</Typography>
              <Stack spacing={1}>
                <Typography variant="body2">{order.billingAddress.fullName}</Typography>
                <Typography variant="body2" color="text.secondary">{order.billingAddress.email}</Typography>
                <Typography variant="body2" color="text.secondary">{order.billingAddress.phone}</Typography>
              </Stack>
            </Card>

            {/* Shipping Address */}
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Shipping Address</Typography>
              <Typography variant="body2">{order.shippingAddress.fullName}</Typography>
              <Typography variant="body2" color="text.secondary">{order.shippingAddress.address}</Typography>
              <Typography variant="body2" color="text.secondary">
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
              </Typography>
              <Typography variant="body2" color="text.secondary">{order.shippingAddress.country}</Typography>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* Status Update Dialog */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Order Status</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              fullWidth
              label="Status"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option
                    .split('_')
                    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                    .join(' ')}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              multiline
              rows={2}
              label="Comment"
              value={statusComment}
              onChange={(e) => setStatusComment(e.target.value)}
            />

            {newStatus === 'shipped' && (
              <>
                <TextField
                  fullWidth
                  label="Tracking Number"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                />
                <TextField
                  fullWidth
                  label="Carrier"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                />
                <TextField
                  fullWidth
                  type="date"
                  label="Estimated Delivery"
                  value={estimatedDelivery}
                  onChange={(e) => setEstimatedDelivery(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateStatus} disabled={updating || !newStatus}>
            {updating ? 'Updating...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Return Dialog */}
      <Dialog open={returnDialogOpen} onClose={() => setReturnDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Process Return Request</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              fullWidth
              label="Action"
              value={returnAction}
              onChange={(e) => setReturnAction(e.target.value)}
            >
              <MenuItem value="approve">Approve</MenuItem>
              <MenuItem value="reject">Reject</MenuItem>
            </TextField>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Comment"
              value={returnComment}
              onChange={(e) => setReturnComment(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReturnDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleProcessReturn} disabled={updating || !returnAction}>
            {updating ? 'Processing...' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={refundDialogOpen} onClose={() => setRefundDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Initiate Refund</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              type="number"
              label="Refund Amount"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              inputProps={{ min: 0, max: order.total, step: 0.01 }}
            />

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Reason"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRefundDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleInitiateRefund}
            disabled={updating || !refundAmount || !refundReason}
          >
            {updating ? 'Processing...' : 'Initiate Refund'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={notesDialogOpen} onClose={() => setNotesDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Note</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Note"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotesDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddNote} disabled={updating || !newNote}>
            {updating ? 'Adding...' : 'Add Note'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
