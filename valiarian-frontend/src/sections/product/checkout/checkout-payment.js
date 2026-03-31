import { yupResolver } from '@hookform/resolvers/yup';
import LoadingButton from '@mui/lab/LoadingButton';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Unstable_Grid2';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { clearUserCart } from 'src/api/cart';
import { useAuthContext } from 'src/auth/hooks';
import FormProvider from 'src/components/hook-form';
import Iconify from 'src/components/iconify';
import { useSnackbar } from 'src/components/snackbar';
import useRazorpay from 'src/hooks/use-razorpay';
import {
  clearPaymentSession,
  resetCart,
  resetCheckoutFlow,
  setPaymentSession,
} from 'src/redux/slices/checkout';
import { useDispatch } from 'src/redux/store';
import { paths } from 'src/routes/paths';
import axios, { endpoints } from 'src/utils/axios';
import { getCartItemProductId } from 'src/utils/cart-utils';
import {
  buildPaymentQuery,
  clearPaymentSessionStorage,
  savePaymentSession,
} from 'src/utils/payment-session';
import * as Yup from 'yup';
import CheckoutBillingInfo from './checkout-billing-info';
import CheckoutDelivery from './checkout-delivery';
import CheckoutEmailVerificationDialog from './checkout-email-verification-dialog';
import CheckoutPaymentMethods from './checkout-payment-methods';
import CheckoutSummary from './checkout-summary';

