import PropTypes from 'prop-types';
// @mui
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import InputAdornment from '@mui/material/InputAdornment';
// utils
import { fCurrency } from 'src/utils/format-number';
// components
import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------

export default function CheckoutSummary({
  total,
  onEdit,
  discount,
  subTotal,
  shipping,
  tax,
  actual_price,
  sale_price,
  product_discount,
  coupon_discount,
  base_price,
  shipping_charge,
  gst_rate,
  gst_amount,
  selling_price_incl_tax,
  final_payable,
  onApplyDiscount,
  enableEdit = false,
  enableDiscount = false,
}) {
  const actualPrice = Number(actual_price || 0);
  const salePrice = Number(sale_price ?? selling_price_incl_tax ?? subTotal ?? 0);
  const productDiscount = Number(product_discount || Math.max(actualPrice - salePrice, 0));
  const couponDiscount = Number(coupon_discount ?? discount ?? 0);
  const sellingPriceInclTax = Number(selling_price_incl_tax ?? subTotal ?? 0);
  const shippingCharge = Number(shipping_charge ?? shipping ?? 0);
  const basePrice = Number(base_price || 0);
  const gstRate = Number(gst_rate || 0);
  const derivedGstAmount =
    gstRate > 0 && basePrice > 0
      ? Math.max(sellingPriceInclTax - shippingCharge - basePrice, 0)
      : Number(tax ?? 0);
  const gstAmount = Number(gst_amount ?? derivedGstAmount);
  const payableAmount = Number(final_payable ?? total ?? 0);

  return (
    <Card sx={{ mb: 3 }}>
      <CardHeader
        title="Order Summary"
        action={
          enableEdit && (
            <Button variant='outlined' color='secondary' size="small" onClick={onEdit} startIcon={<Iconify icon="solar:pen-bold" />}>
              Edit
            </Button>
          )
        }
      />

      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Actual Price
            </Typography>
            <Typography variant="subtitle2">{fCurrency(actualPrice || salePrice)}</Typography>
          </Stack>

          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Sale Price (incl. shipping & tax)
            </Typography>
            <Typography variant="subtitle2">{fCurrency(salePrice || sellingPriceInclTax)}</Typography>
          </Stack>

          {!!productDiscount && (
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Product Discount
              </Typography>
              <Typography variant="subtitle2">{fCurrency(-productDiscount)}</Typography>
            </Stack>
          )}

          {!!couponDiscount && (
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Coupon Discount
              </Typography>
              <Typography variant="subtitle2">{fCurrency(-couponDiscount)}</Typography>
            </Stack>
          )}

          <Stack spacing={0.5}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Included Shipping
              </Typography>
              <Typography variant="subtitle2">{fCurrency(shippingCharge)}</Typography>
            </Stack>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              Already included in price
            </Typography>
          </Stack>

          <Stack spacing={0.5}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Included GST
              </Typography>
              <Typography variant="subtitle2">{fCurrency(gstAmount)}</Typography>
            </Stack>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              Already included in price
            </Typography>
          </Stack>

          <Divider sx={{ borderStyle: 'dashed' }} />

          <Stack direction="row" justifyContent="space-between">
            <Typography variant="subtitle1">Payable</Typography>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="subtitle1" sx={{ color: 'error.main' }}>
                {fCurrency(payableAmount)}
              </Typography>
            </Box>
          </Stack>

          {enableDiscount && onApplyDiscount && (
            <TextField
              fullWidth
              placeholder="Discount codes / Gifts"
              value="DISCOUNT5"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Button color="primary" onClick={() => onApplyDiscount(5)} sx={{ mr: -0.5 }}>
                      Apply
                    </Button>
                  </InputAdornment>
                ),
              }}
            />
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

CheckoutSummary.propTypes = {
  base_price: PropTypes.number,
  actual_price: PropTypes.number,
  coupon_discount: PropTypes.number,
  discount: PropTypes.number,
  enableDiscount: PropTypes.bool,
  enableEdit: PropTypes.bool,
  final_payable: PropTypes.number,
  gst_amount: PropTypes.number,
  gst_rate: PropTypes.number,
  onApplyDiscount: PropTypes.func,
  onEdit: PropTypes.func,
  product_discount: PropTypes.number,
  sale_price: PropTypes.number,
  selling_price_incl_tax: PropTypes.number,
  shipping: PropTypes.number,
  shipping_charge: PropTypes.number,
  subTotal: PropTypes.number,
  tax: PropTypes.number,
  total: PropTypes.number,
};
