import { useMemo } from 'react';
import useSWR from 'swr';
// utils
import { endpoints, fetcher } from 'src/utils/axios';

// ----------------------------------------------------------------------

/**
 * Hook to fetch current user profile
 * @returns {Object} - { profile, isLoading, error, mutate }
 */
export function useGetProfile() {
  const URL = endpoints.user.profile;

  const { data, error, isLoading, isValidating, mutate } = useSWR(URL, fetcher);

  const profile = data?.user || data || null;

  const memoizedValue = useMemo(
    () => ({
      profile,
      isLoading,
      error,
      isValidating,
      mutate,
    }),
    [profile, error, isLoading, isValidating, mutate]
  );

  return memoizedValue;
}
