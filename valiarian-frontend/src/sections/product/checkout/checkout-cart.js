import { useEffect } from 'react';
import sum from 'lodash/sum';
import PropTypes from 'prop-types';
// @mui
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
// routes
import { paths } from 'src/routes/paths';
// auth
import { useAuthContext } from 'src/auth/hooks';
// api
import { prefetchAddresses } from 'src/api/addresses';
// components
import EmptyContent from 'src/components/empty-content';
import Iconify from 'src/components/iconify';
import { RouterLink } from 'src/routes/components';
//
import CheckoutCartProductList from './checkout-cart-product-list';
import CheckoutSummary from './checkout-summary';

// ----------------------------------------------------------------------

export default function CheckoutCart({
  checkout,
  onNextStep,
  onDeleteCart,
  onApplyDiscount,
  onIncreaseQuantity,
  onDecreaseQuantity,
}) {
  const { authenticated, user } = useAuthContext();
  const {
    cart,
    eligibleCart,
    unavailableCart,
    total,
    discount,
    subTotal,
    shipping,
    tax,
    actualSubTotal,
    productDiscount,
  } = checkout;

  const totalItems = sum((eligibleCart || []).map((item) => item.quantity));

  const empty = !cart.length;

  useEffect(() => {
    if (!authenticated || !user?.id || empty) {
      return;
    }

    prefetchAddresses(user.id).catch(() => {
      // Address step already handles its own error state.
    });
  }, [authenticated, empty, user?.id]);

  return (
    <Grid container spacing={3}>
      <Grid xs={12} md={8}>
        <Card sx={{ mb: 3 }}>
          <CardHeader
            title={
              <Typography variant="h6">
                Cart
                <Typography component="span" sx={{ color: 'text.secondary' }}>
                  &nbsp;({totalItems} item)
                </Typography>
              </Typography>
            }
            sx={{ mb: 3 }}
          />

          {!!unavailableCart?.length && (
            <Alert severity="warning" sx={{ mx: 3, mb: 3 }}>
              Out-of-stock items are kept in your cart, but they are excluded from checkout and total calculation.
            </Alert>
          )}

          {!empty ? (
            <CheckoutCartProductList
              products={cart}
              onDelete={onDeleteCart}
              onIncreaseQuantity={onIncreaseQuantity}
              onDecreaseQuantity={onDecreaseQuantity}
            />
          ) : (
            <EmptyContent
              title="Cart is Empty!"
              description="Look like you have no items in your shopping cart."
              imgUrl="/assets/icons/empty/ic_cart.svg"
              sx={{ pt: 5, pb: 10 }}
            />
          )}
        </Card>

        <Button
          component={RouterLink}
          href={paths.product.root}
          color="inherit"
          startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
        >
          Continue Shopping
        </Button>
      </Grid>

      <Grid xs={12} md={4}>
        <CheckoutSummary
          enableDiscount
          total={total}
          discount={discount}
          subTotal={subTotal}
          shipping={shipping}
          tax={tax}
          actual_price={actualSubTotal}
          sale_price={subTotal}
          product_discount={productDiscount}
          coupon_discount={discount}
          selling_price_incl_tax={subTotal}
          shipping_charge={shipping}
          gst_amount={tax}
          final_payable={total}
          onApplyDiscount={onApplyDiscount}
        />

        <Button
          fullWidth
          size="large"
          type="submit"
          variant="contained"
          disabled={!eligibleCart?.length}
          onClick={onNextStep}
        >
          Check Out
        </Button>
      </Grid>
    </Grid>
  );
}

CheckoutCart.propTypes = {
  checkout: PropTypes.object,
  onNextStep: PropTypes.func,
  onDeleteCart: PropTypes.func,
  onApplyDiscount: PropTypes.func,
  onDecreaseQuantity: PropTypes.func,
  onIncreaseQuantity: PropTypes.func,
};
