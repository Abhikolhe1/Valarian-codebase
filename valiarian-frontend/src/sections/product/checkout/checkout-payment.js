import { yupResolver } from '@hookform/resolvers/yup';
import PropTypes from 'prop-types';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
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
import Grid from '@mui/material/Unstable_Grid2';
// api
import { clearUserCart } from 'src/api/cart';
// auth
import { useAuthContext } from 'src/auth/hooks';
// routes
import { paths } from 'src/routes/paths';
// redux
import { resetCart } from 'src/redux/slices/checkout';
import { useDispatch } from 'src/redux/store';
// utils
import axios from 'src/utils/axios';
import { getCartItemProductId } from 'src/utils/cart-utils';
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
];

const PAYMENT_OPTIONS = [
  {
    value: 'razorpay',
    label: 'Razorpay (UPI, Cards, Wallets)',
    description: 'Pay securely using UPI, Credit/Debit Cards, or Wallets via Razorpay.',
  },
  {
    value: 'cod',
    label: 'Cash on Delivery',
    description: 'Pay with cash when your order is delivered.',
  },
];

const RAZORPAY_KEY_ID = process.env.REACT_APP_RAZORPAY_KEY_ID;

const getErrorMessage = (error, fallbackMessage) =>
  error?.response?.data?.message ||
  error?.data?.message ||
  error?.message ||
  fallbackMessage;

const buildOrderError = (error, stage = 'generic') => {
  const message = getErrorMessage(error, 'Something went wrong. Please try again.');
  const normalizedMessage = String(message).toLowerCase();

  if (normalizedMessage.includes('stock') || normalizedMessage.includes('available')) {
    return {
      type: 'stock',
      title: 'Cart Needs Attention',
      message,
      action: 'update_cart',
    };
  }

  if (stage === 'payment' || error?.code === 'PAYMENT_FAILED' || error?.code === 'PAYMENT_CANCELLED') {
    return {
      type: 'payment',
      title: error?.code === 'PAYMENT_CANCELLED' ? 'Payment Cancelled' : 'Payment Failed',
      message,
      action: 'retry_payment',
    };
  }

  if (stage === 'finalize_order') {
    return {
      type: 'generic',
      title: 'Order Confirmation Failed',
      message,
      action: 'retry_order',
    };
  }

  if (stage === 'prepare_payment') {
    return {
      type: 'generic',
      title: 'Payment Initialization Failed',
      message,
      action: 'retry_payment',
    };
  }

  return {
    type: 'generic',
    title: 'Order Creation Failed',
    message,
    action: 'retry',
  };
};

const getRetryStage = (attemptType) => {
  if (attemptType === 'payment') {
    return 'payment';
  }

  if (attemptType === 'finalize_order') {
    return 'finalize_order';
  }

  return 'generic';
};

