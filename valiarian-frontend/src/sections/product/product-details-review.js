import PropTypes from 'prop-types';
import { useCallback, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import Rating from '@mui/material/Rating';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useSnackbar } from 'src/components/snackbar';
import { useBoolean } from 'src/hooks/use-boolean';
import { fShortenNumber } from 'src/utils/format-number';
import { deleteReview, refreshProductReviews, useGetProductReviews } from 'src/api/reviews';
import Iconify from 'src/components/iconify';
import EmptyContent from 'src/components/empty-content';
import ProductReviewList from './product-review-list';
import ProductReviewNewForm from './product-review-new-form';

const FALLBACK_BREAKDOWN = [5, 4, 3, 2, 1];

export default function ProductDetailsReview({ productId }) {
  const reviewDialog = useBoolean();
  const { enqueueSnackbar } = useSnackbar();
  const { reviews, stats, eligibility, reviewsLoading, reviewsError } = useGetProductReviews(productId);
  const [activeReview, setActiveReview] = useState(null);
  const [deletingReviewId, setDeletingReviewId] = useState(null);

  const myReview = useMemo(() => reviews.find((review) => review.isOwner) || null, [reviews]);

  const breakdown = useMemo(() => {
    if (stats?.breakdown?.length) {
      return [...stats.breakdown].sort((a, b) => b.star - a.star);
    }

    return FALLBACK_BREAKDOWN.map((star) => ({ star, count: 0 }));
  }, [stats]);

  const totalReviews = stats?.totalReviews || 0;
  const averageRating = stats?.averageRating || 0;

  const handleOpenReviewForm = useCallback(() => {
    setActiveReview(myReview);
    reviewDialog.onTrue();
  }, [myReview, reviewDialog]);

  const handleEditReview = useCallback(
    (review) => {
      setActiveReview(review);
      reviewDialog.onTrue();
    },
    [reviewDialog]
  );

  const handleCloseReviewForm = useCallback(() => {
    setActiveReview(null);
    reviewDialog.onFalse();
  }, [reviewDialog]);

  const handleDeleteReview = useCallback(
    async (review) => {
      try {
        setDeletingReviewId(review.id);
        await deleteReview(review.id);
        await refreshProductReviews(productId);
        enqueueSnackbar('Review deleted successfully.', { variant: 'success' });
      } catch (error) {
        enqueueSnackbar(error?.message || 'Unable to delete your review right now.', {
          variant: 'error',
        });
      } finally {
        setDeletingReviewId(null);
      }
    },
    [enqueueSnackbar, productId]
  );

  const canOpenReviewForm = eligibility?.canWriteReview || !!myReview;

  return (
    <>
      <Box
        display="grid"
        gridTemplateColumns={{
          xs: 'repeat(1, 1fr)',
          md: 'repeat(3, 1fr)',
        }}
        sx={{
          py: { xs: 4, md: 0 },
        }}
      >
        <Stack spacing={1} alignItems="center" justifyContent="center" sx={{ px: 3, py: 4 }}>
          <Typography variant="subtitle2">Average rating</Typography>

          <Typography variant="h2">{averageRating.toFixed(1)}/5</Typography>

          <Rating readOnly value={averageRating} precision={0.1} />

          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            ({fShortenNumber(totalReviews)} reviews)
          </Typography>
        </Stack>

        <Stack
          spacing={1.5}
          sx={{
            py: 4,
            px: { xs: 3, md: 5 },
            borderLeft: (theme) => ({
              md: `dashed 1px ${theme.palette.divider}`,
            }),
            borderRight: (theme) => ({
              md: `dashed 1px ${theme.palette.divider}`,
            }),
          }}
        >
          {breakdown.map((item) => (
            <Stack key={item.star} direction="row" alignItems="center">
              <Typography variant="subtitle2" component="span" sx={{ width: 42 }}>
                {item.star} star
              </Typography>

              <LinearProgress
                color="inherit"
                variant="determinate"
                value={totalReviews ? (item.count / totalReviews) * 100 : 0}
                sx={{
                  mx: 2,
                  flexGrow: 1,
                }}
              />

              <Typography
                variant="body2"
                component="span"
                sx={{
                  minWidth: 48,
                  color: 'text.secondary',
                }}
              >
                {fShortenNumber(item.count)}
              </Typography>
            </Stack>
          ))}
        </Stack>

        <Stack alignItems="center" justifyContent="center" sx={{ px: 3, py: 4 }}>
          {canOpenReviewForm ? (
            <Button
              size="large"
              variant="soft"
              color="inherit"
              onClick={handleOpenReviewForm}
              startIcon={<Iconify icon="solar:pen-bold" />}
            >
              {myReview ? 'Edit your review' : 'Write review'}
            </Button>
          ) : (
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Customer reviews and photos appear here.
            </Typography>
          )}
        </Stack>
      </Box>

      <Divider sx={{ borderStyle: 'dashed' }} />

      {reviewsLoading && <LinearProgress sx={{ mx: 3, mt: 3 }} />}

      {!!reviewsError && (
        <Alert severity="warning" sx={{ mx: 3, mt: 3 }}>
          {reviewsError?.message || 'Unable to load reviews right now.'}
        </Alert>
      )}

      {reviews.length ? (
        <ProductReviewList
          reviews={reviews}
          deletingReviewId={deletingReviewId}
          onDeleteReview={handleDeleteReview}
          onEditReview={handleEditReview}
        />
      ) : (
        !reviewsLoading && (
          <EmptyContent
            title="No reviews yet"
            description="Once customers start sharing feedback, reviews will appear here."
            sx={{ py: 8 }}
          />
        )
      )}

      <ProductReviewNewForm
        open={reviewDialog.value}
        review={activeReview}
        productId={productId}
        onClose={handleCloseReviewForm}
      />
    </>
  );
}

ProductDetailsReview.propTypes = {
  productId: PropTypes.string,
};
