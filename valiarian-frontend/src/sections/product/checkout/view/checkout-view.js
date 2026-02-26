import { useCallback, useEffect } from 'react';
// @mui
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
// redux
import { getCart } from 'src/redux/slices/checkout';
import { useDispatch } from 'src/redux/store';
// _mock
import { PRODUCT_CHECKOUT_STEPS } from 'src/_mock/_product';
// components
import { useSettingsContext } from 'src/components/settings';
//
import { useCheckout } from '../../hooks';
import CheckoutAuthGate from '../checkout-auth-gate';
import CheckoutBillingAddress from '../checkout-billing-address';
import CheckoutCart from '../checkout-cart';
import CheckoutOrderComplete from '../checkout-order-complete';
import CheckoutPayment from '../checkout-payment';
import CheckoutSteps from '../checkout-steps';

// ----------------------------------------------------------------------

function useInitial(cart) {
  const dispatch = useDispatch();

  const getCartCallback = useCallback(() => {
    if (cart.length) {
      dispatch(getCart(cart));
    }
  }, [cart, dispatch]);

  useEffect(() => {
    getCartCallback();
  }, [getCartCallback]);

  return null;
}

export default function CheckoutView() {
  const settings = useSettingsContext();

  const {
    checkout,
    completed,
    onResetAll,
    onGotoStep,
    onNextStep,
    onBackStep,
    onDeleteCart,
    onResetBilling,
    onCreateBilling,
    onApplyDiscount,
    onApplyShipping,
    onIncreaseQuantity,
    onDecreaseQuantity,
  } = useCheckout();

  const { cart, billing, activeStep } = checkout;

  useInitial(cart);

  useEffect(() => {
    if (activeStep === 1) {
      onResetBilling();
    }
  }, [activeStep, onResetBilling]);

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'} sx={{ mb: 10 }}>
      <Typography variant="h4" sx={{ my: { xs: 3, md: 5 } }}>
        Checkout
      </Typography>

      <Grid container justifyContent={completed ? 'center' : 'flex-start'}>
        <Grid xs={12} md={8}>
          <CheckoutSteps activeStep={activeStep} steps={PRODUCT_CHECKOUT_STEPS} />
        </Grid>
      </Grid>

      {completed ? (
        <CheckoutOrderComplete open={completed} onReset={onResetAll} onDownloadPDF={() => { }} />
      ) : (
        <>
          {activeStep === 0 && (
            <CheckoutCart
              checkout={checkout}
              onNextStep={onNextStep}
              onDeleteCart={onDeleteCart}
              onApplyDiscount={onApplyDiscount}
              onIncreaseQuantity={onIncreaseQuantity}
              onDecreaseQuantity={onDecreaseQuantity}
            />
          )}

          {activeStep === 1 && (
            <CheckoutBillingAddress
              checkout={checkout}
              onBackStep={onBackStep}
              onCreateBilling={onCreateBilling}
            />
          )}

          {activeStep === 2 && (
            <CheckoutAuthGate
              onNextStep={onNextStep}
              onBackStep={onBackStep}
            />
          )}

          {activeStep === 3 && billing && (
            <CheckoutPayment
              checkout={checkout}
              onNextStep={onNextStep}
              onBackStep={onBackStep}
              onGotoStep={onGotoStep}
              onApplyShipping={onApplyShipping}
              onReset={onResetAll}
            />
          )}
        </>
      )}
    </Container>
  );
}
