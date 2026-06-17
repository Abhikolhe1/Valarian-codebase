import { clearCartFromLocalStorage, saveCartToLocalStorage } from 'src/utils/cart-persistence';

// ----------------------------------------------------------------------
// Redux Middleware for Cart Persistence
// Automatically saves cart to localStorage for guest users
// ----------------------------------------------------------------------

/**
 * Middleware to persist cart changes to localStorage for guest users
 * Only persists if user is not authenticated
 */
export const cartPersistenceMiddleware = (store) => (next) => (action) => {
  const result = next(action);

  // Cart actions that should trigger persistence
  const cartActions = [
    'checkout/addToCart',
    'checkout/deleteCart',
    'checkout/increaseQuantity',
    'checkout/decreaseQuantity',
    'checkout/getCart',
    'checkout/resetCart',
  ];

  if (cartActions.includes(action.type)) {
    const state = store.getState();
    const { cart } = state.checkout;
    const isAuthenticated =
      typeof window !== 'undefined' && Boolean(localStorage.getItem('accessToken'));

    try {
      if (action.type === 'checkout/resetCart') {
        clearCartFromLocalStorage();
      } else if (!isAuthenticated) {
        saveCartToLocalStorage(cart);
      }
    } catch (error) {
      console.error('Cart persistence middleware error:', error);
    }
  }

  return result;
};
