import useSWR from 'swr';
import { useMemo } from 'react';
// utils
import { endpoints, fetcher } from 'src/utils/axios';

// ----------------------------------------------------------------------

export function useGetCategories(enabled = true) {
  const params = new URLSearchParams();
  params.append('filter', JSON.stringify({ include: [{ relation: 'parentCategory' }] }));

  const URL = enabled ? `${endpoints.category.list}?${params.toString()}` : '';

  const { data, isLoading, error, isValidating, mutate } = useSWR(URL, fetcher);

  const memoizedValue = useMemo(
    () => ({
      categories: (data || []).map((category) => ({
        ...category,
        parent: category.parent || category.parentCategory || null,
        parentId: category.parentId ?? category.parentCategoryId ?? '',
      })),
      categoriesLoading: isLoading,
      categoriesError: error,
      categoriesValidating: isValidating,
      categoriesEmpty: enabled && !isLoading && !data?.length,
      mutate,
    }),
    [data, enabled, error, isLoading, isValidating, mutate]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

export function useGetCategory(categoryId) {
  const params = new URLSearchParams();
  params.append('filter', JSON.stringify({ include: [{ relation: 'parentCategory' }] }));

  const URL = categoryId
    ? `${endpoints.category.details}/${categoryId}?${params.toString()}`
    : '';

  const { data, isLoading, error, isValidating } = useSWR(URL, fetcher);

  const memoizedValue = useMemo(
    () => ({
      category: data
        ? {
            ...data,
            parent: data.parent || data.parentCategory || null,
            parentId: data.parentId ?? data.parentCategoryId ?? '',
          }
        : data,
      categoryLoading: isLoading,
      categoryError: error,
      categoryValidating: isValidating,
    }),
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

export function useGetParentCategories(enabled = true) {
  const URL = enabled ? endpoints.parentCategory.list : '';

  const { data, isLoading, error, isValidating, mutate } = useSWR(URL, fetcher);

  const memoizedValue = useMemo(
    () => ({
      parentCategories: data || [],
      parentCategoriesLoading: isLoading,
      parentCategoriesError: error,
      parentCategoriesValidating: isValidating,
      parentCategoriesEmpty: enabled && !isLoading && !data?.length,
      mutate,
    }),
    [data, enabled, error, isLoading, isValidating, mutate]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

export function useGetParentCategory(categoryId) {
  const URL = categoryId ? `${endpoints.parentCategory.details}/${categoryId}` : '';

  const { data, isLoading, error, isValidating } = useSWR(URL, fetcher);

  const memoizedValue = useMemo(
    () => ({
      parentCategory: data,
      parentCategoryLoading: isLoading,
      parentCategoryError: error,
      parentCategoryValidating: isValidating,
    }),
    [data, error, isLoading, isValidating]
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
