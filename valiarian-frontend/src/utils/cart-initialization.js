import { fetchUserCart, syncUserCart } from 'src/api/cart';
import { mergeGuestCart, validateMergedCart } from './cart-merge';
import { clearCartFromLocalStorage, loadCartFromLocalStorage } from './cart-persistence';

// ----------------------------------------------------------------------
// Cart Initialization Utilities
// Handles cart loading and merging on app start and login
// ----------------------------------------------------------------------

/**
 * Load cart on user login
 * Merges guest cart with user cart and syncs to backend
 * @param {string} userId - User ID
 * @param {Function} dispatch - Redux dispatch function
 * @param {Function} getCart - Redux getCart action
 * @returns {Promise<void>}
 */
export const loadCartOnLogin = async (userId, dispatch, getCart) => {
  try {
    const guestCart = loadCartFromLocalStorage();

    let userCart = [];
    try {
      userCart = await fetchUserCart(userId);
    } catch (error) {
      console.error('Error fetching user cart:', error);
      userCart = [];
    }

    let finalCart = [];

    if (guestCart.length > 0 && userCart.length > 0) {
      // Both carts exist - merge them
      finalCart = mergeGuestCart(guestCart, userCart);

      // Validate merged cart
      if (!validateMergedCart(finalCart)) {
        console.error('Merged cart validation failed, using user cart');
        finalCart = userCart;
      }
    } else if (guestCart.length > 0) {
      // Only guest cart exists
      finalCart = guestCart;
    } else {
      // Only user cart exists or both empty
      finalCart = userCart;
    }

    if (guestCart.length > 0) {
      try {
        finalCart = await syncUserCart(userId, finalCart);
      } catch (error) {
        console.error('Error syncing merged cart to backend:', error);
      }
    }

    clearCartFromLocalStorage();
    dispatch(getCart(finalCart));

    if (guestCart.length > 0 && userCart.length > 0) {
      return { merged: true, itemCount: finalCart.length };
    }

    return { merged: false, itemCount: finalCart.length };
  } catch (error) {
    console.error('Error in loadCartOnLogin:', error);
    // Fallback to empty cart
    dispatch(getCart([]));
    return { merged: false, itemCount: 0 };
  }
};

/**
 * Load cart on app initialization
 * Loads from localStorage for guests or backend for authenticated users
 * @param {boolean} authenticated - Whether user is authenticated
 * @param {string|null} userId - User ID (null if not authenticated)
 * @param {Function} dispatch - Redux dispatch function
 * @param {Function} getCart - Redux getCart action
 * @returns {Promise<void>}
 */
export const loadCartOnInit = async (authenticated, userId, dispatch, getCart) => {
  try {
    if (authenticated && userId) {
      try {
        const userCart = await fetchUserCart(userId);
        dispatch(getCart(userCart));
      } catch (error) {
        console.error('Error loading user cart:', error);
        dispatch(getCart([]));
      }
    } else {
      const guestCart = loadCartFromLocalStorage();
      dispatch(getCart(guestCart));
    }
  } catch (error) {
    console.error('Error in loadCartOnInit:', error);
    dispatch(getCart([]));
  }
};
