import PropTypes from 'prop-types';
// @mui
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
// utils
import { Link } from '@mui/material';
import { RouterLink } from 'src/routes/components';
import { paths } from 'src/routes/paths';
import { fCurrency } from 'src/utils/format-number';
// components

// ----------------------------------------------------------------------

export default function OrderDetailsItems({
  items,
  shipping,
  discount,
  taxes,
  subTotal,
  totalAmount,
}) {
  const actualPrice = items.reduce(
    (sum, item) => sum + Math.max(Number(item.originalPrice || item.price || 0), Number(item.price || 0)) * Number(item.quantity || 0),
    0
  );
  const salePrice = Number(subTotal || 0);
  const productDiscount = Math.max(actualPrice - salePrice, 0);

  const renderTotal = (
    <Stack
      spacing={2}
      alignItems="flex-end"
      sx={{ my: 3, textAlign: 'right', typography: 'body2' }}
    >
      <Stack direction="row">
        <Box sx={{ color: 'text.secondary' }}>Actual Price</Box>
        <Box sx={{ width: 140, typography: 'subtitle2' }}>
          {fCurrency(actualPrice || salePrice) || '-'}
        </Box>
      </Stack>

      <Stack direction="row">
        <Box sx={{ color: 'text.secondary' }}>Sale Price</Box>
        <Box sx={{ width: 140, typography: 'subtitle2' }}>{fCurrency(salePrice) || '-'}</Box>
      </Stack>

      <Stack direction="row">
        <Box sx={{ color: 'text.secondary' }}>Product Discount</Box>
        <Box
          sx={{
            width: 140,
            ...(productDiscount && { color: 'error.main' }),
          }}
        >
          {productDiscount ? `- ${fCurrency(productDiscount)}` : '-'}
        </Box>
      </Stack>

      <Stack direction="row">
        <Box sx={{ color: 'text.secondary' }}>Delivery Charge</Box>
        <Box sx={{ width: 140, textAlign: 'right' }}>
          {shipping ? `${fCurrency(shipping)} included` : 'Included'}
        </Box>
      </Stack>

      <Stack direction="row">
        <Box sx={{ color: 'text.secondary' }}>Coupon Discount</Box>
        <Box
          sx={{
            width: 140,
            ...(discount && { color: 'error.main' }),
          }}
        >
          {discount ? `- ${fCurrency(discount)}` : '-'}
        </Box>
      </Stack>

      <Stack direction="row">
        <Box sx={{ color: 'text.secondary' }}>Taxes</Box>
        <Box sx={{ width: 140 }}>{taxes ? `${fCurrency(taxes)}  included` : '-'}</Box>
      </Stack>

      <Stack direction="row" sx={{ typography: 'subtitle1' }}>
        <Box>Total</Box>
        <Box sx={{ width: 140 }}>{fCurrency(totalAmount) || '-'}</Box>
      </Stack>
    </Stack>
  );

  return (
    <Card>
      <CardHeader title="Details" />

      <Stack
        sx={{
          px: 3,
        }}
      >
        {items.map((item) => {
          const productHref = paths.product.details(item.slug || item.productId || item.id);
          return (
            <Stack
              key={item.id}
              display="flex"
              justifyContent="space-between"
              flexDirection="row"
              alignItems="center"
              sx={{
                py: 3,
                borderBottom: (theme) => `dashed 2px ${theme.palette.background.neutral}`,
              }}
            >

              <Box display="flex" justifyContent="center" alignItems="center">



                <Link
                  component={RouterLink}
                  href={productHref}
                  color="inherit"
                  underline="none"
                >
                  <Avatar
                    src={item.image || item.coverUrl || '/assets/placeholder.svg'}
                    variant="rounded"
                    sx={{ width: 48, height: 48, mr: 2 }}
                  />
                </Link>


                <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                  <ListItemText
                    primary={item.name}
                    secondary={item.sku}
                    primaryTypographyProps={{
                      typography: 'body2',
                    }}
                    secondaryTypographyProps={{
                      component: 'span',
                      color: 'text.disabled',
                      mt: 0.5,
                    }}
                  />

                  {(item.colorName || item.color || item.size) && (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {[item.colorName || item.color, item.size].filter(Boolean).join(' • ')}
                    </Typography>
                  )}
                </Box>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Box sx={{ typography: 'body2' }}>x{item.quantity}</Box>

                <Box sx={{ width: 110, textAlign: 'right', typography: 'subtitle2' }}>
                  {fCurrency(item.price)}
                </Box>
              </Box>
            </Stack>
          )
        })}


        {renderTotal}
      </Stack>
    </Card>
  );
}

OrderDetailsItems.propTypes = {
  discount: PropTypes.number,
  items: PropTypes.array,
  shipping: PropTypes.number,
  subTotal: PropTypes.number,
  taxes: PropTypes.number,
  totalAmount: PropTypes.number,
};