const getRetryActionLabel = (action) => {
  if (action === 'retry_payment') {
    return 'Retry Payment';
  }

  if (action === 'retry_order') {
    return 'Retry Order Confirmation';
  }

  return 'Retry';
};

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
  const navigate = useNavigate();

  const [orderError, setOrderError] = useState(null);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [lastAttempt, setLastAttempt] = useState(null);

  const PaymentSchema = Yup.object().shape({
    payment: Yup.string().required('Payment method is required!'),
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

  const clearCheckoutCart = async () => {
    if (user?.id) {
      try {
        await clearUserCart(user.id);
      } catch (error) {
        console.error('Failed to clear backend cart after order creation:', error);
      }
    }

    dispatch(resetCart());
  };

  const handleOrderSuccess = async (order) => {
    await clearCheckoutCart();
    navigate(paths.order.confirmation(order.id), { replace: true });
  };

  const createBillingPayload = () => {
    const fullName = billing?.fullName || billing?.name || user?.fullName || '';
    const phone = billing?.phone || billing?.phoneNumber || user?.phone || '';
    const email = billing?.email || user?.email || '';
    const address = billing?.address || '';
    const city = billing?.city || '';
    const state = billing?.state || '';
    const zipCode = billing?.zipCode || billing?.zip || '';
    const country = billing?.country || 'India';

    if (!fullName || !phone || !address || !city || !state || !zipCode) {
      throw new Error('Please complete your billing address before placing the order');
    }

    return {
      fullName,
      phone,
      email,
      address,
      city,
      state,
      zipCode,
      country,
    };
  };

  const createOrderPayload = (paymentMethod) => {
    if (!user?.id) {
      throw new Error('Please sign in to continue');
    }

    if (!cart || cart.length === 0) {
      throw new Error('Your cart is empty');
    }

    const billingAddress = createBillingPayload();

    return {
      cartItems: cart.map((item) => ({
        productId: getCartItemProductId(item),
        variantId: item.variantId || undefined,
        quantity: item.quantity,
        price: item.price,
      })),
      billingAddress,
      shippingAddress: billingAddress,
      paymentMethod,
      discount: Number(discount || 0),
      shipping: Number(shipping || 0),
      tax: 0,
    };
  };

  const handleCloseErrorDialog = () => {
    setErrorDialogOpen(false);
    setOrderError(null);
  };

  const finalizePaidOrder = async (orderData, orderNumber, paymentDetails) => {
    setLastAttempt({
      type: 'finalize_order',
      orderData,
      orderNumber,
      paymentDetails,
    });

    const response = await axios.post('/api/orders/create', {
      ...orderData,
      orderNumber,
      paymentDetails,
    });

    setLastAttempt(null);
    await handleOrderSuccess(response.data.order);

    return response.data.order;
  };

  const openRazorpayCheckout = async (orderData) => {
    if (!RAZORPAY_KEY_ID) {
      throw new Error('Razorpay is not configured');
    }

    if (!window?.Razorpay) {
      throw new Error('Razorpay checkout is unavailable right now');
    }

    setLastAttempt({ type: 'payment', orderData });

    let prepareResponse;

    try {
      prepareResponse = await axios.post('/api/orders/prepare-payment', orderData);
    } catch (error) {
      error.stage = 'prepare_payment';
      throw error;
    }

    const { orderNumber, razorpayOrderId, amount, currency } = prepareResponse.data;

    return new Promise((resolve, reject) => {
      const razorpay = new window.Razorpay({
        key: RAZORPAY_KEY_ID,
        amount,
        currency: currency || 'INR',
        name: 'Valiarian',
        description: `Order #${orderNumber}`,
        order_id: razorpayOrderId,
        handler: async (response) => {
          try {
            const order = await finalizePaidOrder(orderData, orderNumber, {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            resolve(order);
          } catch (error) {
            error.stage = 'finalize_order';
            reject(error);
          }
        },
        prefill: {
          name: billing?.fullName || billing?.name || user?.fullName || '',
          email: billing?.email || user?.email || '',
          contact: billing?.phone || billing?.phoneNumber || user?.phone || '',
        },
        theme: {
          color: '#111827',
        },
        modal: {
          ondismiss: () => {
            const cancellationError = new Error('Payment was cancelled before completion');
            cancellationError.code = 'PAYMENT_CANCELLED';
            cancellationError.stage = 'payment';
            reject(cancellationError);
          },
        },
      });

      razorpay.on('payment.failed', (response) => {
        const paymentError = new Error(
          response?.error?.description || 'Payment failed. Please try again.'
        );
        paymentError.code = 'PAYMENT_FAILED';
        paymentError.stage = 'payment';
        reject(paymentError);
      });

      razorpay.open();
    });
  };

  const submitCodOrder = async (orderData) => {
    setLastAttempt({ type: 'cod', orderData });

    const response = await axios.post('/api/orders/create', orderData);
    setLastAttempt(null);

    await handleOrderSuccess(response.data.order);

    return response.data.order;
  };

  const handleRetry = async () => {
    const retryAttempt = lastAttempt;

    handleCloseErrorDialog();

    if (!retryAttempt) {
      return;
    }

    try {
      if (retryAttempt.type === 'payment') {
        await openRazorpayCheckout(retryAttempt.orderData);
        return;
      }

      if (retryAttempt.type === 'finalize_order') {
        await finalizePaidOrder(
          retryAttempt.orderData,
          retryAttempt.orderNumber,
          retryAttempt.paymentDetails
        );
        return;
      }

      if (retryAttempt.type === 'cod') {
        await submitCodOrder(retryAttempt.orderData);
      }
    } catch (error) {
      setOrderError(buildOrderError(error, getRetryStage(retryAttempt.type)));
      setErrorDialogOpen(true);
    }
  };

  const handleUpdateCart = () => {
    handleCloseErrorDialog();
    onGotoStep(0);
  };

  const handleCheckHistory = () => {
    handleCloseErrorDialog();
    navigate(paths.order.history);
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      setOrderError(null);

      const orderData = createOrderPayload(data.payment);

      if (data.payment === 'razorpay') {
        await openRazorpayCheckout(orderData);
        return;
      }

      if (data.payment === 'cod') {
        await submitCodOrder(orderData);
        return;
      }

      throw new Error('Invalid payment method selected');
    } catch (error) {
      let stage = error?.stage;
      
      if (!stage) {
        stage = data?.payment === 'razorpay' ? 'payment' : 'generic';
      }

      setOrderError(buildOrderError(error, stage));
      setErrorDialogOpen(true);
    }
  });

  const retryActionLabel = getRetryActionLabel(orderError?.action);

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

            <CheckoutPaymentMethods options={PAYMENT_OPTIONS} sx={{ my: 3 }} />

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

      <Dialog open={errorDialogOpen} onClose={handleCloseErrorDialog}>
        <DialogTitle>{orderError?.title || 'Error'}</DialogTitle>
        <DialogContent>
          <DialogContentText>{orderError?.message}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseErrorDialog}>Close</Button>
          {(orderError?.action === 'retry' ||
            orderError?.action === 'retry_payment' ||
            orderError?.action === 'retry_order') && (
            <Button onClick={handleRetry} variant="contained">
              {retryActionLabel}
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
