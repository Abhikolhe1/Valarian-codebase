import PropTypes from 'prop-types';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import Label from 'src/components/label';
import Iconify from 'src/components/iconify';
import { fDateTime } from 'src/utils/format-time';
import { Box } from '@mui/material';

export default function ContactReqestTableRow({
  row,
  onEditRow,
}) {
  const { name, email, phoneNumber, contactTokenId, subject, createdAt, message, status } = row;

  const statusColor =
    (status === 'new' && 'info') ||
    (status === 'replied' && 'success') ||
    (status === 'spam' && 'error') ||
    'default';

  return (
      <TableRow>
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
            <IconButton onClick={onEditRow}>
              <Iconify icon="solar:eye-bold" />
            </IconButton>
          </Tooltip>
        </TableCell>
      </TableRow>
  );
}

ContactReqestTableRow.propTypes = {
  onEditRow: PropTypes.func,
  row: PropTypes.object,
};
