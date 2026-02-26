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
  // Execute the action first
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

  // Check if this is a cart action
  if (cartActions.includes(action.type)) {
    const state = store.getState();
    const { cart } = state.checkout;

    // Check if user is authenticated (you may need to adjust this based on your auth structure)
    // For now, we'll persist for all users and let the app logic handle auth-based sync
    try {
      if (action.type === 'checkout/resetCart') {
        // Clear localStorage when cart is reset
        clearCartFromLocalStorage();
      } else {
        // Save cart to localStorage
        saveCartToLocalStorage(cart);
      }
    } catch (error) {
      console.error('Cart persistence middleware error:', error);
    }
  }

  return result;
};
