import { format } from 'date-fns';
import PropTypes from 'prop-types';
// @mui
import IconButton from '@mui/material/IconButton';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
// utils
import { fCurrency } from 'src/utils/format-number';
// components
import Iconify from 'src/components/iconify';
import Label from 'src/components/label';

// NOTE: Popover menu has been replaced with direct eye button for better UX
// To re-enable popover menu, uncomment the imports and code sections marked with "COMMENTED OUT"
// Imports needed: MenuItem, CustomPopover, usePopover

// ----------------------------------------------------------------------

export default function OrderTableRow({ row, onViewRow, onEditRow }) {
  const { orderNumber, createdAt, status, paymentStatus, total, user } = row;

  // Debug: Log row data
  console.log('📋 OrderTableRow data:', {
    id: row.id,
    orderNumber: row.orderNumber,
    status: row.status,
    hasUser: !!user,
    userFullName: user?.fullName
  });

  // COMMENTED OUT: Popover menu - can be re-enabled if needed
  // const popover = usePopover();

  const getStatusColor = (orderStatus) => {
    switch (orderStatus) {
      case 'delivered':
      case 'parcel_received':
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
    switch (paymentStatus) {
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

  const formatStatusLabel = (value) =>
    value
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

  return (
    <>
      <TableRow hover>
        <TableCell sx={{ whiteSpace: 'nowrap' }}>#{orderNumber}</TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {user?.fullName || user?.email || 'N/A'}
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
            {formatStatusLabel(status)}
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

        <TableCell align="center" sx={{ px: 1, whiteSpace: 'nowrap' }}>
          {/* Direct eye button for view */}
          <IconButton
            onClick={onViewRow}
            title="View Order Details"
          >
            <Iconify icon="solar:eye-bold" />
          </IconButton>

          {/* COMMENTED OUT: Popover menu - can be re-enabled if needed
          <IconButton color={popover.open ? 'inherit' : 'default'} onClick={popover.onOpen}>
            <Iconify icon="eva:more-vertical-fill" />
          </IconButton>
          */}
        </TableCell>
      </TableRow>

      {/* COMMENTED OUT: Popover menu - can be re-enabled if needed
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
      */}
    </>
  );
}

OrderTableRow.propTypes = {
  onEditRow: PropTypes.func,
  onViewRow: PropTypes.func,
  row: PropTypes.object,
};
