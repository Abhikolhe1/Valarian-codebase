import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';
// utils
import axiosInstance, { endpoints, fetcher } from 'src/utils/axios';

// ----------------------------------------------------------------------

export function useGetProducts(filters = {}) {
  const params = new URLSearchParams();

  if (filters.search) params.append('search', filters.search);
  if (filters.status) params.append('status', filters.status);
  if (filters.isNewArrival !== undefined) params.append('isNewArrival', filters.isNewArrival);
  if (filters.isBestSeller !== undefined) params.append('isBestSeller', filters.isBestSeller);
  if (filters.isFeatured !== undefined) params.append('isFeatured', filters.isFeatured);
  if (filters.inStock !== undefined) params.append('inStock', filters.inStock);
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

export async function createProduct(productData) {
  const response = await axiosInstance.post(endpoints.products.create, productData);

  // Revalidate the products list
  mutate((key) => typeof key === 'string' && key.startsWith(endpoints.products.list));

  return response.data;
}

// ----------------------------------------------------------------------

export async function updateProduct(productId, productData) {
  const response = await axiosInstance.patch(endpoints.products.update(productId), productData);

  // Revalidate the product details and list
  mutate(endpoints.products.details(productId));
  mutate((key) => typeof key === 'string' && key.startsWith(endpoints.products.list));

  return response.data;
}

// ----------------------------------------------------------------------

export async function deleteProduct(productId) {
  await axiosInstance.delete(endpoints.products.delete(productId));

  // Revalidate the products list
  mutate((key) => typeof key === 'string' && key.startsWith(endpoints.products.list));
}

// ----------------------------------------------------------------------

export async function publishProduct(productId) {
  const response = await axiosInstance.patch(endpoints.products.publish(productId));

  // Revalidate the product details and list
  mutate(endpoints.products.details(productId));
  mutate((key) => typeof key === 'string' && key.startsWith(endpoints.products.list));

  return response.data;
}

// ----------------------------------------------------------------------

export async function archiveProduct(productId) {
  const response = await axiosInstance.patch(endpoints.products.archive(productId));

  // Revalidate the product details and list
  mutate(endpoints.products.details(productId));
  mutate((key) => typeof key === 'string' && key.startsWith(endpoints.products.list));

  return response.data;
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

// ----------------------------------------------------------------------

export async function createVariant(productId, variantData) {
  const response = await axiosInstance.post(endpoints.products.variants.create(productId), variantData);

  // Revalidate the product details, variants list, and products list
  mutate(endpoints.products.details(productId));
  mutate(endpoints.products.variants.list(productId));
  mutate((key) => typeof key === 'string' && key.startsWith(endpoints.products.list));

  return response.data;
}

// ----------------------------------------------------------------------

export async function updateVariant(productId, variantId, variantData) {
  const response = await axiosInstance.patch(
    endpoints.products.variants.update(productId, variantId),
    variantData
  );

  // Revalidate the product details, variant details, variants list, and products list
  mutate(endpoints.products.details(productId));
  mutate(endpoints.products.variants.details(productId, variantId));
  mutate(endpoints.products.variants.list(productId));
  mutate((key) => typeof key === 'string' && key.startsWith(endpoints.products.list));

  return response.data;
}

// ----------------------------------------------------------------------

export async function deleteVariant(productId, variantId) {
  const response = await axiosInstance.delete(endpoints.products.variants.delete(productId, variantId));

  // Revalidate the product details, variants list, and products list
  mutate(endpoints.products.details(productId));
  mutate(endpoints.products.variants.list(productId));
  mutate((key) => typeof key === 'string' && key.startsWith(endpoints.products.list));

  return response.data;
}

// ----------------------------------------------------------------------

export async function updateVariantStock(productId, variantId, stockQuantity) {
  const response = await axiosInstance.patch(
    endpoints.products.variants.updateStock(productId, variantId),
    { stockQuantity }
  );

  // Revalidate the product details, variant details, variants list, and products list
  mutate(endpoints.products.details(productId));
  mutate(endpoints.products.variants.details(productId, variantId));
  mutate(endpoints.products.variants.list(productId));
  mutate((key) => typeof key === 'string' && key.startsWith(endpoints.products.list));

  return response.data;
}

// ----------------------------------------------------------------------

export async function checkVariantAvailability(productId, variantId) {
  const response = await axiosInstance.get(
    endpoints.products.variants.availability(productId, variantId)
  );

  return response.data;
}
