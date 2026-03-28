import PropTypes from 'prop-types';
import { useState } from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Rating from '@mui/material/Rating';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ConfirmDialog } from 'src/components/custom-dialog';
import Lightbox, { useLightBox } from 'src/components/lightbox';
import { fDateTime } from 'src/utils/format-time';

export default function ProductReviewItem({
  review,
  onEditReview,
  onDeleteReview,
  deletingReviewId,
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const hasTitle = Boolean(review.title?.trim());
  const slides = (review.images || []).map((image) => ({ src: image }));
  const lightbox = useLightBox(slides);

  return (
    <>
      <Stack
        spacing={2}
        direction="row"
        alignItems="flex-start"
        sx={{
          px: { xs: 1, md: 0 },
          py: { xs: 2, md: 2.5 },
        }}
      >
        <Stack
          spacing={1.5}
          alignItems="center"
          justifyContent="flex-start"
          sx={{
            pt: 0.25,
            minWidth: { xs: 40, md: 48 },
          }}
        >
          <Avatar
            src={review.userAvatar}
            sx={{
              width: { xs: 40, md: 44 },
              height: { xs: 40, md: 44 },
            }}
          >
            {review.userName?.charAt(0)?.toUpperCase()}
          </Avatar>
        </Stack>

        <Stack spacing={1.5} flexGrow={1}>
          <Stack spacing={0.75}>
            <Typography variant="subtitle2" sx={{ lineHeight: 1.2 }}>
              {review.userName}
            </Typography>

            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={{ xs: 0.75, md: 1 }}
              justifyContent="space-between"
              alignItems={{ md: 'center' }}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={{ xs: 0.75, sm: 1 }}
                alignItems={{ sm: 'center' }}
                flexWrap="wrap"
              >
                <Rating
                  size="small"
                  value={Number(review.rating) || 0}
                  precision={0.1}
                  readOnly
                  sx={{ color: 'warning.main' }}
                />

                {hasTitle && (
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: 0.2,
                    }}
                  >
                    {review.title}
                  </Typography>
                )}
              </Stack>

              {review.isOwner && (
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="outlined" onClick={() => onEditReview(review)}>
                    Edit
                  </Button>

                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    disabled={deletingReviewId === review.id}
                    onClick={() => setConfirmOpen(true)}
                  >
                    {deletingReviewId === review.id ? 'Deleting...' : 'Delete'}
                  </Button>
                </Stack>
              )}
            </Stack>

            <Typography variant="body2" color="text.secondary">
              Reviewed on {fDateTime(review.createdAt)}
            </Typography>
          </Stack>

          <Typography
            variant="body2"
            sx={{
              color: 'text.primary',
              whiteSpace: 'pre-line',
              lineHeight: 1.8,
            }}
          >
            {review.comment}
          </Typography>

          {!!review.images?.length && (
            <Box
              display="grid"
              gridTemplateColumns={{
                xs: 'repeat(2, minmax(0, 1fr))',
                sm: 'repeat(4, minmax(72px, 88px))',
              }}
              gap={1.5}
              sx={{ pt: 0.5, justifyContent: 'flex-start' }}
            >
              {review.images.map((image, index) => (
                <Box
                  key={`${review.id}-${index}`}
                  component="img"
                  src={image}
                  alt={review.title || review.comment || 'Review image'}
                  onClick={() => lightbox.onOpen(image)}
                  sx={{
                    width: { xs: 1, sm: 88 },
                    height: { xs: 'auto', sm: 88 },
                    aspectRatio: '1 / 1',
                    objectFit: 'cover',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </Box>
          )}
        </Stack>
      </Stack>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete Review"
        content="Are you sure you want to delete your review? This action cannot be undone."
        action={
          <Button
            variant="contained"
            color="error"
            onClick={async () => {
              setConfirmOpen(false);
              await onDeleteReview(review);
            }}
          >
            Delete
          </Button>
        }
      />

      <Lightbox
        index={lightbox.selected}
        slides={slides}
        open={lightbox.open}
        close={lightbox.onClose}
        onGetCurrentIndex={(index) => lightbox.setSelected(index)}
      />
    </>
  );
}

ProductReviewItem.propTypes = {
  deletingReviewId: PropTypes.string,
  onDeleteReview: PropTypes.func,
  onEditReview: PropTypes.func,
  review: PropTypes.object,
};
