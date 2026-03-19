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
  backStep,
  createBilling,
  decreaseQuantity,
  deleteCart,
  getCart,
  gotoStep,
  increaseQuantity,
  nextStep,
  resetCart,
} from 'src/redux/slices/checkout';
import { useDispatch, useSelector } from 'src/redux/store';
// utils
import { findCartItem } from 'src/utils/cart-utils';
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

  const completed = checkout.activeStep === PRODUCT_CHECKOUT_STEPS.length;

  const onNextStep = useCallback(() => {
    dispatch(nextStep());
  }, [dispatch]);

  const onBackStep = useCallback(() => {
    dispatch(backStep());
  }, [dispatch]);

  const onGotoStep = useCallback(
    (step) => {
      dispatch(gotoStep(step));
    },
    [dispatch]
  );

  const onDeleteCart = useCallback(
    async (identifier) => {
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
    [authenticated, checkout.cart, dispatch, user?.id]
  );

  const onIncreaseQuantity = useCallback(
    async (identifier) => {
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
        const syncedCart = await updateCartItemQuantity(user.id, cartItem.cartItemId, cartItem.quantity + 1);
        dispatch(getCart(syncedCart));
      } catch (error) {
        console.error('Failed to increase cart quantity:', error);
        dispatch(getCart(previousCart));
      }
    },
    [authenticated, checkout.cart, dispatch, user?.id]
  );

  const onDecreaseQuantity = useCallback(
    async (identifier) => {
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
    [authenticated, checkout.cart, dispatch, user?.id]
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

  const onApplyDiscount = useCallback(
    (value) => {
      if (checkout.cart.length) {
        dispatch(applyDiscount(value));
      }
    },
    [checkout.cart.length, dispatch]
  );

  const onApplyShipping = useCallback(
    (value) => {
      dispatch(applyShipping(value));
    },
    [dispatch]
  );

  const onResetAll = useCallback(() => {
    if (completed) {
      dispatch(resetCart());
      router.replace(paths.product.root);
    }
  }, [completed, dispatch, router]);

  return {
    checkout,
    completed,
    //
    onResetAll,
    onAddCart,
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
  };
}
