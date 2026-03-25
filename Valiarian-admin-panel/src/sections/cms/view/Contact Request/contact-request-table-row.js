import PropTypes from 'prop-types';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { useBoolean } from 'src/hooks/use-boolean';
import Label from 'src/components/label';
import Iconify from 'src/components/iconify';
import CustomPopover, { usePopover } from 'src/components/custom-popover';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { fDateTime } from 'src/utils/format-time';
import { Box } from '@mui/material';

export default function ContactReqestTableRow({
  row,
  selected,
  onEditRow,
  onSelectRow,
  onDeleteRow,
  quickEdit,

}) {
  const { name, email, phoneNumber, contactTokenId, subject, createdAt, message, status } = row;

  const popover = usePopover();

  const statusColor =
    (status === 'new' && 'info') ||
    (status === 'processing' && 'warning') ||
    (status === 'shipped' && 'primary') ||
    (status === 'delivered' && 'success') ||
    (status === 'cancelled' && 'error') ||
    'default';

  return (
    <>
      <TableRow >
        {/* <TableCell padding="checkbox">
          <Checkbox checked={selected} onClick={onSelectRow} />
        </TableCell> */}

        <TableCell
          sx={{
            minWidth: 280,
            maxWidth: 280,
            px: 2,
            py: 2,
            verticalAlign: 'top',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 0.5,
              overflow: 'hidden',
            }}
          >
            <Typography
              variant="subtitle2"
              noWrap
              sx={{ fontWeight: 700 }}
            >
              {name || '-'}
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              noWrap
            >
              {email || '-'}
            </Typography>

            {!!phoneNumber && (
              <Typography
                variant="caption"
                color="text.disabled"
                noWrap
                sx={{ fontSize: 13 }}
              >
                {phoneNumber}
              </Typography>
            )}
          </Box>
        </TableCell>

        <TableCell width={200}>
          <Typography variant="subtitle2">{contactTokenId || '-'}</Typography>
        </TableCell>


        <TableCell width={220}>
          <Typography variant="subtitle2">{subject || '-'}</Typography>
        </TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {createdAt ? fDateTime(createdAt) : '-'}
        </TableCell>

        <TableCell>
          <Label variant="soft" color={statusColor}>
            {status || '-'}
          </Label>
        </TableCell>

        <TableCell
          sx={{
            minWidth: 260,
            maxWidth: 320,
            px: 2,
            py: 2,
            verticalAlign: 'top',
          }}
        >
          <Typography
            variant="body2"
            sx={{
              display: '-webkit-box',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              wordBreak: 'break-word',
              maxWidth: 320,
              lineHeight: 1.5,
            }}
          >
            {message || '-'}
          </Typography>
        </TableCell>

        {/* <TableCell
          align="right"
          sx={{
            px: 3,
            py: 1,
            whiteSpace: 'nowrap',
            width: 88,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
            }}
          >
            <IconButton
              color={popover.open ? 'inherit' : 'default'}
              onClick={popover.onOpen}
              sx={{ p: 1 }}
            >
              <Iconify icon="eva:more-vertical-fill" />
            </IconButton>
          </Box>
        </TableCell> */}
        <TableCell align="right" sx={{ px: 1, whiteSpace: 'nowrap' }}>
          <Tooltip title="Edit" placement="top" arrow>
            <IconButton onClick={() => {
              onEditRow();
              popover.onClose();
            }}>
              <Iconify icon="solar:eye-bold" />
            </IconButton>
          </Tooltip>
        </TableCell>
      </TableRow>

    </>
  );
}

ContactReqestTableRow.propTypes = {
  onDeleteRow: PropTypes.func,
  onEditRow: PropTypes.func,
  onSelectRow: PropTypes.func,
  row: PropTypes.object,
  selected: PropTypes.bool,
  quickEdit: PropTypes.func,
};
