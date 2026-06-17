import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import ProductReviewItem from './product-review-item';

export default function ProductReviewList({
  reviews,
  onEditReview,
  onDeleteReview,
  deletingReviewId,
}) {
  return (
    <Box sx={{ px: { xs: 2, md: 3 }, py: 3 }}>
      {reviews.map((review, index) => (
        <Box key={review.id}>
          <ProductReviewItem
            review={review}
            onEditReview={onEditReview}
            onDeleteReview={onDeleteReview}
            deletingReviewId={deletingReviewId}
          />

          {index < reviews.length - 1 && <Divider sx={{ my: 3 }} />}
        </Box>
      ))}
    </Box>
  );
}

ProductReviewList.propTypes = {
  deletingReviewId: PropTypes.string,
  onDeleteReview: PropTypes.func,
  onEditReview: PropTypes.func,
  reviews: PropTypes.array,
};
