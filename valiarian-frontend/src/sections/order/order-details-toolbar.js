import PropTypes from 'prop-types';
// @mui
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
// routes
import { RouterLink } from 'src/routes/components';
// utils
import { fDateTime } from 'src/utils/format-time';
// components
import Label from 'src/components/label';
import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------

export default function OrderDetailsToolbar({
  status,
  backLink,
  createdAt,
  orderNumber,
  onCancel,
  onReturn,
  onTrack,
}) {
  return (
    <Stack
      spacing={3}
      direction={{ xs: 'column', md: 'row' }}
      sx={{
        mb: { xs: 3, md: 5 },
      }}
    >
      <Stack spacing={1} direction="row" alignItems="flex-start">
        <IconButton component={RouterLink} href={backLink}>
          <Iconify icon="eva:arrow-ios-back-fill" />
        </IconButton>

        <Stack spacing={0.5}>
          <Stack spacing={1} direction="row" alignItems="center" flexWrap="wrap">
            <Typography variant="h4"> Order {orderNumber} </Typography>
            <Label
              variant="soft"
              color={
                (status === 'completed' && 'success') ||
                (status === 'delivered' && 'success') ||
                (status === 'pending' && 'warning') ||
                (status === 'cancelled' && 'error') ||
                'default'
              }
            >
              {status}
            </Label>
          </Stack>

          <Typography variant="body2" sx={{ color: 'text.disabled' }}>
            {fDateTime(createdAt)}
          </Typography>
        </Stack>
      </Stack>

      <Stack
        flexGrow={1}
        spacing={1.5}
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="flex-end"
        sx={{ mt: { xs: 1, md: 0 } }}
      >
        {onTrack && (
          <Button
            color="inherit"
            variant="outlined"
            startIcon={<Iconify icon="solar:map-point-rotate-bold" />}
            onClick={onTrack}
          >
            Track Order
          </Button>
        )}

        {onCancel && (
          <Button
            color="error"
            variant="outlined"
            startIcon={<Iconify icon="solar:close-circle-bold" />}
            onClick={onCancel}
          >
            Cancel Order
          </Button>
        )}

        {onReturn && (
          <Button
            color="inherit"
            variant="contained"
            startIcon={<Iconify icon="solar:restart-bold" />}
            onClick={onReturn}
          >
            Return Order
          </Button>
        )}
      </Stack>
    </Stack>
  );
}

OrderDetailsToolbar.propTypes = {
  backLink: PropTypes.string,
  createdAt: PropTypes.oneOfType([PropTypes.instanceOf(Date), PropTypes.string]),
  onCancel: PropTypes.func,
  onReturn: PropTypes.func,
  onTrack: PropTypes.func,
  orderNumber: PropTypes.string,
  status: PropTypes.string,
};
