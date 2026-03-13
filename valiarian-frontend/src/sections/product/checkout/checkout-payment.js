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
import axios from 'src/utils/axios';
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
  // {
  //   value: 10,
  //   label: 'Standard',
  //   description: '3-5 Days delivery',
  // },
  // {
  //   value: 20,
  //   label: 'Express',
  //   description: '2-3 Days delivery',
  // },
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

  const handleCloseErrorDialog = () => {
    setErrorDialogOpen(false);
    setOrderError(null);
  };

  const handleRetry = () => {
    handleCloseErrorDialog();
  };

  const handleUpdateCart = () => {
    handleCloseErrorDialog();
    onGotoStep(0);
  };

  const handleCheckHistory = () => {
    handleCloseErrorDialog();
    navigate('/orders/history');
  };

  const calculateTax = (subtotal, discountAmount) => {
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    return Number((taxableAmount * 0.18).toFixed(2)); // 18% GST
  };

  const handleRazorpayPayment = async (orderData) => {
    try {
      // Create order on backend
      const createResponse = await axios.post('/api/orders/create', orderData);
      const { order, razorpayOrderId } = createResponse.data;

      if (!razorpayOrderId) {
        throw new Error('Failed to create Razorpay order');
      }

      // Initialize Razorpay
      const options = {
        key: RAZORPAY_KEY_ID,
        amount: Math.round(order.total * 100), // Amount in paise
        currency: order.currency || 'INR',
        name: 'Valiarian',
        description: `Order #${order.orderNumber}`,
        order_id: razorpayOrderId,
        handler: async (response) => {
          try {
            // Verify payment on backend
            const verifyResponse = await axios.post('/api/orders/verify-payment', {
              orderId: order.id,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            if (verifyResponse.data.verified) {
              // Clear cart
              dispatch(resetCart());

              // Navigate to order confirmation
              navigate(`/orders/confirmation/${order.id}`);
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            setOrderError({
              type: 'payment',
              title: 'Payment Verification Failed',
              message: error.response?.data?.message || 'Failed to verify payment. Please contact support.',
              action: 'check_history',
            });
            setErrorDialogOpen(true);
          }
        },
        prefill: {
          name: billing.fullName || user.name,
          email: billing.email || user.email,
          contact: billing.phone || user.phone,
        },
        theme: {
          color: '#3399cc',
        },
        modal: {
          ondismiss: () => {
            console.log('Payment cancelled by user');
          },
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.on('payment.failed', (response) => {
        console.error('Payment failed:', response.error);
        setOrderError({
          type: 'payment',
          title: 'Payment Failed',
          message: response.error.description || 'Payment failed. Please try again.',
          action: 'retry_payment',
        });
        setErrorDialogOpen(true);
      });

      rzp.open();
    } catch (error) {
      console.error('Razorpay payment error:', error);
      throw error;
    }
  };

  const handleCODOrder = async (orderData) => {
    try {
      const response = await axios.post('/api/orders/create', orderData);
      const { order } = response.data;

      // Clear cart
      dispatch(resetCart());

      // Navigate to order confirmation
      navigate(`/orders/confirmation/${order.id}`);
    } catch (error) {
      console.error('COD order error:', error);
      throw error;
    }
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      setOrderError(null);

      if (!user || !user.id) {
        throw new Error('User not authenticated');
      }

      if (!cart || cart.length === 0) {
        throw new Error('Cart is empty');
      }

      // Calculate tax
      const tax = calculateTax(subTotal, discount);

      // Prepare cart items
      const cartItems = cart.map((item) => ({
        productId: item.id,
        variantId: item.variantId || null,
        quantity: item.quantity,
        price: item.price,
      }));

      // Prepare order data
      const orderData = {
        cartItems,
        billingAddress: {
          fullName: billing.fullName || billing.name,
          phone: billing.phone,
          email: billing.email || user.email,
          address: billing.address,
          city: billing.city,
          state: billing.state,
          zipCode: billing.zipCode || billing.zip,
          country: billing.country || 'India',
        },
        shippingAddress: {
          fullName: billing.fullName || billing.name,
          phone: billing.phone,
          email: billing.email || user.email,
          address: billing.address,
          city: billing.city,
          state: billing.state,
          zipCode: billing.zipCode || billing.zip,
          country: billing.country || 'India',
        },
        paymentMethod: data.payment,
        discount,
        shipping,
        tax,
      };

      // Handle payment based on method
      if (data.payment === 'razorpay') {
        await handleRazorpayPayment(orderData);
      } else if (data.payment === 'cod') {
        await handleCODOrder(orderData);
      } else {
        throw new Error('Invalid payment method');
      }
    } catch (error) {
      console.error('Order creation error:', error);

      const errorMessage = error.response?.data?.message || error.message || 'Failed to create order';

      setOrderError({
        type: 'generic',
        title: 'Order Creation Failed',
        message: errorMessage,
        action: 'retry',
      });
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
