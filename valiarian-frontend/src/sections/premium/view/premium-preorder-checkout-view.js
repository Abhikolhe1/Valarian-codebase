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
import * as Yup from 'yup';
import CheckoutBillingAddress from 'src/sections/product/checkout/checkout-billing-address';
import CheckoutBillingInfo from 'src/sections/product/checkout/checkout-billing-info';
import CheckoutPaymentMethods from 'src/sections/product/checkout/checkout-payment-methods';
import CheckoutSummary from 'src/sections/product/checkout/checkout-summary';

const PAYMENT_OPTIONS = [
  {
    value: 'razorpay',
    label: 'Razorpay (UPI, Cards, Wallets)',
    description: 'Pay the full preorder amount securely via Razorpay.',
  },
];

const getVariantLabel = (variant) =>
  [variant?.size, variant?.colorName || variant?.color].filter(Boolean).join(' / ') || 'Default';

const getVariantPrice = (product, variant) => {
  const prioritizedPrices = [
    variant?.salePrice,
    product?.salePrice,
    variant?.price,
    product?.price,
  ];
  const match = prioritizedPrices.find((value) => Number.isFinite(Number(value)) && Number(value) > 0);

  return match ? Number(match) : 0;
};

const buildVariantOptions = (product) => {
  const variants = Array.isArray(product?.variants) ? product.variants : [];

  if (!variants.length) {
    return [];
  }

  return variants.map((variant) => ({
    value: variant.id,
    label: getVariantLabel(variant),
  }));
};

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

  const [activeStep, setActiveStep] = useState(authenticated ? 1 : 0);
  const [billing, setBilling] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState(initialVariantId);
  const [completedPreorder, setCompletedPreorder] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const variantOptions = useMemo(() => buildVariantOptions(product), [product]);

  useEffect(() => {
    if (!authenticated) {
      setActiveStep(0);
      return;
    }

    setActiveStep((currentStep) => (currentStep === 0 ? 1 : currentStep));
  }, [authenticated]);

  useEffect(() => {
    if (!product) {
      return;
    }

    const variants = Array.isArray(product.variants) ? product.variants : [];

    if (!variants.length) {
      setSelectedVariantId('');
      return;
    }

    const preferredVariant =
      variants.find((variant) => variant.id === initialVariantId) ||
      variants.find((variant) => variant.isDefault) ||
      variants[0];

    setSelectedVariantId(preferredVariant?.id || '');
  }, [initialVariantId, product]);

  const selectedVariant = useMemo(
    () => (product?.variants || []).find((variant) => variant.id === selectedVariantId) || null,
    [product?.variants, selectedVariantId]
  );

  const unitPrice = useMemo(() => getVariantPrice(product, selectedVariant), [product, selectedVariant]);

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

  const onSubmit = handleSubmit(async () => {
    if (!authenticated || !user?.id) {
      enqueueSnackbar('Please sign in to continue.', { variant: 'error' });
      setActiveStep(0);
      return;
    }

    if (!productSlug || !product) {
      enqueueSnackbar('Premium preorder product is missing.', { variant: 'error' });
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
      enqueueSnackbar('Premium preorder placed successfully.', { variant: 'success' });
    } catch (error) {
      console.error('Premium preorder checkout failed:', error);
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
    return (
      <Container maxWidth={settings.themeStretch ? false : 'sm'} sx={{ py: 10 }}>
        <Card>
          <CardContent>
            <Stack spacing={3} alignItems="center" textAlign="center">
              <Iconify icon="solar:verified-check-bold" width={56} sx={{ color: 'success.main' }} />
              <Typography variant="h4">Premium preorder confirmed</Typography>
              <Typography color="text.secondary">
                Your premium preorder <strong>#{completedPreorder.preorderNumber}</strong> has been recorded.
              </Typography>
              <Typography color="text.secondary">
                We&apos;ll keep this separate from regular orders so premium fulfillment stays easier to manage.
              </Typography>
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

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'} sx={{ py: { xs: 4, md: 8 } }}>
      <Stack spacing={2} sx={{ mb: 5 }}>
        <Typography variant="h3">Premium Preorder Checkout</Typography>
        <Typography color="text.secondary">
          This checkout is only for the premium preorder product and charges the full amount now.
        </Typography>
      </Stack>

      <Grid container spacing={{ xs: 3, md: 4 }}>
        <Grid xs={12} md={8}>
          <Stack spacing={3}>
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
                      <Typography color="text.secondary">{product.shortDescription || product.description}</Typography>
                      <Typography variant="h5" color="secondary.main">
                        {fCurrency(unitPrice)}
                      </Typography>

                      {!!variantOptions.length && (
                        <Box sx={{ maxWidth: 280, pt: 1 }}>
                          <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            Select Variant
                          </Typography>
                          <Box
                            component="select"
                            value={selectedVariantId}
                            onChange={(event) => setSelectedVariantId(event.target.value)}
                            style={{
                              width: '100%',
                              padding: '12px 14px',
                              borderRadius: 8,
                              border: '1px solid rgba(145, 158, 171, 0.24)',
                              background: '#fff',
                            }}
                          >
                            {variantOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </Box>
                        </Box>
                      )}

                      <Alert severity="info" sx={{ mt: 1 }}>
                        Premium preorders are processed one item per checkout and are stored separately from normal orders.
                      </Alert>
                    </Stack>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            {!authenticated && (
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
                onBackStep={() => router.push(paths.premium)}
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
                    >
                      Pay {fCurrency(unitPrice)}
                    </LoadingButton>
                  </Stack>
                </Stack>
              </FormProvider>
            )}
          </Stack>
        </Grid>

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
      </Grid>
    </Container>
  );
}
