import { yupResolver } from '@hookform/resolvers/yup';
import LoadingButton from '@mui/lab/LoadingButton';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useGetProduct } from 'src/api/product';
import { useAuthContext } from 'src/auth/hooks';
import FormProvider from 'src/components/hook-form';
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import { useSnackbar } from 'src/components/snackbar';
import useRazorpay from 'src/hooks/use-razorpay';
import { useRouter, useSearchParams } from 'src/routes/hook';
import { RouterLink } from 'src/routes/components';
import { paths } from 'src/routes/paths';
import axios, { endpoints } from 'src/utils/axios';
import { buildAuthRouteWithReturnTo, setStoredReturnPath } from 'src/utils/auth-redirect';
import { fCurrency } from 'src/utils/format-number';
import {
  getDefaultPremiumVariant,
  getPremiumNextAvailableVariant,
  getPremiumProductVariants,
  getPremiumVariantColorValue,
  getPremiumVariantColorOptions,
  getPremiumVariantPrice,
  getPremiumVariantSizeOptions,
  isPremiumColorAvailable,
  isPremiumSizeAvailable,
  isPremiumVariantInStock,
} from 'src/utils/premium-product';
import * as Yup from 'yup';
import CheckoutBillingAddress from 'src/sections/product/checkout/checkout-billing-address';
import CheckoutBillingInfo from 'src/sections/product/checkout/checkout-billing-info';
import CheckoutPaymentMethods from 'src/sections/product/checkout/checkout-payment-methods';
import CheckoutSummary from 'src/sections/product/checkout/checkout-summary';
import CheckoutSteps from 'src/sections/product/checkout/checkout-steps';

const PAYMENT_OPTIONS = [
  {
    value: 'razorpay',
    label: 'Razorpay (UPI, Cards, Wallets)',
    description: 'Pay the full preorder amount securely via Razorpay.',
  },
];

const optionButtonSx = (selected, disabled) => ({
  position: 'relative',
  minWidth: 64,
  px: 1.75,
  py: 1,
  borderRadius: 999,
  border: '1px solid',
  borderColor: selected ? 'secondary.main' : 'divider',
  bgcolor: selected ? 'secondary.lighter' : 'background.paper',
  color: selected ? 'secondary.darker' : 'text.primary',
  opacity: disabled ? 0.48 : 1,
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'all 0.2s ease',
  '&::after': disabled
    ? {
        content: '""',
        position: 'absolute',
        left: '14%',
        right: '14%',
        top: '50%',
        borderTop: '2px solid',
        borderColor: 'error.main',
        transform: 'rotate(-24deg)',
      }
    : undefined,
});

const PREMIUM_PREORDER_STEPS = ['Product', 'Authentication', 'Billing & address', 'Payment'];

