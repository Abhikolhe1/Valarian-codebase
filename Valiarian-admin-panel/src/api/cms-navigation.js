import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';
// utils
import axios, { endpoints, fetcher } from 'src/utils/axios';

// ----------------------------------------------------------------------

const options = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

// ----------------------------------------------------------------------

export function useGetNavigation(location) {
  const URL = location ? endpoints.cms.navigation.byLocation(location) : null;

  const { data, isLoading, error, isValidating } = useSWR(URL, fetcher, options);

  const memoizedValue = useMemo(
    () => ({
      navigation: data,
      navigationLoading: isLoading,
      navigationError: error,
      navigationValidating: isValidating,
    }),
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

export async function createNavigation(navigationData) {
  const res = await axios.post(endpoints.cms.navigation.list, navigationData);

  mutate(endpoints.cms.navigation.list);
  if (navigationData.location) {
    mutate(endpoints.cms.navigation.byLocation(navigationData.location));
  }

  return res.data;
}

// ----------------------------------------------------------------------

export async function updateNavigation(navigationId, navigationData) {
  const res = await axios.patch(endpoints.cms.navigation.details(navigationId), navigationData);

  mutate(endpoints.cms.navigation.list);
  if (navigationData.location) {
    mutate(endpoints.cms.navigation.byLocation(navigationData.location));
  }

  return res.data;
}
