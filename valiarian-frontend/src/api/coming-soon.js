import axios from 'axios';
import { useMemo } from 'react';
import useSWR from 'swr';

const API_URL = process.env.REACT_APP_HOST_API || 'http://localhost:3035';

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

const fetcher = (url) => axiosInstance.get(url).then((res) => res.data);

export function useGetComingSoonPage() {
  const { data, error, isLoading, isValidating } = useSWR('/api/coming-soon', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  return useMemo(
    () => ({
      comingSoonPage: data,
      comingSoonPageLoading: isLoading,
      comingSoonPageError: error,
      comingSoonPageValidating: isValidating,
    }),
    [data, error, isLoading, isValidating]
  );
}
