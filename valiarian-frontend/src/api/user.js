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

  const memoizedValue = useMemo(
    () => ({
      profile: data?.user || null,
      isLoading,
      error,
      isValidating,
      mutate,
    }),
    [data?.user, error, isLoading, isValidating, mutate]
  );

  return memoizedValue;
}
