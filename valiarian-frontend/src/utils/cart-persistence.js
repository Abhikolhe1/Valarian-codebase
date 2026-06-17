// ----------------------------------------------------------------------
// Cart Persistence Utilities for Guest Users
// Handles saving and loading cart data from localStorage
// ----------------------------------------------------------------------

const GUEST_CART_KEY = 'guestCart';

/**
 * Save cart to localStorage for guest users
 * @param {Array} cart - Array of cart items
 * @returns {boolean} - Success status
 */
export const saveCartToLocalStorage = (cart) => {
  try {
    if (!Array.isArray(cart)) {
      console.error('saveCartToLocalStorage: cart must be an array');
      return false;
    }

    const cartData = JSON.stringify(cart);
    localStorage.setItem(GUEST_CART_KEY, cartData);
    return true;
  } catch (error) {
    console.error('Error saving cart to localStorage:', error);
    return false;
  }
};

/**
 * Load cart from localStorage for guest users
 * @returns {Array} - Array of cart items or empty array if none found
 */
export const loadCartFromLocalStorage = () => {
  try {
    const cartData = localStorage.getItem(GUEST_CART_KEY);

    if (!cartData) {
      return [];
    }

    const cart = JSON.parse(cartData);

    // Validate cart structure
    if (!Array.isArray(cart)) {
      console.error('loadCartFromLocalStorage: Invalid cart data in localStorage');
      clearCartFromLocalStorage();
      return [];
    }

    return cart;
  } catch (error) {
    console.error('Error loading cart from localStorage:', error);
    clearCartFromLocalStorage();
    return [];
  }
};

/**
 * Clear cart from localStorage
 * @returns {boolean} - Success status
 */
export const clearCartFromLocalStorage = () => {
  try {
    localStorage.removeItem(GUEST_CART_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing cart from localStorage:', error);
    return false;
  }
};

/**
 * Check if guest cart exists in localStorage
 * @returns {boolean} - True if cart exists
 */
export const hasGuestCart = () => {
  try {
    const cartData = localStorage.getItem(GUEST_CART_KEY);
    return cartData !== null && cartData !== undefined;
  } catch (error) {
    console.error('Error checking for guest cart:', error);
    return false;
  }
};

/**
 * Get guest cart item count from localStorage
 * @returns {number} - Total number of items in cart
 */
export const getGuestCartItemCount = () => {
  try {
    const cart = loadCartFromLocalStorage();
    return cart.reduce((total, item) => total + (item.quantity || 0), 0);
  } catch (error) {
    console.error('Error getting guest cart item count:', error);
    return 0;
  }
};
