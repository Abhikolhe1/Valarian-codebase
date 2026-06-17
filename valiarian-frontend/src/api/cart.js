import { useMemo } from 'react';
import useSWR from 'swr';
// utils
import axiosInstance, { endpoints, fetcher } from 'src/utils/axios';
import { getCartItemProductId, normalizeCart } from 'src/utils/cart-utils';

// ----------------------------------------------------------------------

export async function fetchUserCart(userId) {
  const response = await axiosInstance.get(endpoints.cart.get(userId));
  return normalizeCart(response.data.cart?.items || []);
}

export async function addCartItem(userId, cartItem) {
  await axiosInstance.post(`/api/cart/${userId}/items`, {
    productId: getCartItemProductId(cartItem),
    variantId: cartItem.variantId || undefined,
    quantity: cartItem.quantity || 1,
  });

  return fetchUserCart(userId);
}

export async function updateCartItemQuantity(userId, itemId, quantity) {
  await axiosInstance.patch(`/api/cart/${userId}/items/${itemId}`, { quantity });
  return fetchUserCart(userId);
}

export async function removeCartItem(userId, itemId) {
  await axiosInstance.delete(`/api/cart/${userId}/items/${itemId}`);
  return fetchUserCart(userId);
}

export async function clearUserCart(userId) {
  await axiosInstance.delete(`/api/cart/${userId}`);
  return [];
}

export async function syncUserCart(userId, cartItems = []) {
  await clearUserCart(userId);

  await Promise.all(
    cartItems.map((cartItem) =>
      axiosInstance.post(`/api/cart/${userId}/items`, {
        productId: getCartItemProductId(cartItem),
        variantId: cartItem.variantId || undefined,
        quantity: cartItem.quantity || 1,
      })
    )
  );

  return fetchUserCart(userId);
}

/**
 * Hook to fetch user cart from backend
 * @param {string} userId - User ID
 * @returns {object} - Cart data and loading states
 */
export function useGetCart(userId) {
  const URL = userId ? endpoints.cart.get(userId) : null;

  const { data, isLoading, error, isValidating } = useSWR(URL, fetcher);
  const normalizedCart = normalizeCart(data?.cart?.items || data?.cart || []);

  const memoizedValue = useMemo(
    () => ({
      cart: normalizedCart,
      cartLoading: isLoading,
      cartError: error,
      cartValidating: isValidating,
      cartEmpty: !isLoading && !normalizedCart.length,
    }),
    [error, isLoading, isValidating, normalizedCart]
  );

  return memoizedValue;
}

