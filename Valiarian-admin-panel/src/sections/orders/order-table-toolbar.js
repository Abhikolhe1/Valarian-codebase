import PropTypes from 'prop-types';
// @mui
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
// components
import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------

export default function OrderTableToolbar({
  filters,
  onFilters,
  statusOptions,
  paymentStatusOptions,
}) {
  return (
    <Stack
      spacing={2}
      alignItems={{ xs: 'flex-end', md: 'center' }}
      direction={{
        xs: 'column',
        md: 'row',
      }}
      sx={{
        p: 2.5,
        pr: { xs: 2.5, md: 1 },
      }}
    >
      <TextField
        fullWidth
        value={filters.search}
        onChange={(event) => onFilters('search', event.target.value)}
        placeholder="Search by order number..."
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
            </InputAdornment>
          ),
        }}
      />

      <TextField
        fullWidth
        select
        label="Status"
        value={filters.status}
        onChange={(event) => onFilters('status', event.target.value)}
        SelectProps={{
          MenuProps: {
            PaperProps: {
              sx: { maxHeight: 240 },
            },
          },
        }}
        sx={{
          maxWidth: { md: 200 },
          textTransform: 'capitalize',
        }}
      >
        {statusOptions.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        fullWidth
        select
        label="Payment Status"
        value={filters.paymentStatus}
        onChange={(event) => onFilters('paymentStatus', event.target.value)}
        SelectProps={{
          MenuProps: {
            PaperProps: {
              sx: { maxHeight: 240 },
            },
          },
        }}
        sx={{
          maxWidth: { md: 200 },
          textTransform: 'capitalize',
        }}
      >
        {paymentStatusOptions.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );
}

OrderTableToolbar.propTypes = {
  filters: PropTypes.object,
  onFilters: PropTypes.func,
  statusOptions: PropTypes.array,
  paymentStatusOptions: PropTypes.array,
};
