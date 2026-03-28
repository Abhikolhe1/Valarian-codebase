import { format } from 'date-fns';
import PropTypes from 'prop-types';
import IconButton from '@mui/material/IconButton';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import { fCurrency } from 'src/utils/format-number';
import Iconify from 'src/components/iconify';
import Label from 'src/components/label';
import {
  formatOrderStatusLabel,
  getOrderStatusColor,
  getPaymentStatusColor,
} from 'src/utils/order-status';

export default function OrderTableRow({ row, onViewRow, onEditRow }) {
  const { orderNumber, createdAt, status, paymentStatus, total, user } = row;

  return (
    <TableRow hover>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>#{orderNumber}</TableCell>

      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        {user?.fullName || user?.email || 'N/A'}
      </TableCell>

      <TableCell sx={{ whiteSpace: 'nowrap' }}>{format(new Date(createdAt), 'dd MMM yyyy')}</TableCell>

      <TableCell>
        <Label variant="soft" color={getOrderStatusColor(status)} sx={{ textTransform: 'capitalize' }}>
          {formatOrderStatusLabel(status)}
        </Label>
      </TableCell>

      <TableCell>
        <Label
          variant="soft"
          color={getPaymentStatusColor(paymentStatus)}
          sx={{ textTransform: 'capitalize' }}
        >
          {formatOrderStatusLabel(paymentStatus)}
        </Label>
      </TableCell>

      <TableCell>{fCurrency(total)}</TableCell>

      <TableCell align="center" sx={{ px: 1, whiteSpace: 'nowrap' }}>
        <IconButton onClick={onViewRow} title="View Order Details">
          <Iconify icon="solar:eye-bold" />
        </IconButton>
      </TableCell>
    </TableRow>
  );
}

OrderTableRow.propTypes = {
  onEditRow: PropTypes.func,
  onViewRow: PropTypes.func,
  row: PropTypes.object,
};
