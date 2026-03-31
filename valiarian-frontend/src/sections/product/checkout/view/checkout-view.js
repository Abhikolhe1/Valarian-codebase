import { useEffect } from 'react';
// @mui
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
// api
import { prefetchAddresses } from 'src/api/addresses';
// routes
import { RouterLink } from 'src/routes/components';
import { paths } from 'src/routes/paths';
// auth
import { useAuthContext } from 'src/auth/hooks';
// _mock
import { PRODUCT_CHECKOUT_STEPS } from 'src/_mock/_product';
// components
import EmptyContent from 'src/components/empty-content';
import Iconify from 'src/components/iconify';
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

export default function CheckoutView() {
  const settings = useSettingsContext();
  const { authenticated, user } = useAuthContext();
  const {
    checkoutSession,
    completed,
    onResetAll,
    onGotoStep,
    onNextStep,
    onBackStep,
    onDeleteCart,
    onCreateBilling,
    onApplyDiscount,
    onApplyShipping,
    onIncreaseQuantity,
    onDecreaseQuantity,
  } = useCheckout();

  const { cart, billing, activeStep } = checkoutSession;

  useEffect(() => {
    if (authenticated && user?.id && cart.length) {
      prefetchAddresses(user.id).catch(() => {
        // Step-level UI handles address errors and fallbacks.
      });
    }
  }, [authenticated, cart.length, user?.id]);

  useEffect(() => {
    if (!cart.length && activeStep !== 0) {
      onGotoStep(0);
      return;
    }

    if (!authenticated && activeStep > 1) {
      onGotoStep(1);
      return;
    }

    if (authenticated && activeStep > 1 && !billing) {
      onGotoStep(1);
      return;
    }

    if (authenticated && activeStep === 2) {
      onGotoStep(3);
    }
  }, [activeStep, authenticated, billing, cart.length, onGotoStep]);

  const isEmpty = !cart.length && !completed;
  const checkoutSteps = authenticated
    ? PRODUCT_CHECKOUT_STEPS.filter((step) => step !== 'Authentication')
    : ['Cart', 'Authentication', 'Billing & address', 'Payment'];
  const displayActiveStep = authenticated && activeStep > 1 ? activeStep - 1 : activeStep;

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'} sx={{ mb: 10 }}>
      <Typography variant="h4" sx={{ my: { xs: 3, md: 5 } }}>
        Checkout
      </Typography>

      {isEmpty ? (
        <EmptyContent
          title="Cart is Empty!"
          description="Look like you have no items in your shopping cart."
          imgUrl="/assets/icons/empty/ic_cart.svg"
          action={
            <Button
              component={RouterLink}
              href={paths.product.root}
              color='secondary'
              variant="contained"
              startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
              sx={{ mt: 3 }}
            >
              Go to Products
            </Button>
          }
          sx={{ py: 10 }}
        />
      ) : (
        <>
          <Grid container justifyContent={completed ? 'center' : 'flex-start'}>
            <Grid xs={12} md={8}>
              <CheckoutSteps activeStep={displayActiveStep} steps={checkoutSteps} />
            </Grid>
          </Grid>

          {!completed && activeStep > 0 && (
            <Button
              size="small"
              color="inherit"
              onClick={onBackStep}
              startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
              sx={{ display: { xs: 'inline-flex', md: 'none' }, mt: 2, mb: 3 }}
            >
              Back
            </Button>
          )}

          {completed ? (
            <CheckoutOrderComplete open={completed} onReset={onResetAll} onDownloadPDF={() => { }} />
          ) : (
            <>
              {activeStep === 0 && (
                <CheckoutCart
                  checkout={checkoutSession}
                  onNextStep={onNextStep}
                  onDeleteCart={onDeleteCart}
                  onApplyDiscount={onApplyDiscount}
                  onIncreaseQuantity={onIncreaseQuantity}
                  onDecreaseQuantity={onDecreaseQuantity}
                />
              )}

              {activeStep === 1 && !authenticated && (
                <CheckoutAuthGate
                  onNextStep={onNextStep}
                  onBackStep={onBackStep}
                />
              )}

              {activeStep === 1 && authenticated && (
                <CheckoutBillingAddress
                  checkout={checkoutSession}
                  onBackStep={onBackStep}
                  onCreateBilling={onCreateBilling}
                />
              )}

              {activeStep === 3 && billing && authenticated && (
                <CheckoutPayment
                  checkout={checkoutSession}
                  onNextStep={onNextStep}
                  onBackStep={onBackStep}
                  onGotoStep={onGotoStep}
                  onApplyShipping={onApplyShipping}
                  onReset={onResetAll}
                />
              )}
            </>
          )}
        </>
      )}
    </Container>
  );
}
