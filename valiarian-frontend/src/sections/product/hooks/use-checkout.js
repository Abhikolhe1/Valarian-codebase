import { useCallback } from 'react';
// auth
import { useAuthContext } from 'src/auth/hooks';
// api
import {
  addCartItem as addCartItemRequest,
  removeCartItem as removeCartItemRequest,
  updateCartItemQuantity,
} from 'src/api/cart';
// redux
import {
  addToCart,
  applyDiscount,
  applyShipping,
  createBilling,
  decreaseQuantity,
  deleteCart,
  getCart,
  gotoStep,
  increaseQuantity,
  nextStep,
  resetCart,
  resetCheckoutFlow,
  startBuyNow,
} from 'src/redux/slices/checkout';
import { useDispatch, useSelector } from 'src/redux/store';
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

  const router = useRouter();

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
    subTotal: sessionTotals.subTotal,
    total: sessionTotals.total,
    totalItems: sessionTotals.totalItems,
    isBuyNow: Boolean(checkout.buyNowItem),
  };

  const completed = checkoutSession.activeStep === PRODUCT_CHECKOUT_STEPS.length;

  const normalizeStep = useCallback(
    (step) => {
      const safeStep = Math.max(0, Math.min(step, PRODUCT_CHECKOUT_STEPS.length));

      if (safeStep <= 1) {
        return safeStep;
      }

      if (!checkoutSession.billing) {
        return 1;
      }

      if (authenticated && safeStep === 2) {
        return 3;
      }

      if (!authenticated && safeStep > 2) {
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
      dispatch(nextStep());
    },
    [dispatch]
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
      dispatch(resetCart());
      router.replace(paths.product.root);
    }
  }, [completed, dispatch, router]);

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
    onApplyShipping,
    onIncreaseQuantity,
    onDecreaseQuantity,
    onResetCheckoutFlow,
  };
}
