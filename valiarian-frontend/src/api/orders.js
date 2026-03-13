import { useMemo } from 'react';
import useSWR from 'swr';
// utils
import { endpoints, fetcher } from 'src/utils/axios';

// ----------------------------------------------------------------------

/**
 * Hook to fetch user orders
 * @param {string} userId - User ID
 * @param {Object} params - Query parameters (page, limit, status)
 * @returns {Object} - { orders, pagination, isLoading, error, mutate }
 */
export function useGetUserOrders(userId, params = {}) {
  const URL = userId ? [endpoints.orders.user(userId), { params }] : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR(URL, fetcher);

  const memoizedValue = useMemo(
    () => ({
      orders: data?.orders || [],
      pagination: data?.pagination || null,
      isLoading,
      error,
      isValidating,
      mutate,
    }),
    [data?.orders, data?.pagination, error, isLoading, isValidating, mutate]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

/**
 * Hook to fetch a single order by ID
 * @param {string} orderId - Order ID
 * @returns {Object} - { order, statusHistory, isLoading, error, mutate }
 */
export function useGetOrder(orderId) {
  const URL = orderId ? endpoints.orders.details(orderId) : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR(URL, fetcher);

  const memoizedValue = useMemo(
    () => ({
      order: data?.order || null,
      statusHistory: data?.statusHistory || [],
      isLoading,
      error,
      isValidating,
      mutate,
    }),
    [data?.order, data?.statusHistory, error, isLoading, isValidating, mutate]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

/**
 * Hook to fetch order tracking information
 * @param {string} orderId - Order ID
 * @returns {Object} - { tracking, isLoading, error, mutate }
 */
export function useGetOrderTracking(orderId) {
  const URL = orderId ? endpoints.orders.tracking(orderId) : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR(URL, fetcher);

  const memoizedValue = useMemo(
    () => ({
      tracking: data?.tracking || null,
      isLoading,
      error,
      isValidating,
      mutate,
    }),
    [data?.tracking, error, isLoading, isValidating, mutate]
  );

  return memoizedValue;
}
