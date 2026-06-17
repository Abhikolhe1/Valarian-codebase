import useSWR, { preload } from 'swr';
import { useMemo } from 'react';
// utils
import { endpoints, fetcher } from 'src/utils/axios';

// ----------------------------------------------------------------------

export const getCategoriesKey = () => {
  const params = new URLSearchParams();
  params.append('filter', JSON.stringify({ include: [{ relation: 'parentCategory' }] }));

  return `${endpoints.category.list}?${params.toString()}`;
};

export const getCategoryTreeKey = () => endpoints.category.tree;

export function prefetchCategoryMenuData() {
  return Promise.allSettled([
    preload(getCategoriesKey(), fetcher),
    preload(getCategoryTreeKey(), fetcher),
  ]);
}

export function useGetCategories(enabled = true) {
  const URL = enabled ? getCategoriesKey() : null;

  const { data, isLoading, error, isValidating, mutate } = useSWR(URL, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60 * 1000,
  });

  const memoizedValue = useMemo(
    () => ({
      categories: data || [],
      categoriesLoading: isLoading,
      categoriesError: error,
      categoriesValidating: isValidating,
      categoriesEmpty: !isLoading && !data?.length,
      mutate,
    }),
    [data, error, isLoading, isValidating, mutate]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

export function useGetCategoryTree(enabled = true) {
  const URL = enabled ? getCategoryTreeKey() : null;

  const { data, isLoading, error, isValidating, mutate } = useSWR(URL, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60 * 1000,
  });

  const memoizedValue = useMemo(
    () => ({
      categoryTree: data || [],
      treeLoading: isLoading,
      treeError: error,
      treeValidating: isValidating,
      mutate,
    }),
    [data, error, isLoading, isValidating, mutate]
  );

  return memoizedValue;
}
