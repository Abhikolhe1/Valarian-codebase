import axios from 'src/utils/axios';
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
    // Step 1: Get guest cart from localStorage
    const guestCart = loadCartFromLocalStorage();

    // Step 2: Fetch user cart from backend
    let userCart = [];
    try {
      const response = await axios.get(`/api/cart/${userId}`);
      userCart = response.data.cart?.items || [];
    } catch (error) {
      console.error('Error fetching user cart:', error);
      // Continue with empty user cart if fetch fails
      userCart = [];
    }

    // Step 3: Determine final cart
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

    // Step 4: Clear guest cart from localStorage
    clearCartFromLocalStorage();

    // Step 5: Update Redux state
    dispatch(getCart(finalCart));

    // Step 6: Show notification if carts were merged
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
      // Authenticated user - load from backend
      try {
        const response = await axios.get(`/api/cart/${userId}`);
        const userCart = response.data.cart?.items || [];
        dispatch(getCart(userCart));
      } catch (error) {
        console.error('Error loading user cart:', error);
        // Fall back to empty cart
        dispatch(getCart([]));
      }
    } else {
      // Guest user - load from localStorage
      const guestCart = loadCartFromLocalStorage();
      dispatch(getCart(guestCart));
    }
  } catch (error) {
    console.error('Error in loadCartOnInit:', error);
    // Ensure cart is at least initialized to empty array
    dispatch(getCart([]));
  }
};
