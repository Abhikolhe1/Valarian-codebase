import { useCallback, useState } from 'react';
// auth
import { useAuthContext } from 'src/auth/hooks';
import { useSnackbar } from 'src/components/snackbar';
import { INCLUDED_SHIPPING_CHARGE } from 'src/config/checkout';
// api
import {
  addCartItem as addCartItemRequest,
  removeCartItem as removeCartItemRequest,
  updateCartItemQuantity,
} from 'src/api/cart';
// redux
import {
  addToCart,
  applyCoupon,
  applyDiscount,
  applyShipping,
  createBilling,
  decreaseQuantity,
  deleteCart,
  getCart,
  gotoStep,
  increaseQuantity,
  removeCoupon,
  resetCart,
  resetCheckoutFlow,
  startBuyNow,
} from 'src/redux/slices/checkout';
import { useDispatch, useSelector } from 'src/redux/store';
import axios, { endpoints } from 'src/utils/axios';
// utils
import { trackEcommerceEvent } from 'src/utils/analytics';
import { calculateCheckoutTotals, findCartItem, isCartItemMatch } from 'src/utils/cart-utils';
// _mock
import { PRODUCT_CHECKOUT_STEPS } from 'src/_mock/_product';
// routes
import { useRouter } from 'src/routes/hook';
import { paths } from 'src/routes/paths';

// ----------------------------------------------------------------------

