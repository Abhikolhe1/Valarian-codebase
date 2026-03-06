import { format } from 'date-fns';
import PropTypes from 'prop-types';
// @mui
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
// utils
import { fCurrency } from 'src/utils/format-number';
// components
import CustomPopover, { usePopover } from 'src/components/custom-popover';
import Iconify from 'src/components/iconify';
import Label from 'src/components/label';

// ----------------------------------------------------------------------

export default function OrderTableRow({ row, onViewRow, onEditRow }) {
  const { orderNumber, createdAt, status, paymentStatus, total, user } = row;

  const popover = usePopover();

  const getStatusColor = (orderStatus) => {
    switch (orderStatus) {
      case 'delivered':
        return 'success';
      case 'pending':
        return 'warning';
      case 'confirmed':
      case 'processing':
      case 'packed':
        return 'info';
      case 'shipped':
        return 'primary';
      case 'cancelled':
      case 'refunded':
        return 'error';
      case 'returned':
        return 'default';
      default:
        return 'default';
    }
  };

  const getPaymentStatusColor = () => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'error';
      case 'refunded':
      case 'partially_refunded':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <>
      <TableRow hover>
        <TableCell sx={{ whiteSpace: 'nowrap' }}>#{orderNumber}</TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {user?.name || user?.email || 'N/A'}
        </TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {format(new Date(createdAt), 'dd MMM yyyy')}
        </TableCell>

        <TableCell>
          <Label
            variant="soft"
            color={getStatusColor(status)}
            sx={{ textTransform: 'capitalize' }}
          >
            {status}
          </Label>
        </TableCell>

        <TableCell>
          <Label
            variant="soft"
            color={getPaymentStatusColor(paymentStatus)}
            sx={{ textTransform: 'capitalize' }}
          >
            {paymentStatus.replace('_', ' ')}
          </Label>
        </TableCell>

        <TableCell>{fCurrency(total)}</TableCell>

        <TableCell align="right" sx={{ px: 1, whiteSpace: 'nowrap' }}>
          <IconButton color={popover.open ? 'inherit' : 'default'} onClick={popover.onOpen}>
            <Iconify icon="eva:more-vertical-fill" />
          </IconButton>
        </TableCell>
      </TableRow>

      <CustomPopover
        open={popover.open}
        onClose={popover.onClose}
        arrow="right-top"
        sx={{ width: 160 }}
      >
        <MenuItem
          onClick={() => {
            onViewRow();
            popover.onClose();
          }}
        >
          <Iconify icon="solar:eye-bold" />
          View
        </MenuItem>

        <MenuItem
          onClick={() => {
            onEditRow();
            popover.onClose();
          }}
        >
          <Iconify icon="solar:pen-bold" />
          Edit
        </MenuItem>
      </CustomPopover>
    </>
  );
}

OrderTableRow.propTypes = {
  onEditRow: PropTypes.func,
  onViewRow: PropTypes.func,
  row: PropTypes.object,
};
