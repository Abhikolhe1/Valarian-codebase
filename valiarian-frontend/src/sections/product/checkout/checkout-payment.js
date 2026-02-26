import { yupResolver } from '@hookform/resolvers/yup';
import PropTypes from 'prop-types';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';
// @mui
import LoadingButton from '@mui/lab/LoadingButton';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Grid from '@mui/material/Unstable_Grid2';
// auth
import { useAuthContext } from 'src/auth/hooks';
// redux
import { resetCart } from 'src/redux/slices/checkout';
import { useDispatch } from 'src/redux/store';
// utils
import { createOrder, handleOrderError } from 'src/utils/order-creation';
// components
import FormProvider from 'src/components/hook-form';
import Iconify from 'src/components/iconify';
//
import CheckoutBillingInfo from './checkout-billing-info';
import CheckoutDelivery from './checkout-delivery';
import CheckoutPaymentMethods from './checkout-payment-methods';
import CheckoutSummary from './checkout-summary';

// ----------------------------------------------------------------------

const DELIVERY_OPTIONS = [
  {
    value: 0,
    label: 'Free',
    description: '5-7 Days delivery',
  },
  {
    value: 10,
    label: 'Standard',
    description: '3-5 Days delivery',
  },
  {
    value: 20,
    label: 'Express',
    description: '2-3 Days delivery',
  },
];

const PAYMENT_OPTIONS = [
  {
    value: 'paypal',
    label: 'Pay with Paypal',
    description: 'You will be redirected to PayPal website to complete your purchase securely.',
  },
  {
    value: 'credit',
    label: 'Credit / Debit Card',
    description: 'We support Mastercard, Visa, Discover and Stripe.',
  },
  {
    value: 'cash',
    label: 'Cash',
    description: 'Pay with cash when your order is delivered.',
  },
];

const CARDS_OPTIONS = [
  { value: 'ViSa1', label: '**** **** **** 1212 - Jimmy Holland' },
  { value: 'ViSa2', label: '**** **** **** 2424 - Shawn Stokes' },
  { value: 'MasterCard', label: '**** **** **** 4545 - Cole Armstrong' },
];

export default function CheckoutPayment({
  checkout,
  onReset,
  onNextStep,
  onBackStep,
  onGotoStep,
  onApplyShipping,
}) {
  const { total, discount, subTotal, shipping, billing, cart } = checkout;
  const { user } = useAuthContext();
  const dispatch = useDispatch();

  const [orderError, setOrderError] = useState(null);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);

  const PaymentSchema = Yup.object().shape({
    payment: Yup.string().required('Payment is required!'),
  });

  const defaultValues = {
    delivery: shipping,
    payment: '',
  };

  const methods = useForm({
    resolver: yupResolver(PaymentSchema),
    defaultValues,
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const handleCloseErrorDialog = () => {
    setErrorDialogOpen(false);
    setOrderError(null);
  };

  const handleRetry = () => {
    handleCloseErrorDialog();
    // User can retry by submitting the form again
  };

  const handleUpdateCart = () => {
    handleCloseErrorDialog();
    onGotoStep(0); // Go back to cart
  };

  const handleCheckHistory = () => {
    handleCloseErrorDialog();
    // Navigate to order history
    window.location.href = '/orders/history';
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      setOrderError(null);

      // Validate user is authenticated
      if (!user || !user.id) {
        throw new Error('User not authenticated');
      }

      // Create order
      const order = await createOrder({
        userId: user.id,
        cartItems: cart,
        billingAddress: billing,
        paymentMethod: data.payment,
        paymentDetails: {
          // Add payment details based on payment method
          cardNumber: data.cardNumber || null,
          cardHolder: data.cardHolder || null,
        },
        discount,
        shipping,
      });

      console.log('Order created successfully:', order);

      // Clear cart from Redux
      dispatch(resetCart());

      // Move to confirmation step
      onNextStep();
      onReset();
    } catch (error) {
      console.error('Order creation error:', error);

      // Handle error and show appropriate message
      const errorDetails = handleOrderError(error);
      setOrderError(errorDetails);
      setErrorDialogOpen(true);
    }
  });

  return (
    <>
      <FormProvider methods={methods} onSubmit={onSubmit}>
        <Grid container spacing={3}>
          <Grid xs={12} md={8}>
            {orderError && orderError.type === 'payment' && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {orderError.message}
              </Alert>
            )}

            <CheckoutDelivery onApplyShipping={onApplyShipping} options={DELIVERY_OPTIONS} />

            <CheckoutPaymentMethods
              cardOptions={CARDS_OPTIONS}
              options={PAYMENT_OPTIONS}
              sx={{ my: 3 }}
            />

            <Button
              size="small"
              color="inherit"
              onClick={onBackStep}
              startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
            >
              Back
            </Button>
          </Grid>

          <Grid xs={12} md={4}>
            <CheckoutBillingInfo onBackStep={onBackStep} billing={billing} />

            <CheckoutSummary
              enableEdit
              total={total}
              subTotal={subTotal}
              discount={discount}
              shipping={shipping}
              onEdit={() => onGotoStep(0)}
            />

            <LoadingButton
              fullWidth
              size="large"
              type="submit"
              variant="contained"
              loading={isSubmitting}
            >
              Complete Order
            </LoadingButton>
          </Grid>
        </Grid>
      </FormProvider>

      {/* Error Dialog */}
      <Dialog open={errorDialogOpen} onClose={handleCloseErrorDialog}>
        <DialogTitle>{orderError?.title || 'Error'}</DialogTitle>
        <DialogContent>
          <DialogContentText>{orderError?.message}</DialogContentText>

          {/* Show out of stock items */}
          {orderError?.type === 'stock' && orderError.outOfStockItems?.length > 0 && (
            <List sx={{ mt: 2 }}>
              {orderError.outOfStockItems.map((item) => (
                <ListItem key={item.id}>
                  <ListItemText
                    primary={item.name}
                    secondary={`Requested: ${item.requested}, Available: ${item.available}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseErrorDialog}>Close</Button>
          {orderError?.action === 'retry_payment' && (
            <Button onClick={handleRetry} variant="contained">
              Retry Payment
            </Button>
          )}
          {orderError?.action === 'update_cart' && (
            <Button onClick={handleUpdateCart} variant="contained">
              Update Cart
            </Button>
          )}
          {orderError?.action === 'check_history' && (
            <Button onClick={handleCheckHistory} variant="contained">
              Check Order History
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}

CheckoutPayment.propTypes = {
  onReset: PropTypes.func,
  checkout: PropTypes.object,
  onBackStep: PropTypes.func,
  onGotoStep: PropTypes.func,
  onNextStep: PropTypes.func,
  onApplyShipping: PropTypes.func,
};
