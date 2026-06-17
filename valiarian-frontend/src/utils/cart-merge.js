import uniq from 'lodash/uniq';
import { normalizeCart } from './cart-utils';

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

  const normalizedGuestCart = normalizeCart(guestCart);
  const normalizedUserCart = normalizeCart(userCart);

  if (normalizedGuestCart.length === 0) {
    return normalizedUserCart;
  }

  if (normalizedUserCart.length === 0) {
    return normalizedGuestCart;
  }

  const mergedMap = new Map(normalizedUserCart.map((item) => [item.key, item]));

  normalizedGuestCart.forEach((guestItem) => {
    const existingItem = mergedMap.get(guestItem.key);

    if (existingItem) {
      mergedMap.set(guestItem.key, {
        ...existingItem,
        quantity: existingItem.quantity + guestItem.quantity,
        colors: uniq([...(existingItem.colors || []), ...(guestItem.colors || [])]),
      });
      return;
    }

    mergedMap.set(guestItem.key, guestItem);
  });

  return Array.from(mergedMap.values());
};

/**
 * Calculate cart totals after merge
 * @param {Array} cart - Merged cart array
 * @returns {Object} - Object with totalItems and subTotal
 */
export const calculateCartTotals = (cart) => {
  const normalizedCart = normalizeCart(cart);

  if (!normalizedCart.length) {
    return { totalItems: 0, subTotal: 0 };
  }

  const totalItems = normalizedCart.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const subTotal = normalizedCart.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);

  return { totalItems, subTotal };
};

/**
 * Validate merged cart (ensure no duplicates and positive quantities)
 * @param {Array} cart - Cart array to validate
 * @returns {boolean} - True if valid
 */
export const validateMergedCart = (cart) => {
  const normalizedCart = normalizeCart(cart);

  if (!normalizedCart.length && Array.isArray(cart) && cart.length > 0) {
    return false;
  }

  const keys = normalizedCart.map((item) => item.key);
  const uniqueKeys = new Set(keys);

  if (keys.length !== uniqueKeys.size) {
    console.error('validateMergedCart: Duplicate cart items found');
    return false;
  }

  const hasInvalidQuantity = normalizedCart.some((item) => !item.quantity || item.quantity <= 0);

  if (hasInvalidQuantity) {
    console.error('validateMergedCart: Invalid quantities found');
    return false;
  }

  return true;
};
