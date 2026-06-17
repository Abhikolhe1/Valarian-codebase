import PropTypes from 'prop-types';
import * as Yup from 'yup';
import { useCallback, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import LoadingButton from '@mui/lab/LoadingButton';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormHelperText from '@mui/material/FormHelperText';
import Rating from '@mui/material/Rating';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useSnackbar } from 'src/components/snackbar';
import { Upload } from 'src/components/upload';
import FormProvider, { RHFTextField } from 'src/components/hook-form';
import {
  createReview,
  refreshProductReviews,
  updateReview,
  uploadReviewImages,
} from 'src/api/reviews';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const getErrorMessage = (error) =>
  error?.data?.error?.details?.[0]?.message ||
  error?.data?.details?.[0]?.message ||
  error?.data?.error?.message ||
  error?.message ||
  'Unable to save your review right now.';

export default function ProductReviewNewForm({ open, onClose, productId, review }) {
  const { enqueueSnackbar } = useSnackbar();

  const ReviewSchema = Yup.object().shape({
    rating: Yup.number().min(1, 'Please select a rating.').required('Please select a rating.'),
    title: Yup.string().max(120, 'Title must be 120 characters or less.'),
    comment: Yup.string().trim().required('Review comment is required.'),
    images: Yup.array().of(Yup.mixed()),
  });

  const methods = useForm({
    resolver: yupResolver(ReviewSchema),
    defaultValues: {
      rating: review?.rating || 0,
      title: review?.title || '',
      comment: review?.comment || '',
      images: review?.images || [],
    },
  });

  const {
    watch,
    reset,
    setValue,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = methods;

  const files = watch('images');

  useEffect(() => {
    if (!open) {
      return;
    }

    reset({
      rating: review?.rating || 0,
      title: review?.title || '',
      comment: review?.comment || '',
      images: review?.images || [],
    });
  }, [open, reset, review]);

  const handleDrop = useCallback(
    (acceptedFiles) => {
      const preparedFiles = acceptedFiles.map((file) =>
        Object.assign(file, {
          preview: URL.createObjectURL(file),
        })
      );

      setValue('images', [...(files || []), ...preparedFiles], { shouldValidate: true });
    },
    [files, setValue]
  );

  const handleRemoveFile = useCallback(
    (inputFile) => {
      setValue(
        'images',
        (files || []).filter((file) => file !== inputFile),
        { shouldValidate: true }
      );
    },
    [files, setValue]
  );

  const handleRemoveAllFiles = useCallback(() => {
    setValue('images', [], { shouldValidate: true });
  }, [setValue]);

  const handleCancel = useCallback(() => {
    reset({
      rating: review?.rating || 0,
      title: review?.title || '',
      comment: review?.comment || '',
      images: review?.images || [],
    });
    onClose();
  }, [onClose, reset, review]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      const existingImageUrls = (data.images || []).filter((image) => typeof image === 'string');
      const newImageFiles = (data.images || []).filter((image) => typeof image !== 'string');

      const uploadedImageUrls = await uploadReviewImages(newImageFiles);

      const payload = {
        rating: Number(data.rating),
        title: data.title?.trim() || '',
        comment: data.comment.trim(),
        images: [...existingImageUrls, ...uploadedImageUrls],
      };

      if (review?.id) {
        await updateReview(review.id, payload);
        enqueueSnackbar('Review updated successfully.', { variant: 'success' });
      } else {
        await createReview({
          productId,
          ...payload,
        });
        enqueueSnackbar('Review submitted successfully.', { variant: 'success' });
      }

      await refreshProductReviews(productId);
      onClose();
    } catch (error) {
      enqueueSnackbar(getErrorMessage(error), { variant: 'error' });
    }
  });

  return (
    <Dialog fullWidth maxWidth="sm" open={open} onClose={handleCancel}>
      <FormProvider methods={methods} onSubmit={onSubmit}>
        <DialogTitle>{review?.id ? 'Edit Review' : 'Write Review'}</DialogTitle>

        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <Stack spacing={1}>
              <Typography variant="body2">Your rating</Typography>

              <Controller
                name="rating"
                control={control}
                render={({ field }) => (
                  <Rating
                    value={Number(field.value)}
                    onChange={(_, value) => field.onChange(value)}
                  />
                )}
              />

              {!!errors.rating && <FormHelperText error>{errors.rating.message}</FormHelperText>}
            </Stack>

            <RHFTextField name="title" label="Title (Optional)" />

            <RHFTextField name="comment" label="Comment" multiline rows={4} />

            <Stack spacing={1}>
              <Typography variant="body2">Review photos</Typography>

              <Upload
                multiple
                thumbnail
                accept={{ 'image/*': [] }}
                maxSize={MAX_FILE_SIZE}
                files={files}
                onDrop={handleDrop}
                onRemove={handleRemoveFile}
                onRemoveAll={handleRemoveAllFiles}
                helperText={
                  <Typography variant="caption" sx={{ px: 0.5, color: 'text.secondary' }}>
                    Upload JPG, PNG, or WebP images up to 5 MB each.
                  </Typography>
                }
              />
            </Stack>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button color="inherit" variant="outlined" onClick={handleCancel}>
            Cancel
          </Button>

          <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
            {review?.id ? 'Save Changes' : 'Post Review'}
          </LoadingButton>
        </DialogActions>
      </FormProvider>
    </Dialog>
  );
}

ProductReviewNewForm.propTypes = {
  onClose: PropTypes.func,
  open: PropTypes.bool,
  productId: PropTypes.string,
  review: PropTypes.object,
};
