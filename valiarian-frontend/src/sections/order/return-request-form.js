import PropTypes from 'prop-types';
import { useCallback, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { LoadingButton } from '@mui/lab';
import { useSnackbar } from 'src/components/snackbar';
import { Upload } from 'src/components/upload';
import { requestReturnOrder, uploadOrderReturnImages } from 'src/api/orders';

const RETURN_REASONS = [
  'Product damaged or defective',
  'Wrong item received',
  'Item not as described',
  'Missing parts or accessories',
  'Quality not satisfactory',
  'Other',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_ADDITIONAL_IMAGES = 5;

const withPreview = (file) =>
  Object.assign(file, {
    preview: URL.createObjectURL(file),
  });

export default function ReturnRequestForm({ orderId, open, onClose, onSuccess }) {
  const { enqueueSnackbar } = useSnackbar();
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);
  const [sealImage, setSealImage] = useState(null);
  const [additionalImages, setAdditionalImages] = useState([]);
  const [loading, setLoading] = useState(false);

  const resetForm = useCallback(() => {
    setReason('');
    setComment('');
    setFrontImage(null);
    setBackImage(null);
    setSealImage(null);
    setAdditionalImages([]);
  }, []);

  const handleClose = useCallback(() => {
    if (loading) {
      return;
    }

    resetForm();
    onClose();
  }, [loading, onClose, resetForm]);

  const handleDropSingle = useCallback(
    (setter) => (acceptedFiles) => {
      const [file] = acceptedFiles || [];
      if (!file) {
        return;
      }

      setter(withPreview(file));
    },
    []
  );

  const handleDropAdditional = useCallback(
    (acceptedFiles) => {
      const preparedFiles = (acceptedFiles || []).map(withPreview);
      const nextFiles = [...additionalImages, ...preparedFiles].slice(0, MAX_ADDITIONAL_IMAGES);

      if (additionalImages.length + preparedFiles.length > MAX_ADDITIONAL_IMAGES) {
        const message = `You can upload up to ${MAX_ADDITIONAL_IMAGES} additional images only.`;
        enqueueSnackbar(message, { variant: 'warning' });
      }

      setAdditionalImages(nextFiles);
    },
    [additionalImages, enqueueSnackbar]
  );

  const handleRemoveAdditional = useCallback((inputFile) => {
    setAdditionalImages((prev) => prev.filter((file) => file !== inputFile));
  }, []);

  const handleRemoveAllAdditional = useCallback(() => {
    setAdditionalImages([]);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!reason) {
      const message = 'Return reason is required.';
      enqueueSnackbar(message, { variant: 'error' });
      return;
    }

    if (!comment.trim()) {
      const message = 'Comment is required.';
      enqueueSnackbar(message, { variant: 'error' });
      return;
    }

    if (!frontImage || !backImage || !sealImage) {
      const message = 'Front image, back image, and seal image are all required.';
      enqueueSnackbar(message, { variant: 'error' });
      return;
    }

    try {
      setLoading(true);

      const [[frontImageUrl], [backImageUrl], [sealImageUrl], extraImageUrls] = await Promise.all([
        uploadOrderReturnImages([frontImage]),
        uploadOrderReturnImages([backImage]),
        uploadOrderReturnImages([sealImage]),
        uploadOrderReturnImages(additionalImages),
      ]);

      await requestReturnOrder(orderId, {
        reason,
        comment: comment.trim(),
        images: {
          frontImage: frontImageUrl,
          backImage: backImageUrl,
          sealImage: sealImageUrl,
          additionalImages: extraImageUrls,
        },
      });

      resetForm();
      enqueueSnackbar('Return request submitted successfully.', { variant: 'success' });
      onSuccess?.();
      onClose();
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.message || 'Failed to submit return request';
      enqueueSnackbar(message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [
    additionalImages,
    backImage,
    comment,
    enqueueSnackbar,
    frontImage,
    onClose,
    onSuccess,
    orderId,
    reason,
    resetForm,
    sealImage,
  ]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Return Order</DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Add your return reason, a short comment, and clear proof photos. Front image, back
            image, and seal image are mandatory.
          </Typography>

          <FormControl fullWidth>
            <InputLabel>Return Reason</InputLabel>
            <Select
              value={reason}
              label="Return Reason"
              onChange={(event) => setReason(event.target.value)}
              disabled={loading}
            >
              {RETURN_REASONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            required
            multiline
            rows={4}
            label="Comment"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Describe the issue with the order and the condition of the package."
            disabled={loading}
          />

          <Stack spacing={2}>
            <Typography variant="subtitle2">Mandatory proof images</Typography>

            <Stack spacing={2} direction={{ xs: 'column', md: 'row' }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Front image
                </Typography>
                <Upload
                  file={frontImage}
                  accept={{ 'image/*': [] }}
                  maxSize={MAX_FILE_SIZE}
                  onDrop={handleDropSingle(setFrontImage)}
                  onDelete={() => setFrontImage(null)}
                  helperText={
                    <Typography variant="caption" sx={{ px: 0.5, color: 'text.secondary' }}>
                      Mandatory. Upload a clear front-side photo.
                    </Typography>
                  }
                />
              </Box>

              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Back image
                </Typography>
                <Upload
                  file={backImage}
                  accept={{ 'image/*': [] }}
                  maxSize={MAX_FILE_SIZE}
                  onDrop={handleDropSingle(setBackImage)}
                  onDelete={() => setBackImage(null)}
                  helperText={
                    <Typography variant="caption" sx={{ px: 0.5, color: 'text.secondary' }}>
                      Mandatory. Upload a clear back-side photo.
                    </Typography>
                  }
                />
              </Box>
            </Stack>

            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Seal image
              </Typography>
              <Upload
                file={sealImage}
                accept={{ 'image/*': [] }}
                maxSize={MAX_FILE_SIZE}
                onDrop={handleDropSingle(setSealImage)}
                onDelete={() => setSealImage(null)}
                helperText={
                  <Typography variant="caption" sx={{ px: 0.5, color: 'text.secondary' }}>
                    Mandatory. Upload the seal image showing it is not broken.
                  </Typography>
                }
              />
            </Box>
          </Stack>

          <Stack spacing={1}>
            <Typography variant="subtitle2">Additional images</Typography>
            <Upload
              multiple
              thumbnail
              files={additionalImages}
              accept={{ 'image/*': [] }}
              maxSize={MAX_FILE_SIZE}
              onDrop={handleDropAdditional}
              onRemove={handleRemoveAdditional}
              onRemoveAll={handleRemoveAllAdditional}
              helperText={
                <Typography variant="caption" sx={{ px: 0.5, color: 'text.secondary' }}>
                  Optional. You can upload up to {MAX_ADDITIONAL_IMAGES} more images.
                </Typography>
              }
            />
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button color="inherit" variant="outlined" onClick={handleClose} disabled={loading}>
          Cancel
        </Button>

        <LoadingButton variant="contained" onClick={handleSubmit} loading={loading}>
          Submit Return Request
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

ReturnRequestForm.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  open: PropTypes.bool.isRequired,
  orderId: PropTypes.string.isRequired,
};
