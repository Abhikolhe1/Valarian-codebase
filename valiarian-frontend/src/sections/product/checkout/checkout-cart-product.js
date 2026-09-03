import PropTypes from 'prop-types';
// @mui
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
// routes
import { RouterLink } from 'src/routes/components';
import { paths } from 'src/routes/paths';
// utils
import { fCurrency } from 'src/utils/format-number';
import { MAX_CART_ITEM_QUANTITY } from 'src/utils/cart-utils';
// components
import Label from 'src/components/label';
import Iconify from 'src/components/iconify';
import { ColorPreview } from 'src/components/color-utils';
//
import IncrementerButton from '../common/incrementer-button';

// ----------------------------------------------------------------------

export default function CheckoutCartProduct({ row, onDelete, onDecrease, onIncrease, isMobile }) {
  const { name, size, price, colors, coverUrl, quantity, available, slug, productId, id } = row;
  const productHref = `${
    slug ? paths.product.details(slug) : paths.product.details(productId || id)
  }${row.variantId ? `?variantId=${encodeURIComponent(row.variantId)}` : ''}`;
  const isOutOfStock = Number(available || 0) <= 0;
  const maxAllowedQuantity = Math.min(Number(available || 0), MAX_CART_ITEM_QUANTITY);
  // Only surface the raw stock count when it's genuinely low (< 10) — an
  // "available: 12"-style number for ample stock isn't useful to the
  // shopper and just adds clutter; out-of-stock still always shows.
  const isLowStock = !isOutOfStock && Number(available || 0) < 10;
  let stockMessage = null;
  if (isOutOfStock) {
    stockMessage = 'Out of stock';
  } else if (isLowStock) {
    stockMessage = `available: ${available}`;
  }

  // Mobile: a self-contained card instead of a table row — the table's
  // fixed minWidth forced horizontal scrolling on phones, hiding price and
  // quantity off-screen (reported UX issue). Mirrors the Amazon/Flipkart
  // app pattern: image + name up top, price and quantity stepper together
  // underneath, everything visible without scrolling.
  if (isMobile) {
    return (
      <Box
        sx={{
          p: 2,
          borderRadius: 1.5,
          border: (theme) => `solid 1px ${theme.palette.divider}`,
        }}
      >
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
          <Link
            component={RouterLink}
            href={productHref}
            color="inherit"
            underline="none"
            sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}
          >
            <Avatar variant="rounded" alt={name} src={coverUrl} sx={{ width: 56, height: 56, mr: 1.5, flexShrink: 0 }} />

            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
              <Typography noWrap variant="subtitle2">
                {name}
              </Typography>

              <Stack
                direction="row"
                alignItems="center"
                sx={{ typography: 'body2', color: 'text.secondary' }}
              >
                size: <Label sx={{ ml: 0.5 }}> {size} </Label>
                <Divider orientation="vertical" sx={{ mx: 1, height: 16 }} />
                <ColorPreview colors={colors} />
              </Stack>
            </Stack>
          </Link>

          <IconButton onClick={onDelete} sx={{ flexShrink: 0, ml: 1 }}>
            <Iconify icon="solar:trash-bin-trash-bold" />
          </IconButton>
        </Stack>

        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1.5 }}>
          <Typography variant="subtitle1">{fCurrency(price)}</Typography>

          <Box sx={{ textAlign: 'right' }}>
            <IncrementerButton
              quantity={quantity}
              onDecrease={onDecrease}
              onIncrease={onIncrease}
              disabledDecrease={isOutOfStock || quantity <= 1}
              disabledIncrease={isOutOfStock || quantity >= maxAllowedQuantity}
            />

            {stockMessage && (
              <Typography variant="caption" component="div" sx={{ color: 'text.secondary', mt: 0.5 }}>
                {stockMessage}
              </Typography>
            )}
          </Box>
        </Stack>
      </Box>
    );
  }

  return (
    <TableRow>
      <TableCell sx={{ display: 'flex', alignItems: 'center' }}>
        <Link
          component={RouterLink}
          href={productHref}
          color="inherit"
          underline="none"
          sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}
        >
          <Avatar variant="rounded" alt={name} src={coverUrl} sx={{ width: 64, height: 64, mr: 2 }} />

          <Stack spacing={0.5}>
            <Typography noWrap variant="subtitle2" sx={{ maxWidth: 240 }}>
              {name}
            </Typography>

            <Stack
              direction="row"
              alignItems="center"
              sx={{ typography: 'body2', color: 'text.secondary' }}
            >
              size: <Label sx={{ ml: 0.5 }}> {size} </Label>
              <Divider orientation="vertical" sx={{ mx: 1, height: 16 }} />
              <ColorPreview colors={colors} />
            </Stack>
          </Stack>
        </Link>
      </TableCell>

      <TableCell>{fCurrency(price)}</TableCell>

      <TableCell>
        <Box sx={{ width: 88, textAlign: 'right' }}>
          <IncrementerButton
            quantity={quantity}
            onDecrease={onDecrease}
            onIncrease={onIncrease}
            disabledDecrease={isOutOfStock || quantity <= 1}
            disabledIncrease={isOutOfStock || quantity >= maxAllowedQuantity}
          />

          {stockMessage && (
            <Typography variant="caption" component="div" sx={{ color: 'text.secondary', mt: 1 }}>
              {stockMessage}
            </Typography>
          )}
        </Box>
      </TableCell>

      <TableCell align="right">{fCurrency(price * quantity)}</TableCell>

      <TableCell align="right" sx={{ px: 1 }}>
        <IconButton onClick={onDelete}>
          <Iconify icon="solar:trash-bin-trash-bold" />
        </IconButton>
      </TableCell>
    </TableRow>
  );
}

CheckoutCartProduct.propTypes = {
  row: PropTypes.object,
  onDelete: PropTypes.func,
  onDecrease: PropTypes.func,
  onIncrease: PropTypes.func,
  isMobile: PropTypes.bool,
};
