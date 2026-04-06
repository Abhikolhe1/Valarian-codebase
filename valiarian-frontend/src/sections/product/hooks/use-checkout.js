import { useCallback, useState } from 'react';
// auth
import { useAuthContext } from 'src/auth/hooks';
import { useSnackbar } from 'src/components/snackbar';
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
  const sessionTotals = calculateCheckoutTotals(
    checkoutItems,
    checkout.discount,
    checkout.shipping
  );
  const checkoutSession = {
    ...checkout,
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
    dispatch(gotoStep(normalizeStep(checkoutSession.activeStep + 1)));
  }, [checkoutSession.activeStep, dispatch, normalizeStep]);

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
      if (checkout.buyNowItem && isCartItemMatch(checkout.buyNowItem, identifier)) {
        dispatch(deleteCart(identifier));
        return;
      }

      const previousCart = checkout.cart;
      dispatch(deleteCart(identifier));

      if (!authenticated || !user?.id) {
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
      } catch (error) {
        console.error('Failed to remove cart item:', error);
        dispatch(getCart(previousCart));
      }
    },
    [authenticated, checkout.buyNowItem, checkout.cart, dispatch, user?.id]
  );

  const onIncreaseQuantity = useCallback(
    async (identifier) => {
      if (checkout.buyNowItem && isCartItemMatch(checkout.buyNowItem, identifier)) {
        dispatch(increaseQuantity(identifier));
        return;
      }

      const previousCart = checkout.cart;
      const cartItem = findCartItem(previousCart, identifier);

      if (!cartItem) {
        return;
      }

      dispatch(increaseQuantity(identifier));

      if (!authenticated || !user?.id || !cartItem.cartItemId) {
        return;
      }

      try {
        const syncedCart = await updateCartItemQuantity(
          user.id,
          cartItem.cartItemId,
          cartItem.quantity + 1
        );
        dispatch(getCart(syncedCart));
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
        return;
      }

      const previousCart = checkout.cart;
      const cartItem = findCartItem(previousCart, identifier);

      if (!cartItem) {
        return;
      }

      dispatch(decreaseQuantity(identifier));

      if (!authenticated || !user?.id || !cartItem.cartItemId) {
        return;
      }

      try {
        const syncedCart = await updateCartItemQuantity(
          user.id,
          cartItem.cartItemId,
          Math.max(1, cartItem.quantity - 1)
        );
        dispatch(getCart(syncedCart));
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
      dispatch(
        gotoStep(
          normalizeStep(checkoutSession.activeStep + 1, {
            hasBilling: true,
          })
        )
      );
    },
    [checkoutSession.activeStep, dispatch, normalizeStep]
  );

  const onResetBilling = useCallback(() => {
    dispatch(createBilling(null));
  }, [dispatch]);

  const onAddCart = useCallback(
    async (newProduct) => {
      const previousCart = checkout.cart;
      dispatch(addToCart(newProduct));

      if (!authenticated || !user?.id) {
        return;
      }

      try {
        const syncedCart = await addCartItemRequest(user.id, newProduct);
        dispatch(getCart(syncedCart));
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