export default function useCheckout() {
  const dispatch = useDispatch();
  const { authenticated, user } = useAuthContext();
  const { enqueueSnackbar } = useSnackbar();

  const router = useRouter();
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

  const checkout = useSelector((state) => state.checkout);
  const checkoutItems = checkout.buyNowItem ? [checkout.buyNowItem] : checkout.cart;
  const includedShipping = Number(checkout.shipping) || INCLUDED_SHIPPING_CHARGE;
  const sessionTotals = calculateCheckoutTotals(
    checkoutItems,
    checkout.discount,
    includedShipping
  );
  const checkoutSession = {
    ...checkout,
    shipping: includedShipping,
    cart: sessionTotals.cart,
    eligibleCart: sessionTotals.eligibleCart,
    unavailableCart: sessionTotals.unavailableCart,
    subTotal: sessionTotals.subTotal,
    total: sessionTotals.total,
    totalItems: sessionTotals.totalItems,
    isBuyNow: Boolean(checkout.buyNowItem),
  };

  const completed = checkoutSession.activeStep === PRODUCT_CHECKOUT_STEPS.length;

  const normalizeStep = useCallback(
    (step, options = {}) => {
      const { hasBilling = Boolean(checkoutSession.billing), isAuthenticated = authenticated } = options;
      const safeStep = Math.max(0, Math.min(step, PRODUCT_CHECKOUT_STEPS.length));

      if (!isAuthenticated) {
        return Math.min(safeStep, 1);
      }

      if (safeStep <= 1) {
        return safeStep;
      }

      if (!hasBilling) {
        return 1;
      }

      if (isAuthenticated && safeStep === 2) {
        return 3;
      }

      if (!isAuthenticated && safeStep > 2) {
        return 2;
      }

      return safeStep;
    },
    [authenticated, checkoutSession.billing]
  );

  const onNextStep = useCallback(() => {
    if (checkoutSession.activeStep === 0 && checkoutSession.eligibleCart.length) {
      trackEcommerceEvent('begin_checkout', checkoutSession.eligibleCart, {
        value: checkoutSession.total,
        coupon: checkoutSession.appliedCoupon?.code,
      });
    }

    dispatch(gotoStep(normalizeStep(checkoutSession.activeStep + 1)));
  }, [
    checkoutSession.activeStep,
    checkoutSession.appliedCoupon?.code,
    checkoutSession.eligibleCart,
    checkoutSession.total,
    dispatch,
    normalizeStep,
  ]);

  const onBackStep = useCallback(() => {
    const previousStep = checkoutSession.activeStep - 1;

    if (authenticated && checkoutSession.activeStep === 3) {
      dispatch(gotoStep(1));
      return;
    }

    dispatch(gotoStep(normalizeStep(previousStep)));
  }, [authenticated, checkoutSession.activeStep, dispatch, normalizeStep]);

  const onGotoStep = useCallback(
    (step) => {
      dispatch(gotoStep(normalizeStep(step)));
    },
    [dispatch, normalizeStep]
  );

  const onDeleteCart = useCallback(
    async (identifier) => {
      const removedItem = findCartItem(checkoutSession.cart, identifier);

      if (checkout.buyNowItem && isCartItemMatch(checkout.buyNowItem, identifier)) {
        dispatch(deleteCart(identifier));
        if (removedItem) trackEcommerceEvent('remove_from_cart', [removedItem]);
        return;
      }

      const previousCart = checkout.cart;
      dispatch(deleteCart(identifier));

      if (!authenticated || !user?.id) {
        if (removedItem) trackEcommerceEvent('remove_from_cart', [removedItem]);
        return;
      }

      const cartItem = findCartItem(previousCart, identifier);

      if (!cartItem?.cartItemId) {
        dispatch(getCart(previousCart));
        return;
      }

      try {
        const syncedCart = await removeCartItemRequest(user.id, cartItem.cartItemId);
        dispatch(getCart(syncedCart));
        trackEcommerceEvent('remove_from_cart', [cartItem]);
      } catch (error) {
        console.error('Failed to remove cart item:', error);
        dispatch(getCart(previousCart));
      }
    },
    [authenticated, checkout.buyNowItem, checkout.cart, checkoutSession.cart, dispatch, user?.id]
  );

  const onIncreaseQuantity = useCallback(
    async (identifier) => {
      if (checkout.buyNowItem && isCartItemMatch(checkout.buyNowItem, identifier)) {
        dispatch(increaseQuantity(identifier));
        trackEcommerceEvent('add_to_cart', [{ ...checkout.buyNowItem, quantity: 1 }]);
        return;
      }

      const previousCart = checkout.cart;
      const cartItem = findCartItem(previousCart, identifier);

      if (!cartItem) {
        return;
      }

      dispatch(increaseQuantity(identifier));

      if (!authenticated || !user?.id || !cartItem.cartItemId) {
        trackEcommerceEvent('add_to_cart', [{ ...cartItem, quantity: 1 }]);
        return;
      }

      try {
        const syncedCart = await updateCartItemQuantity(
          user.id,
          cartItem.cartItemId,
          cartItem.quantity + 1
        );
        dispatch(getCart(syncedCart));
        trackEcommerceEvent('add_to_cart', [{ ...cartItem, quantity: 1 }]);
      } catch (error) {
        console.error('Failed to increase cart quantity:', error);
        dispatch(getCart(previousCart));
      }
    },
    [authenticated, checkout.buyNowItem, checkout.cart, dispatch, user?.id]
  );

  const onDecreaseQuantity = useCallback(
    async (identifier) => {
      if (checkout.buyNowItem && isCartItemMatch(checkout.buyNowItem, identifier)) {
        dispatch(decreaseQuantity(identifier));
        trackEcommerceEvent('remove_from_cart', [{ ...checkout.buyNowItem, quantity: 1 }]);
        return;
      }

      const previousCart = checkout.cart;
      const cartItem = findCartItem(previousCart, identifier);

      if (!cartItem) {
        return;
      }

      dispatch(decreaseQuantity(identifier));

      if (!authenticated || !user?.id || !cartItem.cartItemId) {
        trackEcommerceEvent('remove_from_cart', [{ ...cartItem, quantity: 1 }]);
        return;
      }

      try {
        const syncedCart = await updateCartItemQuantity(
          user.id,
          cartItem.cartItemId,
          Math.max(1, cartItem.quantity - 1)
        );
        dispatch(getCart(syncedCart));
        trackEcommerceEvent('remove_from_cart', [{ ...cartItem, quantity: 1 }]);
      } catch (error) {
        console.error('Failed to decrease cart quantity:', error);
        dispatch(getCart(previousCart));
      }
    },
    [authenticated, checkout.buyNowItem, checkout.cart, dispatch, user?.id]
  );

  const onCreateBilling = useCallback(
    (address) => {
      dispatch(createBilling(address));
      trackEcommerceEvent('add_shipping_info', checkoutSession.eligibleCart, {
        value: checkoutSession.total,
        coupon: checkoutSession.appliedCoupon?.code,
        shipping_tier: 'Standard',
      });
      dispatch(
        gotoStep(
          normalizeStep(checkoutSession.activeStep + 1, {
            hasBilling: true,
          })
        )
      );
    },
    [
      checkoutSession.activeStep,
      checkoutSession.appliedCoupon?.code,
      checkoutSession.eligibleCart,
      checkoutSession.total,
      dispatch,
      normalizeStep,
    ]
  );

  const onResetBilling = useCallback(() => {
    dispatch(createBilling(null));
  }, [dispatch]);

  const onAddCart = useCallback(
    async (newProduct) => {
      const previousCart = checkout.cart;
      dispatch(addToCart(newProduct));

      if (!authenticated || !user?.id) {
        trackEcommerceEvent('add_to_cart', [newProduct]);
        return;
      }

      try {
        const syncedCart = await addCartItemRequest(user.id, newProduct);
        dispatch(getCart(syncedCart));
        trackEcommerceEvent('add_to_cart', [newProduct]);
      } catch (error) {
        console.error('Failed to add cart item:', error);
        dispatch(getCart(previousCart));
      }
    },
    [authenticated, checkout.cart, dispatch, user?.id]
  );

  const onBuyNow = useCallback(
    async (newProduct) => {
      dispatch(startBuyNow(newProduct));
    },
    [dispatch]
  );

  const onApplyDiscount = useCallback(
    (value) => {
      if (checkoutSession.cart.length) {
        dispatch(applyDiscount(value));
      }
    },
    [checkoutSession.cart.length, dispatch]
  );

  const onApplyCoupon = useCallback(
    async (code, paymentMethod) => {
      if (!checkoutSession.eligibleCart.length) {
        return;
      }

      const normalizedCode = String(code || '').trim();

      if (!normalizedCode) {
        setCouponError('Please enter a coupon code');
        return;
      }

      try {
        setCouponLoading(true);
        setCouponError('');

        const response = await axios.post(endpoints.coupons.validate, {
          code: normalizedCode,
          userId: user?.id,
          paymentMethod,
          cartItems: checkoutSession.eligibleCart.map((item) => ({
            productId: item.productId || item.id,
            variantId: item.variantId || undefined,
            quantity: item.quantity,
            price: item.price,
          })),
        });

        const coupon = response.data?.coupon || {};
        const discountAmount = Number(response.data?.discountAmount || 0);

        dispatch(
          applyCoupon({
            discount: discountAmount,
            coupon: {
              ...coupon,
              discountAmount,
            },
          })
        );

        // enqueueSnackbar(`${coupon.code || normalizedCode} applied successfully`, {
        //   variant: 'success',
        // });
      } catch (error) {
        const message =
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          error?.message ||
          'Failed to apply coupon';
        setCouponError(message);
        // enqueueSnackbar(message, { variant: 'error' });
      } finally {
        setCouponLoading(false);
      }
    },
    [checkoutSession.eligibleCart, dispatch, user?.id]
  );

  const onRemoveCoupon = useCallback(() => {
    dispatch(removeCoupon());
    setCouponError('');
    enqueueSnackbar('Coupon removed', { variant: 'info' });
  }, [dispatch, enqueueSnackbar]);

  const onApplyShipping = useCallback(
    (value) => {
      dispatch(applyShipping(value));
    },
    [dispatch]
  );

  const onResetCheckoutFlow = useCallback(() => {
    dispatch(resetCheckoutFlow());
  }, [dispatch]);

  const onResetAll = useCallback(() => {
    if (completed) {
      if (checkoutSession.isBuyNow) {
        dispatch(resetCheckoutFlow());
      } else {
        dispatch(resetCart());
      }
      router.replace(paths.product.root);
    }
  }, [checkoutSession.isBuyNow, completed, dispatch, router]);

  return {
    checkout,
    checkoutSession,
    completed,
    //
    onResetAll,
    onAddCart,
    onBuyNow,
    onGotoStep,
    onNextStep,
    onBackStep,
    onDeleteCart,
    onResetBilling,
    onCreateBilling,
    onApplyDiscount,
    onApplyCoupon,
    onRemoveCoupon,
    onApplyShipping,
    onIncreaseQuantity,
    onDecreaseQuantity,
    onResetCheckoutFlow,
    couponLoading,
    couponError,
  };
}