export default function PremiumPreorderCheckoutView() {
  const settings = useSettingsContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authenticated, user } = useAuthContext();
  const { enqueueSnackbar } = useSnackbar();
  const { loadScript, openCheckout, isLoadingScript } = useRazorpay();

  const productSlug = searchParams.get('product') || '';
  const initialVariantId = searchParams.get('variant') || '';
  const { product, productLoading, productError } = useGetProduct(productSlug);

  const [activeStep, setActiveStep] = useState(0);
  const [billing, setBilling] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState(initialVariantId);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [completedPreorder, setCompletedPreorder] = useState(null);
  const [completedStatus, setCompletedStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const variants = useMemo(() => getPremiumProductVariants(product), [product]);
  const colorOptions = useMemo(() => getPremiumVariantColorOptions(product), [product]);
  const sizeOptions = useMemo(() => getPremiumVariantSizeOptions(product), [product]);

  useEffect(() => {
    if (!authenticated && activeStep > 1) {
      setActiveStep(1);
      return;
    }

    if (authenticated && activeStep === 1 && billing) {
      setActiveStep(2);
    }

    if (authenticated && activeStep > 1 && !billing) {
      setActiveStep(1);
    }
  }, [activeStep, authenticated, billing]);

  useEffect(() => {
    if (!product) {
      return;
    }

    const defaultVariant = getDefaultPremiumVariant(product, initialVariantId);

    if (!defaultVariant) {
      setSelectedVariantId('');
      setSelectedColor('');
      setSelectedSize('');
      return;
    }

    setSelectedVariantId(defaultVariant.id || '');
    setSelectedColor(getPremiumVariantColorValue(defaultVariant));
    setSelectedSize(defaultVariant.size || '');
  }, [initialVariantId, product]);

  const selectedVariant = useMemo(
    () => variants.find((variant) => variant.id === selectedVariantId) || null,
    [selectedVariantId, variants]
  );

  useEffect(() => {
    if (!selectedVariant) {
      return;
    }

    const selectedVariantColor = getPremiumVariantColorValue(selectedVariant);

    if (selectedVariantColor !== selectedColor) {
      setSelectedColor(selectedVariantColor);
    }

    if (selectedVariant.size !== selectedSize) {
      setSelectedSize(selectedVariant.size || '');
    }
  }, [selectedColor, selectedSize, selectedVariant]);

  const unitPrice = useMemo(
    () => getPremiumVariantPrice(product, selectedVariant),
    [product, selectedVariant]
  );
  const selectedVariantInStock = isPremiumVariantInStock(product, selectedVariant);
  const selectedStock = Number(selectedVariant?.stockQuantity ?? product?.stockQuantity ?? 0);

  const checkoutSummary = useMemo(
    () => ({
      total: unitPrice,
      subTotal: unitPrice,
      discount: 0,
      shipping: 0,
      tax: 0,
      actualSubTotal: Number(selectedVariant?.price || product?.price || unitPrice || 0),
      productDiscount: Math.max(
        Number(selectedVariant?.price || product?.price || unitPrice || 0) - Number(unitPrice || 0),
        0
      ),
    }),
    [product?.price, selectedVariant?.price, unitPrice]
  );

  const paymentSchema = Yup.object().shape({
    payment: Yup.string().required('Payment method is required'),
  });

  const methods = useForm({
    resolver: yupResolver(paymentSchema),
    defaultValues: {
      payment: 'razorpay',
    },
  });

  const {
    handleSubmit,
  } = methods;

  const markPremiumPaymentFailed = async (preorderId, payload = {}) => {
    if (!preorderId) {
      return null;
    }

    try {
      const response = await axios.post(endpoints.premiumPreorders.paymentFailed(preorderId), {
        reason: 'checkout_abandoned',
        ...payload,
      });
      return response.data?.preorder || null;
    } catch (error) {
      console.error('Failed to mark premium preorder payment failure:', error);
      return null;
    }
  };

  useEffect(() => {
    loadScript().catch(() => undefined);
  }, [loadScript]);

  const handleLogin = () => {
    const returnTo = `${paths.premiumPreorder.checkout}?${new URLSearchParams({
      product: productSlug,
      ...(selectedVariantId ? { variant: selectedVariantId } : {}),
    }).toString()}`;

    setStoredReturnPath(returnTo);
    router.push(buildAuthRouteWithReturnTo(paths.auth.jwt.login, returnTo));
  };

  const handleSignup = () => {
    const returnTo = `${paths.premiumPreorder.checkout}?${new URLSearchParams({
      product: productSlug,
      ...(selectedVariantId ? { variant: selectedVariantId } : {}),
    }).toString()}`;

    setStoredReturnPath(returnTo);
    router.push(buildAuthRouteWithReturnTo(paths.auth.jwt.register, returnTo));
  };

  const handleCreateBilling = (address) => {
    setBilling(address);
    setActiveStep(2);
  };

  const handleContinueFromProduct = () => {
    if (variants.length > 0 && !selectedVariantId) {
      enqueueSnackbar('Please select an available size and color.', { variant: 'error' });
      return;
    }

    if (!selectedVariantInStock) {
      enqueueSnackbar('The selected premium variant is out of stock.', { variant: 'error' });
      return;
    }

    setActiveStep(1);
  };

  const handleBackStep = () => {
    if (activeStep <= 0) {
      return;
    }

    setActiveStep((currentStep) => currentStep - 1);
  };

  const handleColorChange = (color) => {
    const nextVariant = getPremiumNextAvailableVariant(product, {
      color,
      size: selectedSize,
    });

    setSelectedColor(color);

    if (!nextVariant) {
      setSelectedVariantId('');
      return;
    }

    setSelectedVariantId(nextVariant.id || '');
    setSelectedSize(nextVariant.size || selectedSize || '');
  };

  const handleSizeChange = (size) => {
    const nextVariant = getPremiumNextAvailableVariant(product, {
      color: selectedColor,
      size,
    });

    setSelectedSize(size);

    if (!nextVariant) {
      setSelectedVariantId('');
      return;
    }

    setSelectedVariantId(nextVariant.id || '');
    setSelectedColor(getPremiumVariantColorValue(nextVariant) || selectedColor || '');
  };

  const onSubmit = handleSubmit(async () => {
    let createdPreorderId = '';
    let createdRazorpayOrderId = '';

    if (!authenticated || !user?.id) {
      enqueueSnackbar('Please sign in to continue.', { variant: 'error' });
      setActiveStep(0);
      return;
    }

    if (!productSlug || !product) {
      enqueueSnackbar('Premium preorder product is missing.', { variant: 'error' });
      return;
    }

    if (variants.length > 0 && !selectedVariantId) {
      enqueueSnackbar('Please select an available size and color.', { variant: 'error' });
      return;
    }

    if (!selectedVariantInStock) {
      enqueueSnackbar('The selected premium variant is out of stock.', { variant: 'error' });
      return;
    }

    if (!billing) {
      enqueueSnackbar('Please select your billing address.', { variant: 'error' });
      setActiveStep(1);
      return;
    }

    setSubmitting(true);

    try {
      const createResponse = await axios.post(endpoints.premiumPreorders.create, {
        productSlug,
        variantId: selectedVariantId || undefined,
        selectedColor: selectedColor || undefined,
        billingAddress: {
          fullName: billing?.fullName || billing?.name || '',
          phone: billing?.phone || billing?.phoneNumber || '',
          email: billing?.email || user?.email || '',
          address: billing?.address || billing?.fullAddress || '',
          city: billing?.city || '',
          state: billing?.state || '',
          zipCode: billing?.zipCode || billing?.zip || '',
          country: billing?.country || 'India',
        },
        shippingAddress: {
          fullName: billing?.fullName || billing?.name || '',
          phone: billing?.phone || billing?.phoneNumber || '',
          email: billing?.email || user?.email || '',
          address: billing?.address || billing?.fullAddress || '',
          city: billing?.city || '',
          state: billing?.state || '',
          zipCode: billing?.zipCode || billing?.zip || '',
          country: billing?.country || 'India',
        },
      });

      const preorder = createResponse.data?.preorder;
      createdPreorderId = preorder?.id || '';
      createdRazorpayOrderId = createResponse.data?.razorpayOrderId || '';
      const checkoutResult = await openCheckout({
        key: createResponse.data?.keyId,
        amount: createResponse.data?.amount,
        currency: createResponse.data?.currency || 'INR',
        name: 'Valiarian Premium',
        description: product.name,
        order_id: createResponse.data?.razorpayOrderId,
        prefill: {
          name: billing?.fullName || billing?.name || user?.fullName || '',
          email: billing?.email || user?.email || '',
          contact: billing?.phone || billing?.phoneNumber || user?.phone || '',
        },
        theme: {
          color: '#8C6549',
        },
      });

      if (checkoutResult?.status === 'cancelled') {
        await markPremiumPaymentFailed(preorder?.id, {
          razorpayOrderId: createdRazorpayOrderId,
          reason: 'checkout_abandoned',
        });
        enqueueSnackbar('Premium preorder payment was cancelled.', { variant: 'warning' });
        return;
      }

      const verifyResponse = await axios.post(endpoints.premiumPreorders.verify, {
        preorderId: preorder?.id,
        razorpay_order_id: checkoutResult.response?.razorpay_order_id,
        razorpay_payment_id: checkoutResult.response?.razorpay_payment_id,
        razorpay_signature: checkoutResult.response?.razorpay_signature,
      });

      setCompletedPreorder(verifyResponse.data?.preorder || preorder);
      setCompletedStatus(String(verifyResponse.data?.status || '').toLowerCase());

      if (String(verifyResponse.data?.status || '').toLowerCase() === 'payment_review') {
        enqueueSnackbar(
          'Payment successful, but item is currently unavailable. Our team will process refund or assist you shortly.',
          { variant: 'warning' }
        );
      } else if (String(verifyResponse.data?.status || '').toLowerCase() === 'pending') {
        enqueueSnackbar('Premium preorder payment is pending confirmation.', { variant: 'warning' });
      } else {
        enqueueSnackbar('Premium preorder placed successfully.', { variant: 'success' });
      }
    } catch (error) {
      console.error('Premium preorder checkout failed:', error);
      const failedPreorderId =
        createdPreorderId || error?.preorderId || error?.response?.data?.preorderId;
      const razorpayOrderId =
        createdRazorpayOrderId ||
        error?.response?.error?.metadata?.order_id ||
        error?.response?.data?.razorpayOrderId;
      const razorpayPaymentId =
        error?.response?.error?.metadata?.payment_id || error?.response?.data?.razorpayPaymentId;

      if (error?.status === 'failed' && failedPreorderId) {
        await markPremiumPaymentFailed(failedPreorderId, {
          razorpayOrderId,
          razorpayPaymentId,
          reason: error?.response?.error?.reason || 'checkout_abandoned',
        });
      }

      enqueueSnackbar(
        error?.response?.data?.message || error?.message || 'Failed to place premium preorder.',
        { variant: 'error' }
      );
    } finally {
      setSubmitting(false);
    }
  });

  if (productLoading) {
    return (
      <Container maxWidth={settings.themeStretch ? false : 'lg'} sx={{ py: 10 }}>
        <Typography variant="h4">Loading premium preorder...</Typography>
      </Container>
    );
  }

  if (!productSlug || productError || !product) {
    return (
      <Container maxWidth={settings.themeStretch ? false : 'sm'} sx={{ py: 10 }}>
        <Card>
          <CardContent>
            <Stack spacing={3} alignItems="center" textAlign="center">
              <Iconify icon="solar:danger-circle-bold" width={48} />
              <Typography variant="h4">Premium preorder product not found</Typography>
              <Typography color="text.secondary">
                Please return to the Premium page and choose a valid preorder product.
              </Typography>
              <Button component={RouterLink} href={paths.premium} variant="contained" color="secondary">
                Back to Premium
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    );
  }

  if (completedPreorder) {
    const isPendingCompletion = completedStatus === 'pending';
    const isReviewCompletion = completedStatus === 'payment_review';
    let completionIcon = 'solar:verified-check-bold';
    let completionHeading = 'Premium preorder confirmed';
    let completionMessage =
      "We'll keep this separate from regular orders so premium fulfillment stays easier to manage.";

    if (isReviewCompletion) {
      completionIcon = 'solar:shield-warning-bold';
      completionHeading = 'Premium preorder under review';
      completionMessage =
        'Payment successful, but item is currently unavailable. Our team will process refund or assist you shortly.';
    } else if (isPendingCompletion) {
      completionIcon = 'solar:clock-circle-bold';
      completionHeading = 'Premium preorder payment pending';
      completionMessage =
        'Your payment is still awaiting Razorpay capture confirmation. We will keep this premium preorder separate while it remains pending.';
    }

    return (
      <Container maxWidth={settings.themeStretch ? false : 'sm'} sx={{ py: 10 }}>
        <Card>
          <CardContent>
            <Stack spacing={3} alignItems="center" textAlign="center">
              <Iconify
                icon={completionIcon}
                width={56}
                sx={{
                  color: isReviewCompletion || isPendingCompletion ? 'warning.main' : 'success.main',
                }}
              />
              <Typography variant="h4">{completionHeading}</Typography>
              <Typography color="text.secondary">
                Your premium preorder <strong>#{completedPreorder.preorderNumber}</strong> has been recorded.
              </Typography>
              <Typography color="text.secondary">{completionMessage}</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button component={RouterLink} href={paths.premium} variant="contained" color="secondary">
                  Back to Premium
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    );
  }

  const checkoutSteps = authenticated
    ? PREMIUM_PREORDER_STEPS.filter((step) => step !== 'Authentication')
    : PREMIUM_PREORDER_STEPS;
  const displayActiveStep = authenticated && activeStep > 1 ? activeStep - 1 : activeStep;
  const showEmbeddedBillingLayout = authenticated && activeStep === 1;
  const showSidebarSummary = !showEmbeddedBillingLayout;

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'} sx={{ py: { xs: 4, md: 8 } }}>
      <Stack spacing={2} sx={{ mb: 5 }}>
        <Typography variant="h3">Premium Preorder Checkout</Typography>
        <Typography color="text.secondary">
          This checkout is only for the premium preorder product and charges the full amount now.
        </Typography>
      </Stack>

      <CheckoutSteps activeStep={displayActiveStep} steps={checkoutSteps} />

      {activeStep > 0 && (
        <Button
          size="small"
          color="inherit"
          onClick={handleBackStep}
          startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
          sx={{ display: { xs: 'inline-flex', md: 'none' }, mb: 3 }}
        >
          Back
        </Button>
      )}

      <Grid container spacing={{ xs: 3, md: 4 }}>
        <Grid xs={12} md={showSidebarSummary ? 8 : 12}>
          <Stack spacing={3}>
            {activeStep === 0 && (
              <Card>
                <CardContent>
                  <Stack spacing={3}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                      <Box
                        component="img"
                        src={selectedVariant?.images?.[0] || product.coverImage || product.images?.[0]}
                        alt={product.name}
                        sx={{
                          width: { xs: 1, md: 220 },
                          height: { xs: 260, md: 220 },
                          borderRadius: 2,
                          objectFit: 'cover',
                        }}
                      />

                      <Stack spacing={1.5} flexGrow={1}>
                        <Typography variant="h4">{product.name}</Typography>
                        <Typography color="text.secondary">
                          {product.shortDescription || product.description}
                        </Typography>
                        <Typography variant="h5" color="secondary.main">
                          {fCurrency(unitPrice)}
                        </Typography>

                        {!!sizeOptions.length && (
                          <Stack spacing={1.25} sx={{ pt: 1 }}>
                            <Typography variant="subtitle2">Select Size</Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                              {sizeOptions.map((size) => {
                                const disabled = !isPremiumSizeAvailable(product, size, selectedColor);
                                const button = (
                                  <Box
                                    component="button"
                                    type="button"
                                    key={size}
                                    disabled={disabled}
                                    onClick={() => !disabled && handleSizeChange(size)}
                                    sx={optionButtonSx(selectedSize === size, disabled)}
                                  >
                                    {size}
                                  </Box>
                                );

                                return disabled ? (
                                  <Tooltip key={size} title="Out of stock">
                                    <Box>{button}</Box>
                                  </Tooltip>
                                ) : (
                                  button
                                );
                              })}
                            </Stack>
                          </Stack>
                        )}

                        {!!colorOptions.length && (
                          <Stack spacing={1.25}>
                            <Typography variant="subtitle2">Select Color</Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                              {colorOptions.map((colorOption) => {
                                const disabled = !isPremiumColorAvailable(
                                  product,
                                  colorOption.value,
                                  selectedSize
                                );
                                const button = (
                                  <Box
                                    component="button"
                                    type="button"
                                    key={colorOption.value}
                                    disabled={disabled}
                                    onClick={() => !disabled && handleColorChange(colorOption.value)}
                                    sx={{
                                      ...optionButtonSx(selectedColor === colorOption.value, disabled),
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 1,
                                      minWidth: 110,
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        width: 14,
                                        height: 14,
                                        borderRadius: '50%',
                                        bgcolor: colorOption.swatch || colorOption.value,
                                        border: '1px solid rgba(0,0,0,0.16)',
                                        flexShrink: 0,
                                      }}
                                    />
                                    <Box component="span">{colorOption.label}</Box>
                                  </Box>
                                );

                                return disabled ? (
                                  <Tooltip key={colorOption.value} title="Out of stock">
                                    <Box>{button}</Box>
                                  </Tooltip>
                                ) : (
                                  button
                                );
                              })}
                            </Stack>
                          </Stack>
                        )}

                        <Typography
                          variant="body2"
                          color={selectedVariantInStock ? 'success.main' : 'error.main'}
                        >
                          {selectedVariantInStock
                            ? `Available stock: ${selectedStock}`
                            : 'Selected combination is out of stock'}
                        </Typography>

                        <Alert severity="info" sx={{ mt: 1 }}>
                          Premium preorders are processed one item per checkout and are stored separately from normal orders.
                        </Alert>

                        <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={2} justifyContent="space-between" sx={{ pt: 1 }}>
                          <Button variant="outlined" color="inherit" onClick={() => router.push(paths.premium)}>
                            Back to Premium
                          </Button>
                          <LoadingButton
                            variant="contained"
                            color="secondary"
                            onClick={handleContinueFromProduct}
                            disabled={!selectedVariantInStock}
                          >
                            Continue
                          </LoadingButton>
                        </Stack>
                      </Stack>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            )}

            {activeStep === 1 && !authenticated && (
              <Card>
                <CardContent>
                  <Stack spacing={3} alignItems="center" textAlign="center">
                    <Typography variant="h5">Sign in to continue</Typography>
                    <Typography color="text.secondary">
                      We use your account to secure payment and keep your premium preorder linked to you.
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <Button variant="contained" color="secondary" onClick={handleLogin}>
                        Sign In
                      </Button>
                      <Button variant="outlined" color="secondary" onClick={handleSignup}>
                        Create Account
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            )}

            {authenticated && activeStep === 1 && (
              <CheckoutBillingAddress
                checkout={checkoutSummary}
                onBackStep={handleBackStep}
                onCreateBilling={handleCreateBilling}
              />
            )}

            {authenticated && activeStep === 2 && (
              <FormProvider methods={methods} onSubmit={onSubmit}>
                <Stack spacing={3}>
                  <CheckoutBillingInfo billing={billing} onBackStep={() => setActiveStep(1)} />

                  <CheckoutPaymentMethods options={PAYMENT_OPTIONS} />

                  <Alert severity="info">
                    The full preorder amount will be charged now. This premium preorder will not appear in the regular Orders admin list.
                  </Alert>

                  <Divider />

                  <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={2} justifyContent="space-between">
                    <Button variant="outlined" color="secondary" onClick={() => setActiveStep(1)}>
                      Change Address
                    </Button>
                    <LoadingButton
                      type="submit"
                      variant="contained"
                      color="secondary"
                      loading={submitting || isLoadingScript}
                      disabled={!selectedVariantInStock}
                    >
                      Pay {fCurrency(unitPrice)}
                    </LoadingButton>
                  </Stack>
                </Stack>
              </FormProvider>
            )}
          </Stack>
        </Grid>

        {showSidebarSummary && (
          <Grid xs={12} md={4}>
            <CheckoutSummary
              total={checkoutSummary.total}
              subTotal={checkoutSummary.subTotal}
              discount={checkoutSummary.discount}
              shipping={checkoutSummary.shipping}
              tax={checkoutSummary.tax}
              actual_price={checkoutSummary.actualSubTotal}
              sale_price={checkoutSummary.subTotal}
              product_discount={checkoutSummary.productDiscount}
              coupon_discount={0}
            />
          </Grid>
        )}
      </Grid>
    </Container>
  );
}
