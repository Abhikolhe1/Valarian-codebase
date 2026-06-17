import PropTypes from 'prop-types';
import { useCallback, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import Rating from '@mui/material/Rating';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useSnackbar } from 'src/components/snackbar';
import {
  deleteReview,
  refreshAdminProductReviews,
  toggleAdminReviewHidden,
  useGetAdminProductReviews,
} from 'src/api/reviews';
import ProductReviewList from './product-review-list';

const FALLBACK_BREAKDOWN = [5, 4, 3, 2, 1];

export default function ProductDetailsReview({ productId }) {
  const { enqueueSnackbar } = useSnackbar();
  const { reviews, stats, reviewsLoading, reviewsError } = useGetAdminProductReviews(productId);
  const [actioningReviewId, setActioningReviewId] = useState(null);

  const breakdown = useMemo(() => {
    if (stats?.breakdown?.length) {
      return [...stats.breakdown].sort((a, b) => b.star - a.star);
    }

    return FALLBACK_BREAKDOWN.map((star) => ({ star, count: 0 }));
  }, [stats]);

  const totalReviews = stats?.totalReviews || 0;
  const averageRating = stats?.averageRating || 0;

  const handleToggleHidden = useCallback(
    async (review, hiddenReason = '') => {
      try {
        setActioningReviewId(review.id);
        await toggleAdminReviewHidden(review.id, !review.isHidden, hiddenReason);
        await refreshAdminProductReviews(productId);
        enqueueSnackbar(
          review.isHidden ? 'Review is visible again.' : 'Review hidden successfully.',
          {
            variant: 'success',
          }
        );
      } catch (error) {
        enqueueSnackbar(error?.message || 'Unable to update review visibility right now.', {
          variant: 'error',
        });
      } finally {
        setActioningReviewId(null);
      }
    },
    [enqueueSnackbar, productId]
  );

  const handleDeleteReview = useCallback(
    async (review) => {
      try {
        setActioningReviewId(review.id);
        await deleteReview(review.id);
        await refreshAdminProductReviews(productId);
        enqueueSnackbar('Review deleted successfully.', { variant: 'success' });
      } catch (error) {
        enqueueSnackbar(error?.message || 'Unable to delete review right now.', {
          variant: 'error',
        });
      } finally {
        setActioningReviewId(null);
      }
    },
    [enqueueSnackbar, productId]
  );

  return (
    <>
      <Box
        display="grid"
        gridTemplateColumns={{
          xs: 'repeat(1, 1fr)',
          md: 'repeat(2, 1fr)',
        }}
        sx={{
          py: { xs: 3, md: 0 },
        }}
      >
        <Stack spacing={1} alignItems="center" justifyContent="center" sx={{ px: 3, py: 4 }}>
          <Typography variant="subtitle2">Average rating</Typography>

          <Typography variant="h2">{averageRating.toFixed(1)}/5</Typography>

          <Rating readOnly value={averageRating} precision={0.1} />

          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {totalReviews} total reviews
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
                  minWidth: 36,
                  color: 'text.secondary',
                }}
              >
                {item.count}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Box>

      <Divider sx={{ borderStyle: 'dashed' }} />

      {reviewsLoading && <LinearProgress sx={{ mx: 3, mt: 3 }} />}

      {!!reviewsError && (
        <Alert severity="warning" sx={{ mx: 3, mt: 3 }}>
          {reviewsError?.message || 'Unable to load product reviews right now.'}
        </Alert>
      )}

      <ProductReviewList
        reviews={reviews}
        loading={reviewsLoading}
        actioningReviewId={actioningReviewId}
        onDeleteReview={handleDeleteReview}
        onToggleHidden={handleToggleHidden}
      />
    </>
  );
}

ProductDetailsReview.propTypes = {
  productId: PropTypes.string,
};
