import { useMemo } from 'react';
import useSWR from 'swr';
// utils
import { endpoints, fetcher } from 'src/utils/axios';

// ----------------------------------------------------------------------

/**
 * Hook to fetch user cart from backend
 * @param {string} userId - User ID
 * @returns {object} - Cart data and loading states
 */
export function useGetCart(userId) {
  const URL = userId ? endpoints.cart.get(userId) : null;

  const { data, isLoading, error, isValidating } = useSWR(URL, fetcher);

  const memoizedValue = useMemo(
    () => ({
      cart: data?.cart || [],
      cartLoading: isLoading,
      cartError: error,
      cartValidating: isValidating,
      cartEmpty: !isLoading && !data?.cart?.length,
    }),
    [data?.cart, error, isLoading, isValidating]
  );

  return memoizedValue;
}

