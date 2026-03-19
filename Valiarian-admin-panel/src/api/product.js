import { useMemo } from 'react';
import useSWR from 'swr';
// utils
import { endpoints, fetcher } from 'src/utils/axios';

// ----------------------------------------------------------------------

export function useGetProducts(filters = {}) {
  const params = new URLSearchParams();

  if (filters.search) params.append('search', filters.search);
  if (filters.status) params.append('status', filters.status);
  if (filters.isNewArrival !== undefined) params.append('isNewArrival', filters.isNewArrival);
  if (filters.isBestSeller !== undefined) params.append('isBestSeller', filters.isBestSeller);
  if (filters.isFeatured !== undefined) params.append('isFeatured', filters.isFeatured);
  if (filters.inStock !== undefined) params.append('inStock', filters.inStock);
  if (filters.categoryId) params.append('categoryId', filters.categoryId);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.offset) params.append('offset', filters.offset);

  const queryString = params.toString();
  const URL = queryString ? `${endpoints.products.list}?${queryString}` : endpoints.products.list;

  const { data, isLoading, error, isValidating } = useSWR(URL, fetcher);

  const memoizedValue = useMemo(
    () => ({
      products: data?.products || [],
      total: data?.total || 0,
      productsLoading: isLoading,
      productsError: error,
      productsValidating: isValidating,
      productsEmpty: !isLoading && !data?.products?.length,
    }),
    [data?.products, data?.total, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

export function useGetProduct(productId) {
  const URL = productId ? endpoints.products.details(productId) : null;

  const { data, isLoading, error, isValidating } = useSWR(URL, fetcher);

  const memoizedValue = useMemo(
    () => ({
      product: data,
      productLoading: isLoading,
      productError: error,
      productValidating: isValidating,
    }),
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

export function useSearchProducts(query) {
  const params = new URLSearchParams();

  if (query) params.append('search', query);
  params.append('status', 'published'); // Only search published products

  const queryString = params.toString();
  const URL = query ? `${endpoints.products.list}?${queryString}` : null;

  const { data, isLoading, error, isValidating } = useSWR(URL, fetcher, {
    keepPreviousData: true,
  });

  const memoizedValue = useMemo(
    () => ({
      searchResults: data?.products || [],
      searchLoading: isLoading,
      searchError: error,
      searchValidating: isValidating,
      searchEmpty: !isLoading && !data?.products?.length,
    }),
    [data?.products, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------
// VARIANT API HOOKS
// ----------------------------------------------------------------------

export function useGetVariants(productId) {
  const URL = productId ? endpoints.products.variants.list(productId) : null;

  const { data, isLoading, error, isValidating } = useSWR(URL, fetcher);

  const memoizedValue = useMemo(
    () => ({
      variants: data || [],
      variantsLoading: isLoading,
      variantsError: error,
      variantsValidating: isValidating,
      variantsEmpty: !isLoading && !data?.length,
    }),
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

export function useGetVariant(productId, variantId) {
  const URL = productId && variantId ? endpoints.products.variants.details(productId, variantId) : null;

  const { data, isLoading, error, isValidating } = useSWR(URL, fetcher);

  const memoizedValue = useMemo(
    () => ({
      variant: data,
      variantLoading: isLoading,
      variantError: error,
      variantValidating: isValidating,
    }),
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}
