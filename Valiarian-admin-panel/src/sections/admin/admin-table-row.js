import PropTypes from 'prop-types';
// @mui
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Label from 'src/components/label';
import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------

export default function AdminTableRow({ row, onEditRow, onQuickEditRow }) {
  const {
    fullName,
    email,
    phone,
    isActive,
    createdAt,
  } = row;

  const createdAtLabel = createdAt ? new Date(createdAt).toLocaleString() : '-';

  return (
    <TableRow hover>
      <TableCell>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar>{(fullName || email || 'A').charAt(0).toUpperCase()}</Avatar>
          <Typography variant="subtitle2">{fullName || '-'}</Typography>
        </Stack>
      </TableCell>
      <TableCell>{email || '-'}</TableCell>
      <TableCell>{phone || '-'}</TableCell>
      <TableCell>
        <Label color={isActive ? 'success' : 'default'}>
          {isActive ? 'Active' : 'Inactive'}
        </Label>
      </TableCell>
      <TableCell>{createdAtLabel}</TableCell>
      <TableCell align="right">
        <Tooltip title="Quick Edit">
          <IconButton color="primary" onClick={onQuickEditRow}>
            <Iconify icon="solar:pen-new-square-bold" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Open Edit Page">
          <IconButton color="default" onClick={onEditRow}>
            <Iconify icon="solar:pen-bold" />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}

AdminTableRow.propTypes = {
  onEditRow: PropTypes.func,
  onQuickEditRow: PropTypes.func,
  row: PropTypes.object.isRequired,
};
