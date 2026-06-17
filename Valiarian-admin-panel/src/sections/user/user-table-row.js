import PropTypes from 'prop-types';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';
import { useBoolean } from 'src/hooks/use-boolean';
import Label from 'src/components/label';
import Iconify from 'src/components/iconify';
import CustomPopover, { usePopover } from 'src/components/custom-popover';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { fDateTime } from 'src/utils/format-time';

// ----------------------------------------------------------------------

export default function UserTableRow({ row, onToggleBlock }) {
  const { fullName, profilePicture, role, status, email, phone, createdAt, lastLoginAt } = row;

  const confirm = useBoolean();

  const popover = usePopover();

  return (
    <>
      <TableRow hover>
        <TableCell sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar alt={fullName} src={profilePicture} sx={{ mr: 2 }} />

          <ListItemText
            primary={fullName || 'User'}
            secondary={email}
            primaryTypographyProps={{ typography: 'body2' }}
            secondaryTypographyProps={{ component: 'span', color: 'text.disabled' }}
          />
        </TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap' }}>{phone || '-'}</TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap', textTransform: 'capitalize' }}>{role || 'user'}</TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap' }}>{createdAt ? fDateTime(createdAt) : '-'}</TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {lastLoginAt ? fDateTime(lastLoginAt) : '-'}
        </TableCell>

        <TableCell>
          <Label
            variant="soft"
            color={
              (status === 'active' && 'success') ||
              (status === 'blocked' && 'error') ||
              'default'
            }
          >
            {status}
          </Label>
        </TableCell>

        <TableCell align="right" sx={{ px: 1, whiteSpace: 'nowrap' }}>
          <Tooltip title="Actions" placement="top" arrow>
            <IconButton color={popover.open ? 'inherit' : 'default'} onClick={popover.onOpen}>
              <Iconify icon="eva:more-vertical-fill" />
            </IconButton>
          </Tooltip>
        </TableCell>
      </TableRow>

      <CustomPopover
        open={popover.open}
        onClose={popover.onClose}
        arrow="right-top"
        sx={{ width: 180 }}
      >
        <MenuItem
          onClick={() => {
            confirm.onTrue();
            popover.onClose();
          }}
          sx={{ color: status === 'active' ? 'error.main' : 'success.main' }}
        >
          <Iconify icon={status === 'active' ? 'solar:lock-bold' : 'solar:lock-unlocked-bold'} />
          {status === 'active' ? 'Block User' : 'Unblock User'}
        </MenuItem>
      </CustomPopover>

      <ConfirmDialog
        open={confirm.value}
        onClose={confirm.onFalse}
        title={status === 'active' ? 'Block User' : 'Unblock User'}
        content={
          status === 'active'
            ? 'Are you sure you want to block this user from accessing the app?'
            : 'Are you sure you want to unblock this user?'
        }
        action={
          <Button
            variant="contained"
            color={status === 'active' ? 'error' : 'success'}
            onClick={async () => {
              await onToggleBlock(row);
              confirm.onFalse();
            }}
          >
            {status === 'active' ? 'Block' : 'Unblock'}
          </Button>
        }
      />
    </>
  );
}

UserTableRow.propTypes = {
  onToggleBlock: PropTypes.func,
  row: PropTypes.object,
};
