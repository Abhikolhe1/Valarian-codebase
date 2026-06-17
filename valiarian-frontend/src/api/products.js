import { useMemo } from 'react';
import useSWR, { preload } from 'swr';
// utils
import { endpoints, fetcher } from 'src/utils/axios';

// ----------------------------------------------------------------------

export const getNewArrivalsKey = (limit = 10) => `${endpoints.products.newArrivals}?limit=${limit}`;

export const getBestSellersKey = (limit = 10) => `${endpoints.products.bestSellers}?limit=${limit}`;

export const getFeaturedProductsKey = (limit = 10) => `${endpoints.products.featured}?limit=${limit}`;

export function prefetchHomeProductCollections(limit = 10) {
  const requests = [
    preload(getNewArrivalsKey(limit), fetcher),
    preload(getBestSellersKey(limit), fetcher),
  ];

  return Promise.allSettled(requests);
}

/**
 * Hook to fetch new arrival products
 * @param {number} limit - Maximum number of products to fetch (default: 10)
 * @returns {Object} - { products, total, isLoading, error }
 */
export function useNewArrivals(limit = 10) {
  const URL = getNewArrivalsKey(limit);

  const { data, error, isLoading, isValidating } = useSWR(URL, fetcher);

  const memoizedValue = useMemo(
    () => ({
      products: data?.products || [],
      total: data?.total || 0,
      isLoading,
      error,
      isValidating,
    }),
    [data?.products, data?.total, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

/**
 * Hook to fetch best seller products
 * @param {number} limit - Maximum number of products to fetch (default: 10)
 * @returns {Object} - { products, total, isLoading, error }
 */
export function useBestSellers(limit = 10) {
  const URL = getBestSellersKey(limit);

  const { data, error, isLoading, isValidating } = useSWR(URL, fetcher);

  const memoizedValue = useMemo(
    () => ({
      products: data?.products || [],
      total: data?.total || 0,
      isLoading,
      error,
      isValidating,
    }),
    [data?.products, data?.total, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

/**
 * Hook to fetch featured products
 * @param {number} limit - Maximum number of products to fetch (default: 10)
 * @returns {Object} - { products, total, isLoading, error }
 */
export function useFeaturedProducts(limit = 10) {
  const URL = getFeaturedProductsKey(limit);

  const { data, error, isLoading, isValidating } = useSWR(URL, fetcher);

  const memoizedValue = useMemo(
    () => ({
      products: data?.products || [],
      total: data?.total || 0,
      isLoading,
      error,
      isValidating,
    }),
    [data?.products, data?.total, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

/**
 * Hook to fetch a single product by slug
 * @param {string} slug - Product slug
 * @returns {Object} - { product, isLoading, error }
 */
export function useProduct(slug) {
  const URL = slug ? endpoints.products.details(slug) : null;

  const { data, error, isLoading, isValidating } = useSWR(URL, fetcher);

  const memoizedValue = useMemo(
    () => ({
      product: data?.product || null,
      isLoading,
      error,
      isValidating,
    }),
    [data?.product, error, isLoading, isValidating]
  );

  return memoizedValue;
}
