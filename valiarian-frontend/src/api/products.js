import { useMemo } from 'react';
import useSWR from 'swr';
// utils
import { endpoints, fetcher } from 'src/utils/axios';

// ----------------------------------------------------------------------

/**
 * Hook to fetch new arrival products
 * @param {number} limit - Maximum number of products to fetch (default: 10)
 * @returns {Object} - { products, total, isLoading, error }
 */
export function useNewArrivals(limit = 10) {
  const URL = `${endpoints.products.newArrivals}?limit=${limit}`;

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
  const URL = `${endpoints.products.bestSellers}?limit=${limit}`;

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
  const URL = `${endpoints.products.featured}?limit=${limit}`;

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
