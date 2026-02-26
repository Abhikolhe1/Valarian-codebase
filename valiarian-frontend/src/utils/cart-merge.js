import uniq from 'lodash/uniq';

// ----------------------------------------------------------------------
// Cart Merge Utilities
// Handles merging guest cart with user cart after authentication
// ----------------------------------------------------------------------

/**
 * Merge guest cart with user cart
 * @param {Array} guestCart - Guest cart items from localStorage
 * @param {Array} userCart - User cart items from backend
 * @returns {Array} - Merged cart array
 */
export const mergeGuestCart = (guestCart, userCart) => {
  // Validate inputs
  if (!Array.isArray(guestCart)) {
    console.error('mergeGuestCart: guestCart must be an array');
    return Array.isArray(userCart) ? userCart : [];
  }

  if (!Array.isArray(userCart)) {
    console.error('mergeGuestCart: userCart must be an array');
    return guestCart;
  }

  // If guest cart is empty, return user cart
  if (guestCart.length === 0) {
    return userCart;
  }

  // If user cart is empty, return guest cart
  if (userCart.length === 0) {
    return guestCart;
  }

  // Start with user cart as base
  const mergedCart = [...userCart];

  // Process each guest cart item
  guestCart.forEach((guestItem) => {
    // Validate guest item
    if (!guestItem || !guestItem.id) {
      console.warn('mergeGuestCart: Invalid guest cart item', guestItem);
      return;
    }

    // Check if item exists in user cart
    const existingIndex = mergedCart.findIndex((item) => item.id === guestItem.id);

    if (existingIndex >= 0) {
      // Item exists in both carts - merge quantities and variants
      const existingItem = mergedCart[existingIndex];

      // Sum quantities
      mergedCart[existingIndex] = {
        ...existingItem,
        quantity: existingItem.quantity + guestItem.quantity,
        // Merge colors array (remove duplicates)
        colors: uniq([...(existingItem.colors || []), ...(guestItem.colors || [])]),
      };
    } else {
      // Item only in guest cart - add to merged cart
      mergedCart.push(guestItem);
    }
  });

  return mergedCart;
};

/**
 * Calculate cart totals after merge
 * @param {Array} cart - Merged cart array
 * @returns {Object} - Object with totalItems and subTotal
 */
export const calculateCartTotals = (cart) => {
  if (!Array.isArray(cart)) {
    return { totalItems: 0, subTotal: 0 };
  }

  const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const subTotal = cart.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);

  return { totalItems, subTotal };
};

/**
 * Validate merged cart (ensure no duplicates and positive quantities)
 * @param {Array} cart - Cart array to validate
 * @returns {boolean} - True if valid
 */
export const validateMergedCart = (cart) => {
  if (!Array.isArray(cart)) {
    return false;
  }

  // Check for duplicate product IDs
  const ids = cart.map((item) => item.id);
  const uniqueIds = new Set(ids);

  if (ids.length !== uniqueIds.size) {
    console.error('validateMergedCart: Duplicate product IDs found');
    return false;
  }

  // Check for positive quantities
  const hasInvalidQuantity = cart.some((item) => !item.quantity || item.quantity <= 0);

  if (hasInvalidQuantity) {
    console.error('validateMergedCart: Invalid quantities found');
    return false;
  }

  return true;
};
