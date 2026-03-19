import PropTypes from 'prop-types';
// @mui
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
// utils
import { fCurrency } from 'src/utils/format-number';
// hooks
import { useBoolean } from 'src/hooks/use-boolean';
// components
import { ConfirmDialog } from 'src/components/custom-dialog';
import CustomPopover, { usePopover } from 'src/components/custom-popover';
import Iconify from 'src/components/iconify';
import Label from 'src/components/label';

// ----------------------------------------------------------------------

export default function ProductTableRow({
  row,
  selected,
  onSelectRow,
  onDeleteRow,
  onEditRow,
  onViewRow,
}) {
  const {
    name,
    price,
    salePrice,
    status,
    coverImage,
    category,
    stockQuantity,
    inStock,
    isNewArrival,
    isBestSeller,
    isFeatured,
  } = row;

  const confirm = useBoolean();

  const popover = usePopover();

  const hasDiscount = salePrice && salePrice < price;

  return (
    <>
      <TableRow hover selected={selected}>
        <TableCell padding="checkbox">
          <Checkbox checked={selected} onClick={onSelectRow} />
        </TableCell>

        <TableCell sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar
            alt={name}
            src={coverImage}
            variant="rounded"
            sx={{ width: 64, height: 64, mr: 2 }}
          />

          <ListItemText
            disableTypography
            primary={
              <Link
                noWrap
                color="inherit"
                variant="subtitle2"
                onClick={onViewRow}
                sx={{ cursor: 'pointer' }}
              >
                {name}
              </Link>
            }
            secondary={
              <Box component="div" sx={{ typography: 'body2', color: 'text.disabled' }}>
                {category ? category.name : '-'}
              </Box>
            }
          />
        </TableCell>

        <TableCell>{fCurrency(price)}</TableCell>

        <TableCell>
          {hasDiscount ? (
            <Box sx={{ color: 'error.main' }}>{fCurrency(salePrice)}</Box>
          ) : (
            '-'
          )}
        </TableCell>

        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ typography: 'body2' }}>{stockQuantity || 0}</Box>
            <Label
              variant="soft"
              color={inStock ? 'success' : 'error'}
            >
              {inStock ? 'In Stock' : 'Out of Stock'}
            </Label>
          </Box>
        </TableCell>

        <TableCell>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {isNewArrival && (
              <Label variant="soft" color="info" sx={{ fontSize: 10 }}>
                New
              </Label>
            )}
            {isBestSeller && (
              <Label variant="soft" color="success" sx={{ fontSize: 10 }}>
                Best
              </Label>
            )}
            {isFeatured && (
              <Label variant="soft" color="warning" sx={{ fontSize: 10 }}>
                Featured
              </Label>
            )}
            {!isNewArrival && !isBestSeller && !isFeatured && '-'}
          </Box>
        </TableCell>

        <TableCell>
          <Label
            variant="soft"
            color={
              (status === 'published' && 'success') ||
              (status === 'draft' && 'default') ||
              'error'
            }
          >
            {status}
          </Label>
        </TableCell>

        <TableCell align="right">
          <IconButton color={popover.open ? 'primary' : 'default'} onClick={popover.onOpen}>
            <Iconify icon="eva:more-vertical-fill" />
          </IconButton>
        </TableCell>
      </TableRow>

      <CustomPopover
        open={popover.open}
        onClose={popover.onClose}
        arrow="right-top"
        sx={{ width: 140 }}
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

        <MenuItem
          onClick={() => {
            confirm.onTrue();
            popover.onClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <Iconify icon="solar:trash-bin-trash-bold" />
          Delete
        </MenuItem>
      </CustomPopover>

      <ConfirmDialog
        open={confirm.value}
        onClose={confirm.onFalse}
        title="Delete"
        content="Are you sure want to delete?"
        action={
          <Button variant="contained" color="error" onClick={onDeleteRow}>
            Delete
          </Button>
        }
      />
    </>
  );
}

ProductTableRow.propTypes = {
  onDeleteRow: PropTypes.func,
  onEditRow: PropTypes.func,
  onSelectRow: PropTypes.func,
  onViewRow: PropTypes.func,
  row: PropTypes.object,
  selected: PropTypes.bool,
};
