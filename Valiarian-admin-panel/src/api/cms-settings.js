import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';
// utils
import axios, { endpoints, fetcher } from 'src/utils/axios';

// ----------------------------------------------------------------------

const URL = endpoints.cms.settings;

const options = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

// ----------------------------------------------------------------------

export function useGetSettings() {
  const { data, isLoading, error, isValidating } = useSWR(URL, fetcher, options);

  const memoizedValue = useMemo(
    () => ({
      settings: data,
      settingsLoading: isLoading,
      settingsError: error,
      settingsValidating: isValidating,
    }),
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

export async function updateSettings(settingsData) {
  const res = await axios.patch(URL, settingsData);

  mutate(URL);

  return res.data;
}