const DELIVERY_OPTIONS = [
  {
    value: 199,
    label: 'Standard',
    description: 'Delivery charge included in the selling price',
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

const getErrorMessage = (error, fallbackMessage) =>
  error?.response?.data?.message || error?.data?.message || error?.message || fallbackMessage;

const isStockError = (message = '') => {
  const normalized = String(message).toLowerCase();
  return normalized.includes('stock') || normalized.includes('available');
};

const normalizeAmount = (amount) => {
  const numericAmount = Number(amount);
  return Number.isFinite(numericAmount) ? numericAmount : 0;
};

const EmailPromptAction = ({ onClick }) => (
  <Button
    color="inherit"
    size="small"
    variant="outlined"
    onClick={onClick}
    sx={{ width: { xs: '100%', sm: 'auto' } }}
  >
    Add Email
  </Button>
);

EmailPromptAction.propTypes = {
  onClick: PropTypes.func,
};

export default function CheckoutPayment({ checkout, onBackStep, onGotoStep, onApplyShipping }) {
  const {
    total,
    discount,
    subTotal,
    shipping,
    tax,
    billing,
    eligibleCart,
    unavailableCart,
    actualSubTotal,
    productDiscount,
  } = checkout;
  const { user } = useAuthContext();
  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLoadingScript, loadScript, openCheckout } = useRazorpay();

  const [checkoutError, setCheckoutError] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [emailPromptDismissed, setEmailPromptDismissed] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  const PaymentSchema = Yup.object().shape({
    payment: Yup.string().required('Payment method is required!'),
  });

  const methods = useForm({
    resolver: yupResolver(PaymentSchema),
    defaultValues: {
      delivery: shipping,
      payment: 'razorpay',
    },
  });

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
  } = methods;

  const selectedPayment = watch('payment');

  useEffect(() => {
    if (selectedPayment === 'razorpay') {
      loadScript().catch(() => undefined);
    }
  }, [loadScript, selectedPayment]);

  useEffect(() => {
    const defaultShipping = DELIVERY_OPTIONS[0]?.value || 0;

    if (Number(shipping || 0) !== defaultShipping) {
      onApplyShipping(defaultShipping);
      setValue('delivery', defaultShipping);
    }
  }, [onApplyShipping, setValue, shipping]);

  useEffect(() => {
    const hasProfileEmail = Boolean((user?.email || '').trim());

    if (!hasProfileEmail && !emailPromptDismissed) {
      setEmailDialogOpen(true);
    } else {
      setEmailDialogOpen(false);
    }
  }, [emailPromptDismissed, user?.email]);

  const clearCheckoutCart = async () => {
    if (!checkout.isBuyNow && user?.id) {
      try {
        await clearUserCart(user.id);
      } catch (error) {
        console.error('Failed to clear backend cart after order creation:', error);
      }
    }

    if (checkout.isBuyNow) {
      dispatch(resetCheckoutFlow());
      return;
    }

    dispatch(resetCart());
  };

  const persistPaymentState = (paymentState) => {
    dispatch(setPaymentSession(paymentState));
    savePaymentSession(paymentState);
  };

  const clearPersistedPaymentState = () => {
    dispatch(clearPaymentSession());
    clearPaymentSessionStorage();
  };

  const buildPaymentRoute = (pathname, paymentState) => {
    const query = buildPaymentQuery(paymentState);
    return query ? `${pathname}?${query}` : pathname;
  };

  const resolvePaymentStatusRoute = (paymentState) => {
    const normalizedStatus = String(paymentState?.status || '').toLowerCase();
    const normalizedPaymentStatus = String(paymentState?.paymentStatus || '').toLowerCase();
    const normalizedOrderStatus = String(paymentState?.orderStatus || '').toLowerCase();

    if (
      paymentState?.pendingReason === 'stock_unavailable_after_payment' ||
      (normalizedOrderStatus === 'pending' && ['paid', 'success'].includes(normalizedPaymentStatus))
    ) {
      return paths.payment.pending;
    }

    if (normalizedStatus === 'success' || normalizedStatus === 'paid') {
      return paths.payment.success;
    }

    if (normalizedStatus === 'pending' || normalizedStatus === 'created') {
      return paths.payment.pending;
    }

    if (normalizedStatus === 'cancelled') {
      return paths.payment.cancelled;
    }

    return paths.payment.failed;
  };

  const syncStatusFromBackend = async (paymentState) => {
    if (!paymentState?.orderId) {
      return false;
    }

    try {
      const response = await axios.get(`/api/orders/${paymentState.orderId}/status`);
      const backendOrderStatus = response.data?.orderStatus || response.data?.status || '';
      const backendPaymentStatus = response.data?.paymentStatus || '';
      const normalizedOrderStatus = String(backendOrderStatus).toLowerCase();
      const normalizedPaymentStatus = String(backendPaymentStatus).toLowerCase();

      const nextState = {
        ...paymentState,
        status:
          normalizedOrderStatus === 'pending'
            ? 'pending'
            : backendPaymentStatus || backendOrderStatus || paymentState.status,
        paymentStatus: backendPaymentStatus || paymentState.paymentStatus || '',
        orderStatus: backendOrderStatus || paymentState.orderStatus || '',
        pendingReason:
          normalizedOrderStatus === 'pending' &&
          ['paid', 'success'].includes(normalizedPaymentStatus)
            ? 'stock_unavailable_after_payment'
            : paymentState.pendingReason,
      };

      persistPaymentState(nextState);
      navigate(buildPaymentRoute(resolvePaymentStatusRoute(nextState), nextState), {
        replace: true,
      });

      return true;
    } catch (statusError) {
      console.error('Failed to sync payment status after verify error:', statusError);
      return false;
    }
  };

  const handleInlineError = (error, fallbackMessage) => {
    const message = getErrorMessage(error, fallbackMessage);
    setCheckoutError(message);
    enqueueSnackbar(message, { variant: 'error' });

    if (isStockError(message)) {
      onGotoStep(0);
    }
  };

  const handleOrderSuccess = async (order, successMessage = 'Order placed successfully') => {
    await clearCheckoutCart();
    clearPersistedPaymentState();
    enqueueSnackbar(successMessage, { variant: 'success' });
    navigate(paths.order.history, { replace: true });
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

    // if (!fullName || !phone || !address || !city || !state || !zipCode) {
    //   throw new Error('Please complete your billing address before placing the order');
    // }

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

    if (!eligibleCart || eligibleCart.length === 0) {
      throw new Error('Your cart is empty');
    }

    const billingAddress = createBillingPayload();

    return {
      cartItems: eligibleCart.map((item) => ({
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
    };
  };

  const buildPaymentStateFromOrder = (responseData, statusOverride) => {
    if (!responseData) {
      return {
        status: 'failed',
        orderId: responseData?.orderId || order?.id || '',
        orderNumber: order?.orderNumber || '',
        createdAt: order?.createdAt || new Date().toISOString(),
      };
    }
    const order = responseData?.order;

    return {
      status: statusOverride || responseData?.status || order?.paymentStatus || 'pending',
      paymentStatus: responseData?.paymentStatus || order?.paymentStatus || '',
      orderStatus: responseData?.orderStatus || order?.status || '',
      orderId: responseData?.orderId || order?.id || '',
      orderNumber: order?.orderNumber || '',
      amount: normalizeAmount(order?.total ?? responseData?.amount),
      createdAt: order?.createdAt || new Date().toISOString(),
    };
  };

  const handleCodOrder = async (orderData) => {
    const response = await axios.post(endpoints.orders.create, orderData);
    await handleOrderSuccess(response.data.order);
  };

  const handleRazorpayOrder = async (orderData) => {
    setIsProcessingPayment(true);
    let createdPaymentState = null;

    try {
      const createResponse = await axios.post(endpoints.orders.create, orderData);
      const paymentState = buildPaymentStateFromOrder(createResponse.data, 'pending');
      createdPaymentState = paymentState;

      persistPaymentState(paymentState);

      const checkoutResult = await openCheckout({
        key: createResponse.data.keyId,
        amount: createResponse.data.amount,
        currency: createResponse.data.currency || 'INR',
        order_id: createResponse.data.razorpayOrderId,
        name: 'Valiarian',
        description: 'Order Payment',
        prefill: {
          name: billing?.fullName || billing?.name || user?.fullName || '',
          email: billing?.email || user?.email || '',
          contact: billing?.phone || billing?.phoneNumber || user?.phone || '',
        },
        theme: {
          color: '#111827',
        },
      });

      if (checkoutResult?.status === 'cancelled') {
        const cancelledState = {
          ...paymentState,
          status: 'cancelled',
        };

        persistPaymentState(cancelledState);
        navigate(buildPaymentRoute(paths.payment.cancelled, cancelledState), { replace: true });
        return;
      }

      const verifyResponse = await axios.post(endpoints.payments.verify, {
        razorpay_order_id: checkoutResult.response.razorpay_order_id,
        razorpay_payment_id: checkoutResult.response.razorpay_payment_id,
        razorpay_signature: checkoutResult.response.razorpay_signature,
        orderId: paymentState.orderId,
      });

      const verifyOrderStatus = String(
        verifyResponse.data?.order?.status || verifyResponse.data?.orderStatus || ''
      ).toLowerCase();
      const verifyPaymentStatus = String(
        verifyResponse.data?.order?.paymentStatus ||
          verifyResponse.data?.paymentStatus ||
          verifyResponse.data?.status ||
          ''
      ).toLowerCase();
      const shouldShowPending =
        verifyOrderStatus === 'pending' ||
        verifyResponse.data?.status === 'pending' ||
        (verifyOrderStatus === 'pending' && ['paid', 'success'].includes(verifyPaymentStatus));

      const verifiedState = buildPaymentStateFromOrder(
        verifyResponse.data,
        shouldShowPending ? 'pending' : 'success'
      );

      if (
        verifyOrderStatus === 'pending' &&
        ['paid', 'success'].includes(verifyPaymentStatus)
      ) {
        verifiedState.pendingReason = 'stock_unavailable_after_payment';
      }

      persistPaymentState(verifiedState);

      if (verifiedState.status === 'pending') {
        navigate(buildPaymentRoute(paths.payment.pending, verifiedState), { replace: true });
        return;
      }

      if (verifiedState.status === 'failed') {
        navigate(buildPaymentRoute(paths.payment.failed, verifiedState), { replace: true });
        return;
      }

      await clearCheckoutCart();
      navigate(buildPaymentRoute(paths.payment.success, verifiedState), { replace: true });
    } catch (error) {
      const errorMessage = getErrorMessage(error, 'We could not complete your payment.');

      if (createdPaymentState?.orderId) {
        const synced = await syncStatusFromBackend(createdPaymentState);

        if (synced) {
          return;
        }
      }

      if (error && isStockError(errorMessage) && createdPaymentState?.orderId) {
        const pendingState = {
          ...createdPaymentState,
          status: 'pending',
          paymentStatus: createdPaymentState?.paymentStatus || 'paid',
          orderStatus: createdPaymentState?.orderStatus || 'pending',
          pendingReason: 'stock_unavailable_after_payment',
        };

        persistPaymentState(pendingState);
        navigate(buildPaymentRoute(paths.payment.pending, pendingState), { replace: true });
        return;
      }

      if (error) {
        const failedState = {
          ...(createdPaymentState || {}),
          orderId: createdPaymentState?.orderId || '',
          orderNumber: createdPaymentState?.orderNumber || '',
          amount: createdPaymentState?.amount || normalizeAmount(total),
          createdAt: createdPaymentState?.createdAt || new Date().toISOString(),
          status: 'failed',
        };

        persistPaymentState(failedState);
        navigate(buildPaymentRoute(paths.payment.failed, failedState), { replace: true });
        return;
      }

      throw error?.error || error;
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      setCheckoutError('');

      const orderData = createOrderPayload(data.payment);

      if (data.payment === 'razorpay') {
        await handleRazorpayOrder(orderData);
        return;
      }

      if (data.payment === 'cod') {
        await handleCodOrder(orderData);
        return;
      }

      throw new Error('Invalid payment method selected');
    } catch (error) {
      handleInlineError(error, 'We could not place your order. Please try again.');
    }
  });

  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <>
        <Grid container spacing={3}>
          <Grid xs={12} md={8}>
            {!!checkoutError && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {checkoutError}
              </Alert>
            )}

            {!!unavailableCart?.length && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                Some items in your cart are out of stock. They have been excluded from checkout total and order placement.
              </Alert>
            )}

            {!user?.email && (
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
                  <Alert severity="info">
                    <Stack spacing={1.5} sx={{ width: '100%' }}>
                      <Box>
                        Add and verify your email to receive order updates by email. You can also
                        skip this for now.
                      </Box>
                      <EmailPromptAction
                        onClick={() => {
                          setEmailPromptDismissed(false);
                          setEmailDialogOpen(true);
                        }}
                      />
                    </Stack>
                  </Alert>
                </Box>

                <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                  <Alert
                    severity="info"
                    action={
                      <EmailPromptAction
                        onClick={() => {
                          setEmailPromptDismissed(false);
                          setEmailDialogOpen(true);
                        }}
                      />
                    }
                  >
                    Add and verify your email to receive order updates by email. You can also skip
                    this for now.
                  </Alert>
                </Box>
              </Box>
            )}

            <CheckoutDelivery onApplyShipping={onApplyShipping} options={DELIVERY_OPTIONS} />

            <CheckoutPaymentMethods options={PAYMENT_OPTIONS} sx={{ my: 3 }} />

            <Button
              size="small"
              color="inherit"
              onClick={onBackStep}
              startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
              sx={{ display: { xs: 'none', md: 'inline-flex' } }}
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
              tax={tax}
              actual_price={actualSubTotal}
              sale_price={subTotal}
              product_discount={productDiscount}
              coupon_discount={discount}
              selling_price_incl_tax={subTotal}
              shipping_charge={shipping}
              gst_amount={tax}
              final_payable={total}
              onEdit={() => onGotoStep(0)}
            />

            <LoadingButton
              fullWidth
              size="large"
              type="submit"
              variant="contained"
              loading={isSubmitting || isProcessingPayment || isLoadingScript}
              disabled={isSubmitting || isProcessingPayment || !eligibleCart?.length}
            >
              Place Order
            </LoadingButton>
          </Grid>
        </Grid>

        <CheckoutEmailVerificationDialog
          open={emailDialogOpen}
          initialEmail={billing?.email || user?.email || ''}
          onClose={(verified) => {
            setEmailDialogOpen(false);
            if (!verified) {
              setEmailPromptDismissed(true);
            }
          }}
        />
      </>
    </FormProvider>
  );
}

CheckoutPayment.propTypes = {
  checkout: PropTypes.object,
  onBackStep: PropTypes.func,
  onGotoStep: PropTypes.func,
  onApplyShipping: PropTypes.func,
};
