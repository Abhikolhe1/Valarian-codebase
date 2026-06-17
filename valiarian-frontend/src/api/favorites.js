import { useMemo } from 'react';
import useSWR from 'swr';
// utils
import axios, { endpoints, fetcher } from 'src/utils/axios';

// ----------------------------------------------------------------------

/**
 * Hook to fetch user favorites from backend
 * @param {string} userId - User ID
 * @returns {object} - Favorites data and loading states
 */
export function useGetFavorites(userId) {
  const URL = userId ? endpoints.favorites.get(userId) : null;

  const { data, isLoading, error, isValidating } = useSWR(URL, fetcher);

  const memoizedValue = useMemo(
    () => ({
      favorites: data?.favorites || [],
      favoritesLoading: isLoading,
      favoritesError: error,
      favoritesValidating: isValidating,
      favoritesEmpty: !isLoading && !data?.favorites?.length,
    }),
    [data?.favorites, error, isLoading, isValidating]
  );

  return memoizedValue;
}

export async function addFavorite(productId) {
  const response = await axios.post(endpoints.favorites.add, { productId });
  return response.data;
}

export async function removeFavorite(productId) {
  const response = await axios.delete(endpoints.favorites.remove(productId));
  return response.data;
}

