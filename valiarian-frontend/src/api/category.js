import useSWR from 'swr';
import { useMemo } from 'react';
// utils
import { endpoints, fetcher } from 'src/utils/axios';

// ----------------------------------------------------------------------

export function useGetCategories() {
  const params = new URLSearchParams();
  params.append('filter', JSON.stringify({ include: [{ relation: 'parent' }] }));

  const URL = `${endpoints.category.list}?${params.toString()}`;

  const { data, isLoading, error, isValidating, mutate } = useSWR(URL, fetcher);

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

export function useGetCategoryTree() {
  const URL = endpoints.category.tree;

  const { data, isLoading, error, isValidating, mutate } = useSWR(URL, fetcher);

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
