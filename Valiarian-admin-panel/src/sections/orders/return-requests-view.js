import {useCallback, useEffect, useMemo, useState} from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Container from '@mui/material/Container';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
import {paths} from 'src/routes/paths';
import axios from 'src/utils/axios';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import Image from 'src/components/image';
import Label from 'src/components/label';
import {useSettingsContext} from 'src/components/settings';
import {useSnackbar} from 'src/components/snackbar';
import {fDateTime} from 'src/utils/format-time';

const statusColor = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  REFUNDED: 'info',
};

export default function ReturnRequestsView() {
  const settings = useSettingsContext();
  const {enqueueSnackbar} = useSnackbar();
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [reviewAction, setReviewAction] = useState('approve');
  const [reviewComment, setReviewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/return-requests', {
        params: status ? {status} : undefined,
      });
      setRequests(response.data.requests || []);
      setError('');
    } catch (fetchError) {
      console.error(fetchError);
      setError(fetchError.response?.data?.message || 'Failed to load return requests');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const summary = useMemo(() => ({
    total: requests.length,
    pending: requests.filter(item => item.status === 'PENDING').length,
    approved: requests.filter(item => item.status === 'APPROVED').length,
  }), [requests]);

  const handleReview = async () => {
    if (!selectedRequest) {
      return;
    }

    try {
      setSubmitting(true);
      await axios.patch(`/api/admin/return-requests/${selectedRequest.id}`, {
        action: reviewAction,
        comment: reviewComment,
      });
      enqueueSnackbar('Return request updated successfully.', {variant: 'success'});
      setReviewDialog(false);
      setReviewComment('');
      setSelectedRequest(null);
      await fetchRequests();
    } catch (reviewError) {
      console.error(reviewError);
      enqueueSnackbar(
        reviewError.response?.data?.message || 'Failed to update return request',
        {variant: 'error'},
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <CustomBreadcrumbs
        heading="Return Requests"
        links={[
          {name: 'Dashboard', href: paths.dashboard.root},
          {name: 'Orders', href: paths.dashboard.order.root},
          {name: 'Return Requests'},
        ]}
        sx={{mb: {xs: 3, md: 5}}}
      />

      <Stack
        direction={{xs: 'column', md: 'row'}}
        spacing={2}
        sx={{mb: 3}}
        alignItems={{md: 'center'}}
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={2}>
          <Card sx={{p: 2.5, minWidth: 140}}>
            <Typography variant="overline" color="text.secondary">Total</Typography>
            <Typography variant="h4">{summary.total}</Typography>
          </Card>
          <Card sx={{p: 2.5, minWidth: 140}}>
            <Typography variant="overline" color="text.secondary">Pending</Typography>
            <Typography variant="h4">{summary.pending}</Typography>
          </Card>
          <Card sx={{p: 2.5, minWidth: 140}}>
            <Typography variant="overline" color="text.secondary">Approved</Typography>
            <Typography variant="h4">{summary.approved}</Typography>
          </Card>
        </Stack>

        <TextField
          select
          label="Status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          sx={{minWidth: 220}}
        >
          <MenuItem value="">All statuses</MenuItem>
          <MenuItem value="PENDING">Pending</MenuItem>
          <MenuItem value="APPROVED">Approved</MenuItem>
          <MenuItem value="REJECTED">Rejected</MenuItem>
          <MenuItem value="REFUNDED">Refunded</MenuItem>
        </TextField>
      </Stack>

      {error && (
        <Alert severity="error" sx={{mb: 3}}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Typography>Loading return requests...</Typography>
      ) : (
        <Grid container spacing={3}>
          {requests.map((request) => (
            <Grid xs={12} md={6} lg={4} key={request.id}>
              <Card sx={{p: 3, height: '100%'}}>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1">
                      {request.order?.orderNumber || request.orderId}
                    </Typography>
                    <Label variant="soft" color={statusColor[request.status] || 'default'}>
                      {request.status}
                    </Label>
                  </Stack>

                  <Box>
                    <Typography variant="caption" color="text.secondary">Barcode</Typography>
                    <Typography variant="body2">{request.decodedBarcodeCode}</Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">Product Snapshot</Typography>
                    <Typography variant="body2">
                      {request.orderItem?.productNameSnapshot || request.orderItem?.name || '-'}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">Variant</Typography>
                    <Typography variant="body2">
                      {[
                        request.orderItem?.variantSnapshot?.colorName || request.orderItem?.variantSnapshot?.color,
                        request.orderItem?.variantSnapshot?.size,
                      ].filter(Boolean).join(' / ') || 'Standard'}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">Requested At</Typography>
                    <Typography variant="body2">{fDateTime(request.createdAt)}</Typography>
                  </Box>

                  <Stack direction="row" spacing={1}>
                    <Image
                      src={request.evidenceImages?.barcodeImageUrl}
                      alt="Barcode proof"
                      sx={{width: 88, height: 88, borderRadius: 1.5}}
                    />
                    {(request.evidenceImages?.productImageUrls || []).slice(0, 2).map((imageUrl) => (
                      <Image
                        key={imageUrl}
                        src={imageUrl}
                        alt="Product proof"
                        sx={{width: 88, height: 88, borderRadius: 1.5}}
                      />
                    ))}
                  </Stack>

                  <Button
                    variant="contained"
                    onClick={() => {
                      setSelectedRequest(request);
                      setReviewAction('approve');
                      setReviewComment(request.adminDecision || '');
                      setReviewDialog(true);
                    }}
                  >
                    Review Request
                  </Button>
                </Stack>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog
        open={reviewDialog}
        onClose={() => setReviewDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Review Return Request</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{mt: 1}}>
            <TextField
              select
              label="Decision"
              value={reviewAction}
              onChange={(event) => setReviewAction(event.target.value)}
            >
              <MenuItem value="approve">Approve Return</MenuItem>
              <MenuItem value="reject">Reject Return</MenuItem>
              <MenuItem value="refund">Mark Refunded</MenuItem>
            </TextField>

            <TextField
              multiline
              rows={4}
              label="Comment"
              value={reviewComment}
              onChange={(event) => setReviewComment(event.target.value)}
            />

            {selectedRequest && (
              <Card variant="outlined" sx={{p: 2}}>
                <Stack spacing={1}>
                  <Typography variant="subtitle2">
                    {selectedRequest.order?.orderNumber}
                  </Typography>
                  <Typography variant="body2">
                    {selectedRequest.orderItem?.productNameSnapshot || selectedRequest.orderItem?.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedRequest.decodedBarcodeCode}
                  </Typography>
                </Stack>
              </Card>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleReview}
            disabled={submitting}
          >
            {submitting ? 'Saving...' : 'Save Decision'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
