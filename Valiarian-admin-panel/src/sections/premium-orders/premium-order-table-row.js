import { format } from 'date-fns';
import PropTypes from 'prop-types';
import IconButton from '@mui/material/IconButton';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Label from 'src/components/label';
import Iconify from 'src/components/iconify';
import { fCurrency } from 'src/utils/format-number';

const getStatusColor = (status) => {
  switch (status) {
    case 'paid':
    case 'fulfilled':
      return 'success';
    case 'ready_to_fulfill':
    case 'reserved':
      return 'warning';
    case 'payment_failed':
    case 'cancelled':
      return 'error';
    case 'refunded':
      return 'info';
    default:
      return 'default';
  }
};

export default function PremiumOrderTableRow({ row, onViewRow }) {
  return (
    <TableRow hover>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>#{row.preorderNumber}</TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        {row.user?.fullName || row.billingAddress?.fullName || row.user?.email || 'N/A'}
      </TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        {row.productSnapshot?.name || row.product?.name || 'Premium Product'}
      </TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        {row.selectedSize || row.productSnapshot?.variantLabel || '-'}
      </TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>{format(new Date(row.createdAt), 'dd MMM yyyy')}</TableCell>
      <TableCell>
        <Label variant="soft" color={getStatusColor(row.status)} sx={{ textTransform: 'capitalize' }}>
          {String(row.status || '').replace(/_/g, ' ')}
        </Label>
      </TableCell>
      <TableCell>
        <Label
          variant="soft"
          color={getStatusColor(row.paymentStatus)}
          sx={{ textTransform: 'capitalize' }}
        >
          {String(row.paymentStatus || '').replace(/_/g, ' ')}
        </Label>
      </TableCell>
      <TableCell>{fCurrency(row.total)}</TableCell>
      <TableCell align="center">
        <IconButton onClick={onViewRow}>
          <Iconify icon="solar:eye-bold" />
        </IconButton>
      </TableCell>
    </TableRow>
  );
}

PremiumOrderTableRow.propTypes = {
  onViewRow: PropTypes.func,
  row: PropTypes.object,
};
