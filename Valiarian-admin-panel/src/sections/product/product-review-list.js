import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ConfirmDialog } from 'src/components/custom-dialog';
import Iconify from 'src/components/iconify';
import Image from 'src/components/image';
import Label from 'src/components/label';
import Scrollbar from 'src/components/scrollbar';
import {
  emptyRows,
  TableEmptyRows,
  TableHeadCustom,
  TableNoData,
  TablePaginationCustom,
  useTable,
} from 'src/components/table';
import { fDateTime } from 'src/utils/format-time';

const TABLE_HEAD = [
  { id: 'user', label: 'User', minWidth: 180 },
  { id: 'rating', label: 'Rating', width: 110 },
  { id: 'review', label: 'Review', minWidth: 280 },
  { id: 'images', label: 'Images', width: 140 },
  { id: 'status', label: 'Status', width: 120 },
  { id: 'createdAt', label: 'Created', width: 180 },
  { id: 'actions', label: 'Actions', width: 220, align: 'right' },
];

export default function ProductReviewList({
  reviews,
  loading,
  onToggleHidden,
  onDeleteReview,
  actioningReviewId,
}) {
  const table = useTable({ defaultOrderBy: 'createdAt', defaultOrder: 'desc' });
  const [reviewToDelete, setReviewToDelete] = useState(null);
  const [reviewToHide, setReviewToHide] = useState(null);
  const [hideReason, setHideReason] = useState('');
  const [hideReasonError, setHideReasonError] = useState('');

  const dataInPage = useMemo(
    () =>
      reviews.slice(
        table.page * table.rowsPerPage,
        table.page * table.rowsPerPage + table.rowsPerPage
      ),
    [reviews, table.page, table.rowsPerPage]
  );

  const getVisibilityActionLabel = (review) => {
    if (actioningReviewId === review.id) {
      return 'Saving...';
    }

    return review.isHidden ? 'Unhide' : 'Hide';
  };

  const handleHideDialogClose = () => {
    setReviewToHide(null);
    setHideReason('');
    setHideReasonError('');
  };

  return (
    <>
      <Card sx={{ mt: 3 }}>
        <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
          <Scrollbar>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 1100 }}>
              <TableHeadCustom headLabel={TABLE_HEAD} />

              <TableBody>
                {dataInPage.map((review) => (
                  <TableRow hover key={review.id}>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography variant="subtitle2">{review.userName}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {review.userId}
                        </Typography>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <Iconify icon="solar:star-bold" sx={{ color: 'warning.main' }} />
                        <Typography variant="body2">{review.rating}/5</Typography>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <Stack spacing={0.5}>
                        {!!review.title && <Typography variant="subtitle2">{review.title}</Typography>}
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            display: '-webkit-box',
                            overflow: 'hidden',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {review.comment}
                        </Typography>
                        {review.isHidden && !!review.hiddenReason && (
                          <Typography variant="caption" sx={{ color: 'warning.dark' }}>
                            Hide reason: {review.hiddenReason}
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>

                    <TableCell>
                      {review.images?.length ? (
                        <Stack direction="row" spacing={1}>
                          {review.images.slice(0, 3).map((image, index) => (
                            <Image
                              key={`${review.id}-${index}`}
                              src={image}
                              sx={{ width: 44, height: 44, borderRadius: 1.5, flexShrink: 0 }}
                            />
                          ))}
                          {review.images.length > 3 && (
                            <Label variant="soft" color="default">
                              +{review.images.length - 3}
                            </Label>
                          )}
                        </Stack>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          No images
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      <Label variant="soft" color={review.isHidden ? 'warning' : 'success'}>
                        {review.isHidden ? 'Hidden' : 'Visible'}
                      </Label>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">{fDateTime(review.createdAt)}</Typography>
                    </TableCell>

                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={actioningReviewId === review.id}
                          onClick={() => {
                            if (review.isHidden) {
                              onToggleHidden(review);
                              return;
                            }

                            setReviewToHide(review);
                            setHideReason('');
                            setHideReasonError('');
                          }}
                        >
                          {getVisibilityActionLabel(review)}
                        </Button>

                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          disabled={actioningReviewId === review.id}
                          onClick={() => setReviewToDelete(review)}
                        >
                          Delete
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}

                <TableEmptyRows
                  height={table.dense ? 56 : 76}
                  emptyRows={emptyRows(table.page, table.rowsPerPage, reviews.length)}
                />

                <TableNoData notFound={!loading && !reviews.length} />
              </TableBody>
            </Table>
          </Scrollbar>
        </TableContainer>

        <TablePaginationCustom
          count={reviews.length}
          page={table.page}
          rowsPerPage={table.rowsPerPage}
          onPageChange={table.onChangePage}
          onRowsPerPageChange={table.onChangeRowsPerPage}
          dense={table.dense}
          onChangeDense={table.onChangeDense}
        />
      </Card>

      <ConfirmDialog
        open={!!reviewToDelete}
        onClose={() => setReviewToDelete(null)}
        title="Delete Review"
        content="Are you sure you want to delete this review? This action cannot be undone."
        action={
          <Button
            variant="contained"
            color="error"
            onClick={async () => {
              const selectedReview = reviewToDelete;
              setReviewToDelete(null);
              if (selectedReview) {
                await onDeleteReview(selectedReview);
              }
            }}
          >
            Delete
          </Button>
        }
      />

      <Dialog open={!!reviewToHide} onClose={handleHideDialogClose} fullWidth maxWidth="sm">
        <DialogTitle>Hide Review</DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Add the reason for hiding this review. This field is mandatory.
            </Typography>

            <TextField
              autoFocus
              fullWidth
              multiline
              minRows={4}
              label="Reason"
              value={hideReason}
              onChange={(event) => {
                setHideReason(event.target.value);
                if (hideReasonError) {
                  setHideReasonError('');
                }
              }}
              error={!!hideReasonError}
              helperText={hideReasonError || 'Explain why this review is being hidden.'}
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button color="inherit" variant="outlined" onClick={handleHideDialogClose}>
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={async () => {
              const reason = hideReason.trim();

              if (!reason) {
                setHideReasonError('Reason is required.');
                return;
              }

              const selectedReview = reviewToHide;
              handleHideDialogClose();

              if (selectedReview) {
                await onToggleHidden(selectedReview, reason);
              }
            }}
          >
            Hide Review
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

ProductReviewList.propTypes = {
  actioningReviewId: PropTypes.string,
  loading: PropTypes.bool,
  onDeleteReview: PropTypes.func,
  onToggleHidden: PropTypes.func,
  reviews: PropTypes.array,
};
